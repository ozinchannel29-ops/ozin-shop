// Payment gateway Tripay (cadangan). Aktif bila PAYMENT=tripay.
import { createHmac, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";

const hmac = (key, s) => createHmac("sha256", key).update(s).digest("hex");
const base = (env) => (env.TRIPAY_MODE === "production" ? "https://tripay.co.id/api" : "https://tripay.co.id/api-sandbox");
const isMock = (env) => !(env.TRIPAY_API_KEY && env.TRIPAY_PRIVATE_KEY && env.TRIPAY_MERCHANT_CODE);

const MOCK_CHANNELS = [
  { code: "QRIS", name: "QRIS", group: "E-Wallet", fee_flat: 750, fee_percent: 0.7 },
  { code: "DANA", name: "DANA", group: "E-Wallet", fee_flat: 0, fee_percent: 3 },
  { code: "OVO", name: "OVO", group: "E-Wallet", fee_flat: 0, fee_percent: 3 },
  { code: "SHOPEEPAY", name: "ShopeePay", group: "E-Wallet", fee_flat: 0, fee_percent: 3 },
  { code: "BRIVA", name: "BRI Virtual Account", group: "Virtual Account", fee_flat: 4250, fee_percent: 0 },
];

let channelCache = null;

export const tripay = {
  name: "Tripay",
  isMock,

  /** Metode bayar aktif: [{ code, name, group, icon, fee_flat, fee_percent, min, max }] */
  async channels(env) {
    if (isMock(env)) return MOCK_CHANNELS;
    if (channelCache && Date.now() - channelCache.at < 10 * 60 * 1000) return channelCache.list;
    const res = await fetch(`${base(env)}/merchant/payment-channel`, { headers: { Authorization: `Bearer ${env.TRIPAY_API_KEY}` } });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "Gagal mengambil metode pembayaran Tripay");
    const list = json.data.filter((c) => c.active).map((c) => ({
      code: c.code, name: c.name, group: c.group, icon: c.icon_url,
      fee_flat: Number(c.fee_customer?.flat) || 0, fee_percent: Number(c.fee_customer?.percent) || 0,
      min: Number(c.minimum_amount) || 0, max: Number(c.maximum_amount) || 0,
    }));
    channelCache = { at: Date.now(), list };
    return list;
  },

  /** Buat tagihan → { reference, checkout_url, amount, expired_time } (Tripay menambah biaya pembeli sendiri) */
  async create(env, { order, channel, origin }) {
    const body = {
      method: channel.code,
      merchant_ref: order.inv,
      amount: order.price,
      customer_name: "Pelanggan Jean Shop",
      customer_email: env.CUSTOMER_EMAIL,
      customer_phone: order.wa,
      order_items: [{ sku: order.service, name: `${order.product} - ${order.item}`.slice(0, 250), price: order.price, quantity: 1 }],
      callback_url: `${origin}/api/callback/tripay`,
      return_url: `${origin}/#/cek-transaksi?inv=${order.inv}`,
      expired_time: Math.floor(Date.now() / 1000) + 60 * 60,
      signature: hmac(env.TRIPAY_PRIVATE_KEY, env.TRIPAY_MERCHANT_CODE + order.inv + order.price),
    };
    const res = await fetch(`${base(env)}/transaction/create`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.TRIPAY_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "Gagal membuat tagihan Tripay");
    const d = json.data;
    return { reference: d.reference, checkout_url: d.checkout_url, amount: Number(d.amount), expired_time: Number(d.expired_time) };
  },

  /** Callback Tripay (HMAC-SHA256 body mentah) → { inv, status: PAID|EXPIRED|null, amount } atau null kalau tidak sah */
  async callback(env, request) {
    if (isMock(env)) return null;
    const raw = await request.text();
    const a = Buffer.from(hmac(env.TRIPAY_PRIVATE_KEY, raw));
    const b = Buffer.from(String(request.headers.get("X-Callback-Signature") || ""));
    if (a.length !== b.length || !timingSafeEqual(a, b) || request.headers.get("X-Callback-Event") !== "payment_status") return null;
    const cb = JSON.parse(raw);
    const status = cb.status === "PAID" ? "PAID" : cb.status === "EXPIRED" || cb.status === "FAILED" ? "EXPIRED" : null;
    return { inv: String(cb.merchant_ref || ""), status, amount: Number(cb.total_amount) };
  },
};
