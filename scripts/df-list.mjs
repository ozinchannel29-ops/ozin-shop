// Tampilkan brand/kategori di Digiflazz untuk mencocokkan src/catalog.js.
//   npm run df:list                    → semua kategori & brand
//   npm run df:list -- "MOBILE LEGENDS" → produk + harga modal untuk satu brand
// Membaca DIGIFLAZZ_USERNAME & DIGIFLAZZ_API_KEY dari .env / .dev.vars (tidak pernah ditampilkan).
// Catatan: Digiflazz membatasi ambil daftar harga lengkap maks. 1× per 5 menit.
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

const file = new URL(existsSync(new URL("../.env", import.meta.url)) ? "../.env" : "../.dev.vars", import.meta.url);
if (!existsSync(file)) { console.error("Belum ada file .dev.vars / .env. Salin .dev.vars.example lalu isi kunci Digiflazz."); process.exit(1); }
const vars = Object.fromEntries(
  readFileSync(file, "utf8").split(/\r?\n/).map((l) => l.match(/^\s*([A-Z][A-Z0-9_]*)\s*=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()])
);
const { DIGIFLAZZ_USERNAME: user, DIGIFLAZZ_API_KEY: key } = vars;
if (!user || !key) { console.error("Isi DIGIFLAZZ_USERNAME dan DIGIFLAZZ_API_KEY dulu."); process.exit(1); }

const res = await fetch("https://api.digiflazz.com/v1/price-list", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ cmd: "prepaid", username: user, sign: createHash("md5").update(user + key + "pricelist").digest("hex") }),
});
const { data } = await res.json();
if (!Array.isArray(data)) { console.error("Digiflazz menolak:", data?.message || data, "(rc", data?.rc + ")"); process.exit(1); }

const brand = process.argv[2];
if (brand) {
  console.table(data.filter((p) => p.brand.toLowerCase() === brand.toLowerCase())
    .sort((a, b) => a.price - b.price)
    .map((p) => ({ sku: p.buyer_sku_code, nama: p.product_name, kategori: p.category, modal: p.price, aktif: p.buyer_product_status && p.seller_product_status })));
} else {
  const groups = {};
  for (const p of data) (groups[p.category] ||= {})[p.brand] = ((groups[p.category] ||= {})[p.brand] || 0) + 1;
  for (const [cat, brands] of Object.entries(groups).sort()) {
    console.log(`\n=== ${cat} ===`);
    for (const [b, n] of Object.entries(brands).sort()) console.log(`  ${b}  (${n} produk)`);
  }
}
