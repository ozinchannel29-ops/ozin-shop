// Supplier Digiflazz (api.digiflazz.com/v1). Aktif bila SUPPLIER=digiflazz (bawaan).
// ⚠ Digiflazz hanya menerima panggilan dari IP yang di-whitelist → jalankan server di VPS ber-IP tetap.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
import { mockServices, mockOrder, mockStatus, mockNickname } from "./mock.js";
import { getProduct } from "./catalog.js";

const md5 = (s) => createHash("md5").update(s).digest("hex");
const base = (env) => env.DIGIFLAZZ_BASE || "https://api.digiflazz.com/v1";
const isMock = (env) => !(env.DIGIFLAZZ_USERNAME && env.DIGIFLAZZ_API_KEY);

/** Status Digiflazz → status pesanan Jean Shop */
function mapStatus(s) {
  s = String(s || "").toLowerCase();
  if (s === "sukses") return "SUCCESS";
  if (s === "gagal") return "FAILED";
  return "PROCESSING"; // pending
}

async function call(env, path, body) {
  const res = await fetch(`${base(env)}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  let json;
  try { json = await res.json(); } catch { throw new Error(`Digiflazz tidak merespons dengan benar (HTTP ${res.status})`); }
  return json.data;
}

// Daftar harga: Digiflazz membatasi ambil semua produk maks. 1× per 5 menit → simpan 10 menit, saring di sini.
// Salinan terakhir juga disimpan di database (tabel cache) supaya tetap ada setelah server dinyalakan ulang.
const PRICE_TTL = 10 * 60 * 1000;
const PRICE_KEY = "digiflazz:pricelist";
let priceCache = null; // { at, list }
let pricePending = null;

async function loadSavedPrices(env) {
  try {
    const row = await env.DB.prepare("SELECT value, updated_at FROM cache WHERE key = ?").bind(PRICE_KEY).first();
    return row ? { at: row.updated_at, list: JSON.parse(row.value) } : null;
  } catch { return null; } // tabel belum ada (migrasi belum jalan)
}

async function savePrices(env, cache) {
  try {
    await env.DB.prepare("INSERT INTO cache (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
      .bind(PRICE_KEY, JSON.stringify(cache.list), cache.at).run();
  } catch { /* cukup di memori */ }
}

async function priceList(env) {
  priceCache ||= await loadSavedPrices(env);
  if (priceCache && Date.now() - priceCache.at < PRICE_TTL) return priceCache.list;
  pricePending ||= call(env, "price-list", { cmd: "prepaid", username: env.DIGIFLAZZ_USERNAME, sign: md5(env.DIGIFLAZZ_USERNAME + env.DIGIFLAZZ_API_KEY + "pricelist") })
    .then(async (data) => {
      if (!Array.isArray(data)) throw new Error(data?.message || "Gagal mengambil daftar harga Digiflazz");
      priceCache = { at: Date.now(), list: data };
      await savePrices(env, priceCache);
      return data;
    })
    .finally(() => { pricePending = null; });
  try {
    return await pricePending;
  } catch (e) {
    if (priceCache) return priceCache.list; // pakai daftar terakhir kalau Digiflazz sedang menolak (mis. batas 5 menit)
    throw new Error(/limitasi|limit/i.test(e.message) ? "Daftar harga sedang dimuat ulang, coba lagi dalam beberapa menit" : e.message);
  }
}

const same = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

/** Nomor tujuan: game ber-Zone (mis. Mobile Legends) = User ID + Zone ID digabung tanpa spasi */
function customerNo(order) {
  const p = getProduct(order.slug);
  return p?.fields === "idzone" && order.zone ? `${order.target}${order.zone}` : order.target;
}

function txBody(env, order, ref) {
  return {
    username: env.DIGIFLAZZ_USERNAME,
    buyer_sku_code: order.service,
    customer_no: customerNo(order),
    ref_id: ref,
    sign: md5(env.DIGIFLAZZ_USERNAME + env.DIGIFLAZZ_API_KEY + ref),
    max_price: order.cost, // tolak kalau modal naik dari harga saat pembeli memesan
    ...(env.DIGIFLAZZ_MODE === "development" ? { testing: true } : {}),
  };
}

const noteOf = (d) => (d?.sn ? `SN: ${d.sn}` : d?.message || "");

export const digiflazz = {
  name: "Digiflazz",
  isMock,
  pollMs: 65000, // Digiflazz: jangan cek status transaksi yang sama < 1 menit

  async services(env, product) {
    if (isMock(env)) return mockServices(product);
    const map = product.map.df;
    return (await priceList(env))
      .filter((s) => same(s.brand, map.brand) && (!map.category || same(s.category, map.category)) && (!map.type || map.type.test(String(s.type))))
      .map((s) => ({
        code: String(s.buyer_sku_code),
        name: String(s.product_name),
        cost: Number(s.price) || 0,
        available: Boolean(s.buyer_product_status && s.seller_product_status && (s.unlimited_stock || Number(s.stock) > 0)),
      }))
      .filter((s) => s.cost > 0)
      .sort((a, b) => a.cost - b.cost);
  },

  async order(env, order) {
    if (isMock(env)) return mockOrder();
    // ref_id = invoice; saat "Kirim ulang" pakai ref_id baru (ref_id lama = transaksi lama yang sudah gagal)
    const ref = order.vip_trxid ? `${order.inv}R${Date.now().toString(36).toUpperCase()}` : order.inv;
    let d;
    try {
      d = await call(env, "transaction", txBody(env, order, ref));
    } catch {
      // Jaringan putus: transaksi mungkin sudah tercatat → anggap diproses, status dicek ulang dengan ref_id yang sama
      return { trxid: ref, status: "PROCESSING", note: "Menunggu konfirmasi supplier" };
    }
    if (!d?.status) throw new Error(d?.message || "Respons Digiflazz tidak dikenal");
    return { trxid: ref, status: mapStatus(d.status), note: noteOf(d) };
  },

  /** Cek status = kirim ulang transaksi dengan ref_id yang sama (sesuai dokumentasi Digiflazz) */
  async status(env, order) {
    if (isMock(env)) return mockStatus(order);
    const d = await call(env, "transaction", txBody(env, order, order.vip_trxid));
    return { status: mapStatus(d?.status), note: noteOf(d) };
  },

  canNickname: (env, product) => isMock(env) && product.kind === "game", // Digiflazz tidak punya API cek nickname
  nickname: async (env, product, target) => mockNickname(target),

  /** Webhook Digiflazz (X-Hub-Signature = sha1 HMAC body dengan secret) → { trxid, status, note } atau null */
  async callback(env, request) {
    if (isMock(env) || !env.DIGIFLAZZ_WEBHOOK_SECRET) return null;
    const raw = await request.text();
    const expected = Buffer.from("sha1=" + createHmac("sha1", env.DIGIFLAZZ_WEBHOOK_SECRET).update(raw).digest("hex"));
    const got = Buffer.from(String(request.headers.get("X-Hub-Signature") || ""));
    if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
    const d = JSON.parse(raw).data || {};
    return { trxid: String(d.ref_id || ""), status: mapStatus(d.status), note: noteOf(d) };
  },
};
