# Ozin Shop

Website top up game, pulsa & token PLN. Situs ada di `docs/`, server (API) di `src/` – berjalan di Cloudflare Workers + D1.

## Jalankan di komputer (localhost)

```bash
npm install
npm run dev        # → http://localhost:3001
```

Tanpa kunci API, server berjalan dalam **mode simulasi** (supplier & pembayaran tiruan, tidak ada uang sungguhan).

## Menyambungkan VIPayment & Tripay

1. Salin `.dev.vars.example` menjadi `.dev.vars`, isi `VIP_API_ID`, `VIP_API_KEY`, dan kunci **sandbox** Tripay.
2. `npm run vip:list` → cocokkan nama game/brand di `src/catalog.js`.
3. Atur untung di `wrangler.toml` (`MARGIN_PERCENT`, `MARGIN_MIN`, `ROUND_TO`).

## Online (Cloudflare)

```bash
npx wrangler login
npx wrangler d1 create ozin-shop          # salin database_id ke wrangler.toml
npx wrangler secret put VIP_API_ID         # ulangi untuk setiap kunci di .dev.vars.example
npm run deploy
```

Lalu isi URL callback:
- Tripay → `https://<domain>/api/callback/tripay`
- VIPayment → `https://<domain>/api/callback/vip`
