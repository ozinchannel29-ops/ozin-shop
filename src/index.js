// Jean Shop API (Cloudflare Worker). File situs di docs/ disajikan otomatis oleh Workers Assets;
// Worker ini hanya menangani /api/*.
import { getProduct, FIELDS } from "./catalog.js";
import { vipIsMock, vipSign, vipServices, vipOrder, vipStatus, vipNickname, mapVipStatus } from "./vip.js";
import { payIsMock, payChannels, payCreate, payVerify, feeOf } from "./tripay.js";

const STATUS_LABEL = {
  UNPAID: "Menunggu Pembayaran",
  PAID: "Pembayaran Diterima",
  PROCESSING: "Sedang Diproses",
  SUCCESS: "Berhasil",
  FAILED: "Gagal",
  EXPIRED: "Kedaluwarsa",
};

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers } });

const now = () => Date.now();

/** Harga jual = modal + untung, dibulatkan ke atas */
function sellPrice(env, cost) {
  const pct = Number(env.MARGIN_PERCENT) || 0;
  const min = Number(env.MARGIN_MIN) || 0;
  const step = Number(env.ROUND_TO) || 1;
  return Math.ceil((cost + Math.max((cost * pct) / 100, min)) / step) * step;
}

/** No. invoice: JNS + tanggal WIB + 8 karakter acak, mis. JNS261030K7QX2M9A */
function newInvoice() {
  const ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 karakter, tanpa O/0/I/1
  const d = new Date(now() + 7 * 3600 * 1000);
  const ymd = [d.getUTCFullYear() % 100, d.getUTCMonth() + 1, d.getUTCDate()].map((n) => String(n).padStart(2, "0")).join("");
  const rnd = [...crypto.getRandomValues(new Uint8Array(8))].map((b) => ALPH[b % 32]).join("");
  return `JNS${ymd}${rnd}`;
}

/* ---------------- database ---------------- */
const getOrder = (env, inv) => env.DB.prepare("SELECT * FROM orders WHERE inv = ?").bind(inv).first();

const UPDATABLE = ["status", "amount", "pay_ref", "pay_url", "pay_expired", "vip_trxid", "note", "checked_at"];
async function updateOrder(env, inv, fields, onlyIfStatus) {
  const keys = Object.keys(fields).filter((k) => UPDATABLE.includes(k));
  let sql = `UPDATE orders SET ${keys.map((k) => `${k} = ?`).join(", ")}, updated_at = ? WHERE inv = ?`;
  const args = [...keys.map((k) => fields[k]), now(), inv];
  if (onlyIfStatus) { sql += " AND status = ?"; args.push(onlyIfStatus); }
  const r = await env.DB.prepare(sql).bind(...args).run();
  return r.meta.changes === 1; // false = status sudah berubah (mis. callback dobel)
}

function publicOrder(o) {
  return {
    inv: o.inv, product: o.product, item: o.item, target: o.target, zone: o.zone,
    method: o.method_name, price: o.price, amount: o.amount,
    status: o.status, status_label: STATUS_LABEL[o.status] || o.status, note: o.note,
    pay_url: o.status === "UNPAID" ? o.pay_url : "", pay_expired: o.pay_expired,
    wa: o.wa.replace(/^(\d{4})\d+(\d{3})$/, "$1****$2"),
    created_at: o.created_at,
  };
}

/* ---------------- validasi input ---------------- */
function readFields(product, input) {
  const defs = FIELDS[product.fields] || [];
  const values = {};
  for (const f of defs) {
    let v = String(input?.[f.key] ?? "").trim();
    if (!v) throw new HttpError(400, `${f.label} belum diisi`);
    if (f.type === "number" && !/^\d{1,20}$/.test(v)) throw new HttpError(400, `${f.label} hanya boleh angka`);
    if (f.type === "tel") { v = v.replace(/\D/g, ""); if (!/^\d{9,15}$/.test(v)) throw new HttpError(400, `${f.label} belum valid`); }
    if (f.type === "email" && !/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(v)) throw new HttpError(400, `${f.label} belum valid`);
    if (f.type === "text" && !/^[\p{L}\p{N} #._@-]{2,40}$/u.test(v)) throw new HttpError(400, `${f.label} berisi karakter yang tidak diizinkan`);
    if (f.type === "select" && !f.options.includes(v)) throw new HttpError(400, `Pilih ${f.label}`);
    values[f.key] = v;
  }
  // Kolom pertama = tujuan utama (ID / nomor), kolom kedua (zone/server/world) = data tambahan
  return { target: values[defs[0]?.key] || "", zone: defs[1] ? values[defs[1].key] : "" };
}

/* ---------------- proses ke supplier ---------------- */
async function fulfil(env, inv) {
  const order = await getOrder(env, inv);
  try {
    const r = await vipOrder(env, order);
    await updateOrder(env, inv, { status: mapVipStatus(r.status), vip_trxid: r.trxid, note: r.note || "", checked_at: now() });
  } catch (e) {
    await updateOrder(env, inv, { status: "FAILED", note: `Gagal diproses: ${e.message}. Dana akan dikembalikan, silakan hubungi admin.` });
  }
}

/** Pembayaran lunas → kunci status (sekali saja) lalu kirim ke VIPayment */
async function markPaid(env, inv) {
  if (await updateOrder(env, inv, { status: "PAID" }, "UNPAID")) await fulfil(env, inv);
}

/* ---------------- handler ---------------- */
async function handleConfig(env) {
  const channels = await payChannels(env);
  return json({
    auto: true,
    simulation: { supplier: vipIsMock(env), payment: payIsMock(env) },
    payments: channels.map(({ code, name, group, icon, fee_flat, fee_percent, min, max }) => ({ code, name, group, icon, fee_flat, fee_percent, min, max })),
  });
}

async function handleProducts(env, slug) {
  const product = getProduct(slug);
  if (!product) throw new HttpError(404, "Produk tidak ditemukan");
  const list = await vipServices(env, product);
  return json({ items: list.map((s) => ({ code: s.code, name: s.name, price: sellPrice(env, s.cost), available: s.available })) });
}

async function handleNickname(env, url) {
  const product = getProduct(url.searchParams.get("slug"));
  if (!product || product.kind !== "game" || (!product.vip.nick && !vipIsMock(env))) throw new HttpError(400, "Cek nickname tidak tersedia untuk produk ini");
  const { target, zone } = readFields(product, Object.fromEntries(url.searchParams));
  const nickname = await vipNickname(env, product, target, zone);
  if (!nickname) throw new HttpError(404, "Akun tidak ditemukan, periksa kembali ID kamu");
  return json({ nickname });
}

async function handleCreateOrder(env, request, origin) {
  const body = await request.json().catch(() => null);
  const product = getProduct(body?.slug);
  if (!product) throw new HttpError(400, "Produk tidak ditemukan");
  const { target, zone } = readFields(product, body.fields);
  const wa = String(body.wa || "").replace(/\D/g, "");
  if (!/^\d{10,15}$/.test(wa)) throw new HttpError(400, "Nomor WhatsApp belum valid");

  const svc = (await vipServices(env, product)).find((s) => s.code === body.code);
  if (!svc) throw new HttpError(400, "Pilih nominal terlebih dahulu");
  if (!svc.available) throw new HttpError(400, "Nominal ini sedang kosong, pilih yang lain");
  const channel = (await payChannels(env)).find((c) => c.code === body.method);
  if (!channel) throw new HttpError(400, "Pilih metode pembayaran");

  const price = sellPrice(env, svc.cost);
  if ((channel.min && price < channel.min) || (channel.max && price > channel.max)) throw new HttpError(400, `${channel.name} tidak bisa dipakai untuk nominal ini`);

  const order = {
    inv: newInvoice(), slug: product.slug, product: product.name, item: svc.name, service: svc.code, kind: product.kind,
    target, zone, wa, method: channel.code, method_name: channel.name, price, cost: svc.cost,
  };
  const t = now();
  await env.DB.prepare(
    `INSERT INTO orders (inv, slug, product, item, service, kind, target, zone, wa, method, method_name, price, cost, amount, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'UNPAID', ?, ?)`
  ).bind(order.inv, order.slug, order.product, order.item, order.service, order.kind, order.target, order.zone, order.wa,
    order.method, order.method_name, order.price, order.cost, order.price + feeOf(channel, price), t, t).run();

  let pay;
  try {
    pay = await payCreate(env, { order, channel, origin });
  } catch (e) {
    await updateOrder(env, order.inv, { status: "FAILED", note: `Tagihan gagal dibuat: ${e.message}` });
    throw new HttpError(502, `Pembayaran gagal dibuat: ${e.message}`);
  }
  await updateOrder(env, order.inv, { amount: pay.amount, pay_ref: pay.reference, pay_url: pay.checkout_url, pay_expired: pay.expired_time });
  return json({ inv: order.inv, pay_url: pay.checkout_url });
}

async function handleStatus(env, inv) {
  let order = await getOrder(env, inv);
  if (!order) throw new HttpError(404, "Invoice tidak ditemukan");
  // Masih diproses supplier → cek ulang paling sering tiap 15 detik (simulasi: setiap kali)
  if (order.status === "PROCESSING" && order.vip_trxid && (vipIsMock(env) || now() - order.checked_at > 15000)) {
    try {
      const r = await vipStatus(env, order);
      const st = mapVipStatus(r.status);
      if (st !== order.status) await updateOrder(env, inv, { status: st, note: r.note || order.note, checked_at: now() }, "PROCESSING");
      else await updateOrder(env, inv, { checked_at: now() });
      order = await getOrder(env, inv);
    } catch { /* coba lagi di permintaan berikutnya */ }
  }
  return json(publicOrder(order));
}

async function handleTripayCallback(env, request) {
  if (payIsMock(env)) throw new HttpError(404, "Not found");
  const raw = await request.text();
  if (!payVerify(env, raw, request.headers.get("X-Callback-Signature"))) return json({ success: false, message: "Invalid signature" }, 403);
  if (request.headers.get("X-Callback-Event") !== "payment_status") return json({ success: false, message: "Unknown event" }, 400);
  const cb = JSON.parse(raw);
  const order = await getOrder(env, String(cb.merchant_ref || ""));
  if (!order) return json({ success: false, message: "Order not found" }, 404);

  if (cb.status === "PAID") {
    if (Number(cb.total_amount) < order.amount) {
      await updateOrder(env, order.inv, { note: `Nominal bayar tidak sesuai (${cb.total_amount}), perlu dicek admin` });
    } else {
      await markPaid(env, order.inv);
    }
  } else if (cb.status === "EXPIRED" || cb.status === "FAILED") {
    await updateOrder(env, order.inv, { status: "EXPIRED" }, "UNPAID");
  }
  return json({ success: true });
}

async function handleVipCallback(env, request) {
  if (vipIsMock(env)) throw new HttpError(404, "Not found");
  const ip = request.headers.get("CF-Connecting-IP");
  if (env.VIP_CALLBACK_IP && ip && ip !== env.VIP_CALLBACK_IP) return json({ result: false }, 403);
  if (request.headers.get("X-Client-Signature") !== vipSign(env)) return json({ result: false }, 403);
  const body = await request.json().catch(() => ({}));
  const d = body.data || body;
  const order = await env.DB.prepare("SELECT * FROM orders WHERE vip_trxid = ?").bind(String(d.trxid || "")).first();
  if (order && order.status === "PROCESSING") {
    await updateOrder(env, order.inv, { status: mapVipStatus(d.status), note: d.note || order.note, checked_at: now() }, "PROCESSING");
  }
  return json({ result: true });
}

/* ---------------- simulasi pembayaran (hanya tanpa kunci Tripay) ---------------- */
const rupiah = (n) => "Rp " + Math.round(n).toLocaleString("id-ID");
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

async function handleMockPayPage(env, url) {
  const o = await getOrder(env, url.searchParams.get("inv") || "");
  if (!o) throw new HttpError(404, "Invoice tidak ditemukan");
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Simulasi Pembayaran</title><style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#070b14;color:#f1f5fb;font:15px system-ui,sans-serif;padding:16px}
.box{width:100%;max-width:400px;background:#0f1422;border:1px solid #222c42;border-radius:16px;padding:24px}
.tag{display:inline-block;padding:4px 10px;border-radius:99px;background:#f59e0b22;color:#fbbf24;font-size:12px;font-weight:700}
h1{font-size:20px;margin:14px 0 4px}p{color:#9aa6bb;margin:0 0 16px}
dl{display:grid;grid-template-columns:auto 1fr;gap:8px 12px;margin:0 0 20px}dt{color:#9aa6bb}dd{margin:0;text-align:right;font-weight:700}
.tot{font-size:22px;color:#4f9bff}button{width:100%;padding:13px;border:0;border-radius:10px;font:inherit;font-weight:800;cursor:pointer;margin-top:8px}
.pay{background:linear-gradient(135deg,#4aa3ff,#0f3f9e);color:#fff}.cancel{background:#161d2e;color:#9aa6bb}
</style></head><body><form class="box" method="post">
<span class="tag">MODE SIMULASI – tidak ada uang sungguhan</span>
<h1>Pembayaran ${escapeHtml(o.method_name)}</h1><p>Halaman ini menggantikan halaman bayar Tripay selama kunci Tripay belum diisi.</p>
<dl><dt>Invoice</dt><dd>${escapeHtml(o.inv)}</dd><dt>Produk</dt><dd>${escapeHtml(o.product)}</dd><dt>Item</dt><dd>${escapeHtml(o.item)}</dd>
<dt>Status</dt><dd>${escapeHtml(STATUS_LABEL[o.status] || o.status)}</dd><dt>Total</dt><dd class="tot">${rupiah(o.amount)}</dd></dl>
<input type="hidden" name="inv" value="${escapeHtml(o.inv)}">
${o.status === "UNPAID" ? `<button class="pay" name="action" value="pay">Bayar (simulasi berhasil)</button><button class="cancel" name="action" value="cancel">Biarkan kedaluwarsa</button>` : `<button class="cancel" name="action" value="back">Lihat status pesanan</button>`}
</form></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

async function handleMockPay(env, request, origin) {
  const form = await request.formData();
  const inv = String(form.get("inv") || "");
  if (!(await getOrder(env, inv))) throw new HttpError(404, "Invoice tidak ditemukan");
  if (form.get("action") === "pay") await markPaid(env, inv);
  if (form.get("action") === "cancel") await updateOrder(env, inv, { status: "EXPIRED" }, "UNPAID");
  return Response.redirect(`${origin}/#/cek-transaksi?inv=${inv}`, 303);
}

/* ---------------- router ---------------- */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    if (!pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    const origin = url.origin;
    const m = request.method;
    try {
      let r;
      if (m === "GET" && pathname === "/api/config") r = await handleConfig(env);
      else if (m === "GET" && pathname.startsWith("/api/products/")) r = await handleProducts(env, decodeURIComponent(pathname.slice(14)));
      else if (m === "GET" && pathname === "/api/nickname") r = await handleNickname(env, url);
      else if (m === "POST" && pathname === "/api/order") r = await handleCreateOrder(env, request, origin);
      else if (m === "GET" && pathname.startsWith("/api/status/")) r = await handleStatus(env, decodeURIComponent(pathname.slice(12)).toUpperCase());
      else if (m === "POST" && pathname === "/api/callback/tripay") r = await handleTripayCallback(env, request);
      else if (m === "POST" && pathname === "/api/callback/vip") r = await handleVipCallback(env, request);
      else if (pathname === "/api/mock/pay" && payIsMock(env)) r = m === "POST" ? await handleMockPay(env, request, origin) : await handleMockPayPage(env, url);
      else throw new HttpError(404, "Not found");
      return r;
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error(e);
      return json({ error: "Terjadi kesalahan di server, coba lagi sebentar lagi" }, 500);
    }
  },
};
