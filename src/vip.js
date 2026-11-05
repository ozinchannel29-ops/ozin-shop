// Supplier VIPayment (vip-reseller.co.id). Aktif bila SUPPLIER=vipayment.
import { createHash } from "node:crypto";
import { mockServices, mockOrder, mockStatus, mockNickname } from "./mock.js";

const BASE = "https://vip-reseller.co.id/api";
const md5 = (s) => createHash("md5").update(s).digest("hex");

const isMock = (env) => !(env.VIP_API_ID && env.VIP_API_KEY);
const sign = (env) => md5(env.VIP_API_ID + env.VIP_API_KEY);

/** Status VIPayment → status pesanan Jean Shop */
function mapStatus(s) {
  s = String(s || "").toLowerCase();
  if (s === "success") return "SUCCESS";
  if (s === "error") return "FAILED";
  return "PROCESSING"; // waiting | processing
}

async function call(env, endpoint, params) {
  const body = new URLSearchParams({ key: env.VIP_API_KEY, sign: sign(env), ...params });
  const res = await fetch(`${BASE}/${endpoint}`, { method: "POST", body });
  let json;
  try { json = await res.json(); } catch { throw new Error(`VIPayment tidak merespons dengan benar (HTTP ${res.status})`); }
  if (!json.result) throw new Error(json.message || "Permintaan ke VIPayment gagal");
  return json.data;
}

// Daftar layanan disimpan sebentar di memori supaya tidak memanggil VIPayment di setiap kunjungan.
const cache = new Map();
const TTL = 5 * 60 * 1000;

export const vipayment = {
  name: "VIPayment",
  isMock,
  pollMs: 15000,

  /** Layanan untuk satu produk: [{ code, name, cost, available }] */
  async services(env, product) {
    const hit = cache.get(product.slug);
    if (hit && Date.now() - hit.at < TTL) return hit.list;
    let list;
    if (isMock(env)) list = mockServices(product);
    else {
      const map = product.map.vip;
      const level = env.VIP_LEVEL || "basic";
      const raw = product.kind === "game"
        ? await call(env, "game-feature", { type: "services", filter_game: map.filter })
        : await call(env, "prepaid", { type: "services", filter_type: "brand", filter_value: map.brand });
      list = (raw || [])
        .filter((s) => product.kind === "game" || map.type.test(`${s.type} ${s.category} ${s.name}`))
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
  },

  /** Kirim pesanan → { trxid, status, note } */
  async order(env, order) {
    if (isMock(env)) return mockOrder();
    const d = order.kind === "game"
      ? await call(env, "game-feature", { type: "order", service: order.service, data_no: order.target, ...(order.zone ? { data_zone: order.zone } : {}) })
      : await call(env, "prepaid", { type: "order", service: order.service, data_no: order.target });
    return { trxid: String(d.trxid), status: mapStatus(d.status), note: d.note || "" };
  },

  /** Cek status → { status, note } */
  async status(env, order) {
    if (isMock(env)) return mockStatus(order);
    const d = await call(env, order.kind === "game" ? "game-feature" : "prepaid", { type: "status", trxid: order.vip_trxid });
    const row = Array.isArray(d) ? d[0] : d;
    return { status: mapStatus(row?.status), note: row?.note || "" };
  },

  canNickname: (env, product) => product.kind === "game" && (isMock(env) || Boolean(product.map.vip?.nick)),

  async nickname(env, product, target, zone) {
    if (isMock(env)) return mockNickname(target);
    const d = await call(env, "game-feature", { type: "get-nickname", code: product.map.vip.nick, target, ...(zone ? { additional_target: zone } : {}) });
    return typeof d === "string" ? d : d?.nickname || d?.name || "";
  },

  /** Callback VIPayment → { trxid, status, note } atau null kalau tidak sah */
  async callback(env, request) {
    if (isMock(env)) return null;
    const ip = request.headers.get("CF-Connecting-IP");
    if (env.VIP_CALLBACK_IP && ip && ip !== env.VIP_CALLBACK_IP) return null;
    if (request.headers.get("X-Client-Signature") !== sign(env)) return null;
    const body = await request.json().catch(() => ({}));
    const d = body.data || body;
    return { trxid: String(d.trxid || ""), status: mapStatus(d.status), note: d.note || "" };
  },
};
