-- Pesanan Ozin Shop
CREATE TABLE IF NOT EXISTS orders (
  inv          TEXT PRIMARY KEY,
  slug         TEXT NOT NULL,
  product      TEXT NOT NULL,
  item         TEXT NOT NULL,
  service      TEXT NOT NULL,          -- kode layanan VIPayment
  kind         TEXT NOT NULL,          -- game | prepaid
  target       TEXT NOT NULL,          -- User ID / nomor HP / nomor meter
  zone         TEXT NOT NULL DEFAULT '',
  wa           TEXT NOT NULL,
  method       TEXT NOT NULL,          -- kode channel Tripay
  method_name  TEXT NOT NULL,
  price        INTEGER NOT NULL,       -- harga jual (tanpa biaya bayar)
  cost         INTEGER NOT NULL,       -- modal VIPayment saat order dibuat
  amount       INTEGER NOT NULL DEFAULT 0, -- total yang dibayar pelanggan
  status       TEXT NOT NULL,          -- UNPAID | PAID | PROCESSING | SUCCESS | FAILED | EXPIRED
  pay_ref      TEXT NOT NULL DEFAULT '',
  pay_url      TEXT NOT NULL DEFAULT '',
  pay_expired  INTEGER NOT NULL DEFAULT 0,
  vip_trxid    TEXT NOT NULL DEFAULT '',
  note         TEXT NOT NULL DEFAULT '',
  checked_at   INTEGER NOT NULL DEFAULT 0, -- terakhir cek status ke VIPayment
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_vip ON orders (vip_trxid);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
