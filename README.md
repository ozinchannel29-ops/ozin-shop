# Jean Shop

Website top up game, pulsa & token PLN. Situs ada di `docs/`, server (API) di `src/`.
Supplier: **Digiflazz** (bawaan) atau VIPayment. Pembayaran: Tripay.

## Jalankan di komputer (localhost)

Butuh Node.js 22.13 atau lebih baru.

```bash
npm run dev        # → http://localhost:3001   (database: data/jeanshop.db)
```

Halaman admin: `http://localhost:3001/admin` (password dari `ADMIN_PASSWORD`; khusus mode simulasi tanpa kunci apa pun, password bawaan `admin`).

Tanpa kunci API, server berjalan dalam **mode simulasi** (supplier & pembayaran tiruan, tidak ada uang sungguhan).

## Menyambungkan Digiflazz & Tripay

1. Salin `.dev.vars.example` menjadi `.dev.vars` (komputer) atau `.env` (VPS), isi kuncinya.
   Mulai dengan `DIGIFLAZZ_MODE=development` + Development Key, dan kunci **sandbox** Tripay.
2. `npm run df:list` → cocokkan brand/kategori di `src/catalog.js` (Digiflazz membatasi 1× per 5 menit).
3. Atur untung di `wrangler.toml` bagian `[vars]` (`MARGIN_PERCENT`, `MARGIN_MIN`, `ROUND_TO`).

⚠ Digiflazz hanya menerima permintaan dari **IP yang di-whitelist**, jadi server harus berjalan di VPS ber-IP tetap.

## Online di VPS (Ubuntu)

```bash
# 1. Node.js 22+, nginx, certbot
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash - && sudo apt install -y nodejs nginx certbot python3-certbot-nginx
# 2. Kode + kunci
git clone https://github.com/ozinchannel29-ops/ozin-shop.git && cd ozin-shop
cp .dev.vars.example .env && nano .env      # isi kunci + ADMIN_PASSWORD
# 3. Jalankan sebagai layanan (systemd) → lihat contoh di bawah, lalu:
sudo systemctl enable --now jeanshop
# 4. nginx → 127.0.0.1:3001, lalu HTTPS
sudo certbot --nginx -d <domain>
```

`/etc/systemd/system/jeanshop.service`:

```ini
[Unit]
Description=Jean Shop
After=network.target

[Service]
WorkingDirectory=/home/<user>/ozin-shop
ExecStart=/usr/bin/node server/node.mjs
Restart=always
User=<user>

[Install]
WantedBy=multi-user.target
```

Blok `server` nginx (di dalam `location /`):

```nginx
proxy_pass http://127.0.0.1:3001;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-Proto $scheme;
```

Setelah online:
- Digiflazz → Atur Koneksi → API: **whitelist IP VPS**, webhook `https://<domain>/api/callback/digiflazz` + secret (sama dengan `DIGIFLAZZ_WEBHOOK_SECRET`)
- Tripay → callback `https://<domain>/api/callback/tripay`
- Backup database: salin `data/jeanshop.db` secara berkala

## Alternatif: Cloudflare Workers (hanya untuk VIPayment)

```bash
npx wrangler login
npx wrangler d1 create ozin-shop          # salin database_id ke wrangler.toml
npx wrangler secret put VIP_API_ID         # ulangi untuk setiap kunci di .dev.vars.example (+ SUPPLIER=vipayment)
npm run deploy:worker
```
Callback VIPayment → `https://<domain>/api/callback/vip`
