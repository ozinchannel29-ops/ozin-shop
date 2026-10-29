// Tampilkan nama game / brand di VIPayment untuk mencocokkan src/catalog.js.
//   npm run vip:list                  → daftar semua game & brand
//   npm run vip:list -- "Free Fire"   → layanan + harga modal untuk satu game
// Membaca VIP_API_ID & VIP_API_KEY dari file .dev.vars (tidak pernah ditampilkan).
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const vars = Object.fromEntries(
  readFileSync(new URL("../.dev.vars", import.meta.url), "utf8")
    .split(/\r?\n/).map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map((m) => [m[1], m[2]])
);
if (!vars.VIP_API_ID || !vars.VIP_API_KEY) { console.error("Isi VIP_API_ID dan VIP_API_KEY di .dev.vars dulu."); process.exit(1); }
const sign = createHash("md5").update(vars.VIP_API_ID + vars.VIP_API_KEY).digest("hex");

async function call(endpoint, params) {
  const res = await fetch(`https://vip-reseller.co.id/api/${endpoint}`, { method: "POST", body: new URLSearchParams({ key: vars.VIP_API_KEY, sign, ...params }) });
  const json = await res.json();
  if (!json.result) throw new Error(`${endpoint}: ${json.message}`);
  return json.data;
}

const game = process.argv[2];
if (game) {
  const list = await call("game-feature", { type: "services", filter_game: game });
  console.table(list.map((s) => ({ code: s.code, name: s.name, basic: s.price?.basic, premium: s.price?.premium, status: s.status })));
} else {
  const count = (arr, key) => Object.entries(arr.reduce((m, s) => ((m[key(s)] = (m[key(s)] || 0) + 1), m), {})).sort();
  console.log("\n=== GAME (nilai untuk 'filter' di src/catalog.js) ===");
  for (const [g, n] of count(await call("game-feature", { type: "services" }), (s) => s.game)) console.log(`${g}  (${n} layanan)`);
  console.log("\n=== PREPAID brand | type (nilai untuk 'brand' & 'type') ===");
  for (const [g, n] of count(await call("prepaid", { type: "services" }), (s) => `${s.brand} | ${s.type}`)) console.log(`${g}  (${n})`);
}
