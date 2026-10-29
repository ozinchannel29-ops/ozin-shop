// Pemetaan produk Ozin Shop (slug di docs/data.js) → layanan VIPayment.
// game:  filter = nama game persis seperti di VIPayment (parameter filter_game), nick = kode cek nickname.
// prepaid: brand = nama brand di VIPayment, type = pola nama tipe yang diambil (mis. hanya pulsa, bukan paket data).
// ⚠ Nama/kode di bawah perlu dicocokkan sekali dengan data asli: jalankan `npm run vip:list` setelah API key diisi.
import data from "../docs/data.js";

const GAME = {
  "mobile-legends": { filter: "Mobile Legends", nick: "mobile-legends" },
  "free-fire": { filter: "Free Fire", nick: "free-fire" },
  "pubg-mobile": { filter: "PUBG Mobile" },
  "valorant": { filter: "Valorant" },
  "arena-breakout": { filter: "Arena Breakout" },
  "blood-strike": { filter: "Blood Strike" },
  "call-of-duty-mobile": { filter: "Call of Duty Mobile" },
  "genshin-impact": { filter: "Genshin Impact" },
  "growtopia": { filter: "Growtopia" },
  "honor-of-kings": { filter: "Honor of Kings" },
  "magic-chess-go-go": { filter: "Magic Chess" },
  "stumble-guys": { filter: "Stumble Guys" },
  "honkai-star-rail": { filter: "Honkai Star Rail" },
  "roblox": { filter: "Roblox" },
  "point-blank": { filter: "Point Blank" },
  "clash-of-clans": { filter: "Clash of Clans" },
  "zenless-zone-zero": { filter: "Zenless Zone Zero" },
  "delta-force": { filter: "Delta Force" },
  "wuthering-waves": { filter: "Wuthering Waves" },
  "efootball": { filter: "eFootball" },
  "sausage-man": { filter: "Sausage Man" },
  "super-sus": { filter: "Super Sus" },
};

const PREPAID = {
  "pulsa-telkomsel": { brand: "TELKOMSEL", type: /pulsa/i },
  "pulsa-indosat": { brand: "INDOSAT", type: /pulsa/i },
  "pulsa-xl": { brand: "XL", type: /pulsa/i },
  "pulsa-axis": { brand: "AXIS", type: /pulsa/i },
  "pulsa-tri": { brand: "TRI", type: /pulsa/i },
  "pulsa-smartfren": { brand: "SMARTFREN", type: /pulsa/i },
  "token-pln": { brand: "PLN", type: /pln|token/i },
};

export const { FIELDS } = data;

/** Produk lengkap: data tampilan dari data.js + pemetaan VIPayment. null kalau tidak dikenal. */
export function getProduct(slug) {
  const p = data.PRODUCTS.find((x) => x.slug === slug);
  if (!p) return null;
  if (GAME[slug]) return { ...p, kind: "game", vip: GAME[slug] };
  if (PREPAID[slug]) return { ...p, kind: "prepaid", vip: PREPAID[slug] };
  return null;
}
