// Supplier simulasi: dipakai selama kunci supplier asli belum diisi (tidak ada transaksi sungguhan).

/** Modal simulasi = ±93% dari harga contoh di data.js */
export const mockServices = (product) => product.items.map((it, i) => ({
  code: `MOCK-${product.slug}-${i}`, name: it.name, cost: Math.round((it.price * 0.93) / 100) * 100, available: true,
}));

/** Waktu kirim disimpan di trxid (MOCK<base36>) supaya status bisa "selesai" ±8 detik kemudian */
export const mockOrder = () => ({ trxid: "MOCK" + Date.now().toString(36).toUpperCase(), status: "PROCESSING", note: "Simulasi: sedang diproses" });

export const mockStatus = (order) => Date.now() - parseInt(order.vip_trxid.slice(4), 36) > 8000
  ? { status: "SUCCESS", note: `Simulasi: SN ${order.vip_trxid}` }
  : { status: "PROCESSING", note: order.note };

export const mockNickname = (target) => `JeanPlayer${String(target).slice(-3)}`;
