// Pilih payment gateway lewat PAYMENT = doku (bawaan) | tripay. Tanpa kunci → simulasi (/api/mock/pay).
import { doku } from "./doku.js";
import { tripay } from "./tripay.js";

export const PAYMENTS = { doku, tripay };

export const getPayment = (env) => PAYMENTS[String(env.PAYMENT || "doku").toLowerCase()] || doku;

export const feeOf = (ch, price) => Math.ceil(ch.fee_flat + (price * ch.fee_percent) / 100);

/** Tagihan simulasi: halaman bayar tiruan di server sendiri */
export const mockCreate = ({ order, channel, origin }) => ({
  reference: "SIM-" + order.inv,
  checkout_url: `${origin}/api/mock/pay?inv=${order.inv}`,
  amount: order.price + feeOf(channel, order.price),
  expired_time: Math.floor(Date.now() / 1000) + 3600,
});
