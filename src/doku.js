// Payment gateway DOKU Checkout (non-SNAP). Aktif bila PAYMENT=doku (bawaan).
// Tanda tangan: HMACSHA256=base64(HMAC-SHA256(SecretKey, "Client-Id:..\nRequest-Id:..\nRequest-Timestamp:..\nRequest-Target:..[\nDigest:..]"))
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";

const base = (env) => env.DOKU_BASE || (env.DOKU_MODE === "production" ? "https://api.doku.com" : "https://api-sandbox.doku.com");
const isMock = (env) => !(env.DOKU_CLIENT_ID && env.DOKU_SECRET_KEY);

// Metode yang ditampilkan di Jean Shop (kode = payment_method_types DOKU).
// Biaya = perkiraan biaya yang ditambahkan ke total pembeli — SESUAIKAN dengan tarif di kontrak DOKU client.
const CHANNELS = [
  { code: "QRIS", name: "QRIS", group: "Semua e-wallet & m-banking", fee_flat: 0, fee_percent: 0.7 },
  { code: "EMONEY_DANA", name: "DANA", group: "E-Wallet", fee_flat: 0, fee_percent: 1.5 },
  { code: "EMONEY_OVO", name: "OVO", group: "E-Wallet", fee_flat: 0, fee_percent: 1.5 },
  { code: "EMONEY_SHOPEE_PAY", name: "ShopeePay", group: "E-Wallet", fee_flat: 0, fee_percent: 1.5 },
  { code: "VIRTUAL_ACCOUNT_BRI", name: "BRI Virtual Account", group: "Virtual Account", fee_flat: 4000, fee_percent: 0 },
  { code: "VIRTUAL_ACCOUNT_BNI", name: "BNI Virtual Account", group: "Virtual Account", fee_flat: 4000, fee_percent: 0 },
  { code: "VIRTUAL_ACCOUNT_BANK_MANDIRI", name: "Mandiri Virtual Account", group: "Virtual Account", fee_flat: 4000, fee_percent: 0 },
  { code: "VIRTUAL_ACCOUNT_BCA", name: "BCA Virtual Account", group: "Virtual Account", fee_flat: 4500, fee_percent: 0 },
];

const timestamp = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const digest = (body) => createHash("sha256").update(body).digest("base64");

function signature(env, { requestId, ts, target, body }) {
  const parts = [`Client-Id:${env.DOKU_CLIENT_ID}`, `Request-Id:${requestId}`, `Request-Timestamp:${ts}`, `Request-Target:${target}`];
  if (body !== undefined) parts.push(`Digest:${digest(body)}`);
  return "HMACSHA256=" + createHmac("sha256", env.DOKU_SECRET_KEY).update(parts.join("\n")).digest("base64");
}

async function call(env, method, target, payload) {
  const requestId = randomUUID();
  const ts = timestamp();
  const body = payload === undefined ? undefined : JSON.stringify(payload);
  const res = await fetch(base(env) + target, {
    method,
    headers: {
      "Client-Id": env.DOKU_CLIENT_ID, "Request-Id": requestId, "Request-Timestamp": ts,
      Signature: signature(env, { requestId, ts, target, body }),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = [].concat(json.error_messages || json.error?.message || json.message || `DOKU HTTP ${res.status}`).join(", ");
    if (/CHANNEL IS INACTIVE/i.test(msg)) throw new Error("metode pembayaran ini sedang tidak aktif, silakan pilih metode lain");
    throw new Error(msg);
  }
  return json;
}

/** "yyyyMMddHHmmss" (WIB) → detik epoch */
function parseExpired(s) {
  const m = String(s || "").match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  return m ? Math.floor(Date.UTC(m[1], m[2] - 1, m[3], m[4] - 7, m[5], m[6]) / 1000) : Math.floor(Date.now() / 1000) + 3600;
}

/** Status transaksi DOKU → status pembayaran Jean Shop (FAILED diabaikan sesuai anjuran DOKU untuk Checkout) */
const mapStatus = (s) => (s === "SUCCESS" ? "PAID" : s === "EXPIRED" ? "EXPIRED" : null);

export const doku = {
  name: "DOKU",
  isMock,

  /** DOKU_METHODS (opsional) = kode metode yang sudah aktif di dashboard DOKU, dipisah koma; kosong = semua */
  async channels(env) {
    const allow = String(env.DOKU_METHODS || "").split(",").map((s) => s.trim()).filter(Boolean);
    return allow.length ? CHANNELS.filter((c) => allow.includes(c.code)) : CHANNELS;
  },

  /** Biaya ditambahkan ke tagihan di sini (DOKU memotong biaya dari merchant) */
  async create(env, { order, channel, origin }) {
    const amount = order.price + Math.ceil(channel.fee_flat + (order.price * channel.fee_percent) / 100);
    const json = await call(env, "POST", "/checkout/v1/payment", {
      order: {
        amount,
        invoice_number: order.inv,
        currency: "IDR",
        auto_redirect: true,
        callback_url: `${origin}/#/cek-transaksi?inv=${order.inv}`,
        language: "ID",
      },
      payment: { payment_due_date: 60, payment_method_types: [channel.code] },
      customer: { name: "Pelanggan Jean Shop", email: env.CUSTOMER_EMAIL, phone: order.wa },
      // DOKU hanya menerima URL notifikasi publik (https) yang path-nya sama dengan yang didaftarkan di dashboard.
      // Di localhost tidak dikirim: status lunas diambil lewat cek status (lihat status() di bawah).
      ...(origin.startsWith("https://") ? { additional_info: { override_notification_url: `${origin}/api/callback/doku` } } : {}),
    });
    const p = json.response?.payment;
    if (!p?.url) throw new Error("DOKU tidak mengembalikan halaman pembayaran");
    return { reference: p.token_id || order.inv, checkout_url: p.url, amount, expired_time: parseExpired(p.expired_date) };
  },

  /** HTTP Notification DOKU → { inv, status, amount } atau null kalau tanda tangan tidak sah */
  async callback(env, request) {
    if (isMock(env)) return null;
    const raw = await request.text();
    const h = (k) => request.headers.get(k) || "";
    if (h("Client-Id") !== env.DOKU_CLIENT_ID) return null;
    const expected = Buffer.from(signature(env, { requestId: h("Request-Id"), ts: h("Request-Timestamp"), target: new URL(request.url).pathname, body: raw }));
    const got = Buffer.from(h("Signature"));
    if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
    const d = JSON.parse(raw);
    return { inv: String(d.order?.invoice_number || ""), status: mapStatus(d.transaction?.status), amount: Number(d.order?.amount) };
  },

  /** Cek status ke DOKU (cadangan bila notifikasi terlambat) → { status, amount } */
  pollMs: 60000, // DOKU: cek status paling cepat 60 detik setelah pembayaran
  async status(env, order) {
    const json = await call(env, "GET", `/orders/v1/status/${encodeURIComponent(order.inv)}`);
    return { status: mapStatus(json.transaction?.status), amount: Number(json.order?.amount) };
  },
};
