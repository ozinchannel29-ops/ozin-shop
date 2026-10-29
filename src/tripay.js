// Klien payment gateway Tripay + versi simulasi saat kunci belum diisi.
import { createHmac, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";

const hmac = (key, s) => createHmac("sha256", key).update(s).digest("hex");
const base = (env) => (env.TRIPAY_MODE === "production" ? "https://tripay.co.id/api" : "https://tripay.co.id/api-sandbox");

export const payIsMock = (env) => !(env.TRIPAY_API_KEY && env.TRIPAY_PRIVATE_KEY && env.TRIPAY_MERCHANT_CODE);

const MOCK_CHANNELS = [
  { code: "QRIS", name: "QRIS", group: "E-Wallet", fee_flat: 750, fee_percent: 0.7 },
  { code: "DANA", name: "DANA", group: "E-Wallet", fee_flat: 0, fee_percent: 3 },
  { code: "OVO", name: "OVO", group: "E-Wallet", fee_flat: 0, fee_percent: 3 },
  { code: "SHOPEEPAY", name: "ShopeePay", group: "E-Wallet", fee_flat: 0, fee_percent: 3 },
  { code: "BRIVA", name: "BRI Virtual Account", group: "Virtual Account", fee_flat: 4250, fee_percent: 0 },
];

let channelCache = null;

/** Metode bayar aktif: [{ code, name, group, icon, fee_flat, fee_percent, min, max }] */
export async function payChannels(env) {
  if (payIsMock(env)) return MOCK_CHANNELS;
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
}

export const feeOf = (ch, price) => Math.ceil(ch.fee_flat + (price * ch.fee_percent) / 100);

/** Buat tagihan → { reference, checkout_url, amount, expired_time } */
export async function payCreate(env, { order, channel, origin }) {
  if (payIsMock(env)) {
    return {
      reference: "SIM-" + order.inv, checkout_url: `${origin}/api/mock/pay?inv=${order.inv}`,
      amount: order.price + feeOf(channel, order.price), expired_time: Math.floor(Date.now() / 1000) + 3600,
    };
  }
  const body = {
    method: channel.code,
    merchant_ref: order.inv,
    amount: order.price,
    customer_name: "Pelanggan Ozin Shop",
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
}

/** Verifikasi tanda tangan callback Tripay (HMAC-SHA256 dari body mentah) */
export function payVerify(env, rawBody, signature) {
  if (!signature) return false;
  const a = Buffer.from(hmac(env.TRIPAY_PRIVATE_KEY, rawBody));
  const b = Buffer.from(String(signature));
  return a.length === b.length && timingSafeEqual(a, b);
}
