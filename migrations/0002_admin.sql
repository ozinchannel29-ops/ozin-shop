-- Waktu lunas (untuk membedakan pesanan gagal yang sudah dibayar → perlu refund / kirim ulang)
ALTER TABLE orders ADD COLUMN paid_at INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at);
