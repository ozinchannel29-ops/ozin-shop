// Jean Shop untuk VPS (Node 22.13+): menyajikan docs/ + menjalankan API src/index.js dengan SQLite bawaan Node.
//   node server/node.mjs           → http://127.0.0.1:3001
// Pengaturan: [vars] di wrangler.toml, lalu ditimpa .env (VPS) / .dev.vars (komputer) / variabel lingkungan.
import http from "node:http";
import { readFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, normalize, extname, relative, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import app from "../src/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = join(ROOT, "docs");

/* ---------- pengaturan ---------- */
/** [vars] dari wrangler.toml (nilai "dalam kutip", boleh ada # komentar) */
function tomlVars(file) {
  const out = {};
  let section = "";
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const sec = line.match(/^\s*\[+([^\]]+)\]+/);
    if (sec) { section = sec[1].trim(); continue; }
    const m = section === "vars" && line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*"([^"]*)"/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
/** File rahasia KUNCI=nilai (nilai diambil apa adanya, termasuk karakter #) */
function dotenv(file) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^"(.*)"$/, "$1");
  }
  return out;
}
const env = {
  ...tomlVars(join(ROOT, "wrangler.toml")),
  ...dotenv(join(ROOT, existsSync(join(ROOT, ".env")) ? ".env" : ".dev.vars")),
  ...Object.fromEntries(Object.entries(process.env).filter(([k]) => /^(SUPPLIER|DIGIFLAZZ_|VIP_|TRIPAY_|ADMIN_|MARGIN_|ROUND_TO|CUSTOMER_EMAIL|PORT|HOST|DB_PATH)/.test(k))),
};

/* ---------- database: SQLite dengan antarmuka mirip Cloudflare D1 ---------- */
const dbPath = env.DB_PATH || join(ROOT, "data", "jeanshop.db");
mkdirSync(dirname(dbPath), { recursive: true });
const sqlite = new DatabaseSync(dbPath);
sqlite.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
sqlite.exec("CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)");
const migDir = join(ROOT, "migrations");
for (const f of readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort()) {
  if (sqlite.prepare("SELECT 1 FROM _migrations WHERE name = ?").get(f)) continue;
  sqlite.exec("BEGIN");
  try {
    sqlite.exec(readFileSync(join(migDir, f), "utf8"));
    sqlite.prepare("INSERT INTO _migrations (name, applied_at) VALUES (?, ?)").run(f, Date.now());
    sqlite.exec("COMMIT");
    console.log(`Migrasi database: ${f}`);
  } catch (e) { sqlite.exec("ROLLBACK"); throw e; }
}

class Stmt {
  constructor(sql, args = []) { this.sql = sql; this.args = args; }
  bind(...args) { return new Stmt(this.sql, args); }
  async first() { return sqlite.prepare(this.sql).get(...this.args) ?? null; }
  async all() { return { results: sqlite.prepare(this.sql).all(...this.args) }; }
  async run() { const r = sqlite.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; }
}
env.DB = { prepare: (sql) => new Stmt(sql) };

/* ---------- file statis dari docs/ ---------- */
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml",
};
function staticFile(pathname) {
  let p = normalize(join(DOCS, decodeURIComponent(pathname)));
  const rel = relative(DOCS, p);
  if (rel.startsWith("..") || rel.split(sep).some((s) => s.startsWith("."))) return null;
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, "index.html");
  else if (!extname(p) && existsSync(p + ".html")) p += ".html"; // /admin → admin.html
  return existsSync(p) && statSync(p).isFile() ? p : null;
}
env.ASSETS = {
  async fetch(request) {
    const file = staticFile(new URL(request.url).pathname);
    if (!file) return new Response("404 - Halaman tidak ditemukan", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    return new Response(readFileSync(file), { headers: { "Content-Type": TYPES[extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache" } });
  },
};

/* ---------- server HTTP ---------- */
const isLocal = (ip) => ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";

http.createServer(async (req, res) => {
  try {
    const peer = req.socket.remoteAddress || "";
    // Di belakang nginx (lokal): percayai X-Forwarded-* untuk alamat asli & IP pengunjung
    const proxied = isLocal(peer) && req.headers["x-forwarded-proto"];
    const proto = proxied ? String(req.headers["x-forwarded-proto"]).split(",")[0] : "http";
    const host = req.headers.host || `127.0.0.1:${env.PORT || 3001}`;
    const clientIp = proxied ? String(req.headers["x-real-ip"] || req.headers["x-forwarded-for"] || peer).split(",")[0].trim() : peer;

    const chunks = [];
    let size = 0;
    for await (const c of req) { size += c.length; if (size > 1_000_000) { res.writeHead(413).end(); return; } chunks.push(c); }
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(", ") : v);
    headers.set("CF-Connecting-IP", clientIp.replace(/^::ffff:/, ""));
    const request = new Request(`${proto}://${host}${req.url}`, {
      method: req.method, headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks),
    });

    const response = await app.fetch(request, env);
    const out = {};
    response.headers.forEach((v, k) => { out[k] = v; });
    res.writeHead(response.status, out);
    res.end(req.method === "HEAD" ? undefined : Buffer.from(await response.arrayBuffer()));
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("500 - Kesalahan server");
  }
}).listen(Number(env.PORT) || 3001, env.HOST || "127.0.0.1", () => {
  const sup = (env.SUPPLIER || "digiflazz").toLowerCase();
  console.log(`Jean Shop jalan di http://${env.HOST || "127.0.0.1"}:${env.PORT || 3001}  (supplier: ${sup}, database: ${relative(ROOT, dbPath)})`);
});
