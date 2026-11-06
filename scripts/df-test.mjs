// Uji koneksi Digiflazz (mode development) dengan nomor uji resmi dari
// https://developer.digiflazz.com/api/buyer/test-case/  →  npm run df:test
// Membaca DIGIFLAZZ_USERNAME & DIGIFLAZZ_API_KEY (Development Key) dari .env / .dev.vars.
// Syarat: akun terverifikasi + IP komputer/VPS ini sudah di-whitelist di Atur Koneksi → API.
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

const file = new URL(existsSync(new URL("../.env", import.meta.url)) ? "../.env" : "../.dev.vars", import.meta.url);
if (!existsSync(file)) { console.error("Belum ada file .dev.vars / .env. Salin .dev.vars.example lalu isi kunci Digiflazz."); process.exit(1); }
const vars = Object.fromEntries(
  readFileSync(file, "utf8").split(/\r?\n/).map((l) => l.match(/^\s*([A-Z][A-Z0-9_]*)\s*=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()])
);
const { DIGIFLAZZ_USERNAME: user, DIGIFLAZZ_API_KEY: key } = vars;
if (!user || !key) { console.error("Isi DIGIFLAZZ_USERNAME dan DIGIFLAZZ_API_KEY (Development Key) dulu."); process.exit(1); }
if (vars.DIGIFLAZZ_MODE === "production") { console.error("Skrip ini hanya untuk DIGIFLAZZ_MODE=development."); process.exit(1); }

const md5 = (s) => createHash("md5").update(s).digest("hex");
const CASES = [
  { no: "087800001230", expect: "Sukses" },
  { no: "087800001232", expect: "Gagal" },
  { no: "087800001233", expect: "Pending → callback Sukses" },
  { no: "087800001234", expect: "Pending → callback Gagal" },
];
const run = Date.now().toString(36).toUpperCase();

async function topup(no, ref) {
  const res = await fetch("https://api.digiflazz.com/v1/transaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: user, buyer_sku_code: "xld10", customer_no: no, ref_id: ref, sign: md5(user + key + ref), testing: true }),
  });
  return (await res.json()).data || {};
}

const rows = [];
for (const [i, c] of CASES.entries()) {
  const ref = `TEST${run}${i}`;
  const d = await topup(c.no, ref);
  rows.push({ nomor: c.no, harapan: c.expect, status: d.status, rc: d.rc, pesan: d.message, sn: d.sn || "", ref });
}
console.table(rows);
if (rows.some((r) => r.rc === "45")) console.log("rc 45 = IP belum di-whitelist di Digiflazz (Atur Koneksi → API).");
if (rows.some((r) => r.rc === "41")) console.log("rc 41 = signature/kunci salah, atau kunci tidak sesuai mode (Development/Production).");

const pending = rows.filter((r) => r.status === "Pending");
if (pending.length) {
  console.log(`\n${pending.length} transaksi pending. Cek ulang 65 detik lagi (Digiflazz melarang cek < 1 menit)…`);
  await new Promise((r) => setTimeout(r, 65000));
  for (const r of pending) {
    const d = await topup(r.nomor, r.ref); // cek status = kirim ulang dengan ref_id yang sama
    console.log(`${r.nomor}: ${d.status} (rc ${d.rc}) ${d.message || ""} ${d.sn ? "SN " + d.sn : ""}`);
  }
}
