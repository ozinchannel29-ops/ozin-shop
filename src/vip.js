// Klien API VIPayment (vip-reseller.co.id) + versi simulasi saat API key belum diisi.
import { createHash } from "node:crypto";

const BASE = "https://vip-reseller.co.id/api";
const md5 = (s) => createHash("md5").update(s).digest("hex");

export const vipIsMock = (env) => !(env.VIP_API_ID && env.VIP_API_KEY);
export const vipSign = (env) => md5(env.VIP_API_ID + env.VIP_API_KEY);

/** Status VIPayment → status pesanan Jean Shop */
export function mapVipStatus(s) {
  s = String(s || "").toLowerCase();
  if (s === "success") return "SUCCESS";
  if (s === "error") return "FAILED";
  return "PROCESSING"; // waiting | processing
}

async function call(env, endpoint, params) {
  const body = new URLSearchParams({ key: env.VIP_API_KEY, sign: vipSign(env), ...params });
  const res = await fetch(`${BASE}/${endpoint}`, { method: "POST", body });
  let json;
  try { json = await res.json(); } catch { throw new Error(`VIPayment tidak merespons dengan benar (HTTP ${res.status})`); }
  if (!json.result) throw new Error(json.message || "Permintaan ke VIPayment gagal");
  return json.data;
}

// Daftar layanan disimpan sebentar di memori supaya tidak memanggil VIPayment di setiap kunjungan.
const cache = new Map();
const TTL = 5 * 60 * 1000;

/** Layanan untuk satu produk: [{ code, name, cost, available }] */
export async function vipServices(env, product) {
  const hit = cache.get(product.slug);
  if (hit && Date.now() - hit.at < TTL) return hit.list;

  let list;
  if (vipIsMock(env)) {
    // Simulasi: modal = ±93% dari harga contoh di data.js
    list = product.items.map((it, i) => ({
      code: `MOCK-${product.slug}-${i}`, name: it.name, cost: Math.round((it.price * 0.93) / 100) * 100, available: true,
    }));
  } else {
    const level = env.VIP_LEVEL || "basic";
    const raw = product.kind === "game"
      ? await call(env, "game-feature", { type: "services", filter_game: product.vip.filter })
      : await call(env, "prepaid", { type: "services", filter_type: "brand", filter_value: product.vip.brand });
    list = (raw || [])
      .filter((s) => product.kind === "game" || product.vip.type.test(`${s.type} ${s.category} ${s.name}`))
      .map((s) => ({
        code: String(s.code),
        name: String(s.name),
        cost: Number(s.price?.[level] ?? s.price?.basic ?? s.price) || 0,
        available: String(s.status).toLowerCase() === "available",
      }))
      .filter((s) => s.cost > 0)
      .sort((a, b) => a.cost - b.cost);
  }
  cache.set(product.slug, { at: Date.now(), list });
  return list;
}

/** Kirim pesanan ke VIPayment → { trxid, status, note } */
export async function vipOrder(env, order) {
  if (vipIsMock(env)) return { trxid: "MOCK" + Date.now().toString(36).toUpperCase(), status: "processing", note: "Simulasi: sedang diproses" };
  const d = order.kind === "game"
    ? await call(env, "game-feature", { type: "order", service: order.service, data_no: order.target, ...(order.zone ? { data_zone: order.zone } : {}) })
    : await call(env, "prepaid", { type: "order", service: order.service, data_no: order.target });
  return { trxid: String(d.trxid), status: d.status, note: d.note || "" };
}

/** Cek status pesanan di VIPayment → { status, note } */
export async function vipStatus(env, order) {
  if (vipIsMock(env)) {
    // Simulasi: selesai ±8 detik setelah dikirim ke supplier (waktu kirim tersimpan di trxid MOCK<base36>)
    return Date.now() - parseInt(order.vip_trxid.slice(4), 36) > 8000
      ? { status: "success", note: `Simulasi: SN ${order.vip_trxid}` }
      : { status: "processing", note: order.note };
  }
  const d = await call(env, order.kind === "game" ? "game-feature" : "prepaid", { type: "status", trxid: order.vip_trxid });
  const row = Array.isArray(d) ? d[0] : d;
  return { status: row?.status, note: row?.note || "" };
}

/** Cek nickname akun game → string */
export async function vipNickname(env, product, target, zone) {
  if (vipIsMock(env)) return `JeanPlayer${String(target).slice(-3)}`;
  const d = await call(env, "game-feature", { type: "get-nickname", code: product.vip.nick, target, ...(zone ? { additional_target: zone } : {}) });
  return typeof d === "string" ? d : d?.nickname || d?.name || "";
}
