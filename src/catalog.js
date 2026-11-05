// Pemetaan produk Jean Shop (slug di docs/data.js) → produk di supplier (Digiflazz & VIPayment).
// ⚠ Nama brand/kategori di bawah perlu dicocokkan sekali dengan data asli supplier:
//    Digiflazz: `npm run df:list`   VIPayment: `npm run vip:list`   (setelah kunci diisi di .dev.vars)
import data from "../docs/data.js";

// Game: nama di VIPayment (filter_game); brand Digiflazz = nama yang sama huruf besar, kategori "Games".
const game = (name, { nick, dfBrand } = {}) => ({
  vip: { filter: name, nick },
  df: { brand: dfBrand || name.toUpperCase(), category: "Games" },
});

const GAME = {
  "mobile-legends": game("Mobile Legends", { nick: "mobile-legends" }),
  "free-fire": game("Free Fire", { nick: "free-fire" }),
  "pubg-mobile": game("PUBG Mobile"),
  "valorant": game("Valorant"),
  "arena-breakout": game("Arena Breakout"),
  "blood-strike": game("Blood Strike"),
  "call-of-duty-mobile": game("Call of Duty Mobile"),
  "genshin-impact": game("Genshin Impact"),
  "growtopia": game("Growtopia"),
  "honor-of-kings": game("Honor of Kings"),
  "magic-chess-go-go": game("Magic Chess", { dfBrand: "MAGIC CHESS GO GO" }),
  "stumble-guys": game("Stumble Guys"),
  "honkai-star-rail": game("Honkai Star Rail"),
  "roblox": game("Roblox"),
  "point-blank": game("Point Blank"),
  "clash-of-clans": game("Clash of Clans"),
  "zenless-zone-zero": game("Zenless Zone Zero"),
  "delta-force": game("Delta Force"),
  "wuthering-waves": game("Wuthering Waves"),
  "efootball": game("eFootball"),
  "sausage-man": game("Sausage Man"),
  "super-sus": game("Super Sus"),
};

const pulsa = (brand) => ({ vip: { brand, type: /pulsa/i }, df: { brand, category: "Pulsa" } });

const PREPAID = {
  "pulsa-telkomsel": pulsa("TELKOMSEL"),
  "pulsa-indosat": pulsa("INDOSAT"),
  "pulsa-xl": pulsa("XL"),
  "pulsa-axis": pulsa("AXIS"),
  "pulsa-tri": pulsa("TRI"),
  "pulsa-smartfren": pulsa("SMARTFREN"),
  "token-pln": { vip: { brand: "PLN", type: /pln|token/i }, df: { brand: "PLN", category: "PLN" } },
};

export const { FIELDS } = data;

/** Produk lengkap: data tampilan dari data.js + pemetaan supplier (map.vip / map.df). null kalau tidak dikenal. */
export function getProduct(slug) {
  const p = data.PRODUCTS.find((x) => x.slug === slug);
  if (!p) return null;
  if (GAME[slug]) return { ...p, kind: "game", map: GAME[slug] };
  if (PREPAID[slug]) return { ...p, kind: "prepaid", map: PREPAID[slug] };
  return null;
}
