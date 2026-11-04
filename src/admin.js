// API halaman admin (/admin): login password, ringkasan omzet/untung, daftar pesanan, aksi refund/kirim ulang.
// Password: secret ADMIN_PASSWORD. Khusus mode simulasi penuh (tanpa kunci apa pun) password bawaan = "admin".
import { createHmac, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
import { vipIsMock } from "./vip.js";
import { payIsMock } from "./tripay.js";

const DAY = 24 * 3600 * 1000;
const TOKEN_TTL = 12 * 3600 * 1000;
const PAGE_SIZE = 50;

function adminPassword(env) {
  if (env.ADMIN_PASSWORD) return env.ADMIN_PASSWORD;
  return vipIsMock(env) && payIsMock(env) ? "admin" : "";
}

const sign = (secret, exp) => createHmac("sha256", secret).update(`admin:${exp}`).digest("hex");
const same = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

function checkToken(env, request) {
  const secret = adminPassword(env);
  const [exp, sig] = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").split(".");
  return Boolean(secret && Number(exp) > Date.now() && sig && same(sig, sign(secret, exp)));
}

/** Awal hari ini dalam WIB (UTC+7), dalam milidetik */
const startOfTodayWIB = (t) => Math.floor((t + 7 * 3600 * 1000) / DAY) * DAY - 7 * 3600 * 1000;

async function summary(env, since) {
  const r = await env.DB.prepare(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) AS success,
            SUM(CASE WHEN status IN ('PAID','PROCESSING') THEN 1 ELSE 0 END) AS processing,
            SUM(CASE WHEN status = 'SUCCESS' THEN price ELSE 0 END) AS revenue,
            SUM(CASE WHEN status = 'SUCCESS' THEN price - cost ELSE 0 END) AS profit
       FROM orders WHERE created_at >= ?`
  ).bind(since).first();
  return { total: r.total || 0, success: r.success || 0, processing: r.processing || 0, revenue: r.revenue || 0, profit: r.profit || 0 };
}

const adminOrder = (o, STATUS_LABEL) => ({
  ...o,
  status_label: STATUS_LABEL[o.status] || o.status,
  profit: o.price - o.cost,
  needs_action: o.status === "FAILED" && o.paid_at > 0,
});

export async function handleAdmin(env, request, url, { getOrder, updateOrder, fulfil, STATUS_LABEL, HttpError, json }) {
  const path = url.pathname.slice("/api/admin/".length);
  const m = request.method;

  if (m === "POST" && path === "login") {
    const secret = adminPassword(env);
    if (!secret) throw new HttpError(503, "Admin belum aktif: atur ADMIN_PASSWORD di server");
    const { password } = await request.json().catch(() => ({}));
    if (!same(password || "", secret)) {
      await new Promise((r) => setTimeout(r, 700)); // perlambat tebakan password
      throw new HttpError(401, "Password salah");
    }
    const exp = Date.now() + TOKEN_TTL;
    return json({ token: `${exp}.${sign(secret, exp)}`, exp, default_password: !env.ADMIN_PASSWORD });
  }

  if (!checkToken(env, request)) throw new HttpError(401, "Sesi admin habis, silakan login lagi");

  if (m === "GET" && path === "stats") {
    const t = Date.now();
    const attention = await env.DB.prepare("SELECT COUNT(*) AS n, SUM(amount) AS total FROM orders WHERE status = 'FAILED' AND paid_at > 0").first();
    return json({
      today: await summary(env, startOfTodayWIB(t)),
      month: await summary(env, t - 30 * DAY),
      attention: { count: attention.n || 0, amount: attention.total || 0 },
      simulation: { supplier: vipIsMock(env), payment: payIsMock(env) },
      default_password: !env.ADMIN_PASSWORD,
    });
  }

  if (m === "GET" && path === "orders") {
    const status = (url.searchParams.get("status") || "").toUpperCase();
    const q = (url.searchParams.get("q") || "").trim().slice(0, 40);
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const where = [];
    const args = [];
    if (status === "ATTENTION") where.push("status = 'FAILED' AND paid_at > 0");
    else if (STATUS_LABEL[status]) { where.push("status = ?"); args.push(status); }
    if (q) { where.push("(inv LIKE ? OR target LIKE ? OR wa LIKE ? OR product LIKE ?)"); args.push(...Array(4).fill(`%${q}%`)); }
    const sql = `FROM orders ${where.length ? "WHERE " + where.join(" AND ") : ""}`;
    const { results } = await env.DB.prepare(`SELECT * ${sql} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...args, PAGE_SIZE, (page - 1) * PAGE_SIZE).all();
    const count = await env.DB.prepare(`SELECT COUNT(*) AS n ${sql}`).bind(...args).first();
    return json({ orders: results.map((o) => adminOrder(o, STATUS_LABEL)), total: count.n, page, pages: Math.max(1, Math.ceil(count.n / PAGE_SIZE)) });
  }

  const act = path.match(/^orders\/([A-Z0-9]+)$/);
  if (m === "POST" && act) {
    const inv = act[1];
    const order = await getOrder(env, inv);
    if (!order) throw new HttpError(404, "Invoice tidak ditemukan");
    const { action } = await request.json().catch(() => ({}));
    const when = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 16).replace("T", " ");
    const paidFailed = order.status === "FAILED" && order.paid_at > 0;

    if (action === "retry") {
      if (!paidFailed) throw new HttpError(400, "Kirim ulang hanya untuk pesanan gagal yang sudah dibayar");
      if (await updateOrder(env, inv, { status: "PAID", note: "Dikirim ulang oleh admin" }, "FAILED")) await fulfil(env, inv);
    } else if (action === "refunded") {
      if (!paidFailed) throw new HttpError(400, "Tandai refund hanya untuk pesanan gagal yang sudah dibayar");
      await updateOrder(env, inv, { status: "REFUNDED", note: `Dana dikembalikan oleh admin (${when} WIB)` }, "FAILED");
    } else if (action === "success") {
      if (!(["PAID", "PROCESSING"].includes(order.status) || paidFailed)) throw new HttpError(400, "Pesanan ini tidak bisa ditandai selesai");
      await updateOrder(env, inv, { status: "SUCCESS", note: `Diselesaikan manual oleh admin (${when} WIB)` }, order.status);
    } else {
      throw new HttpError(400, "Aksi tidak dikenal");
    }
    return json(adminOrder(await getOrder(env, inv), STATUS_LABEL));
  }

  throw new HttpError(404, "Not found");
}
