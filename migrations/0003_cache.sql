-- Simpanan data sementara (mis. daftar harga Digiflazz) supaya tetap ada setelah server dinyalakan ulang
CREATE TABLE IF NOT EXISTS cache (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
