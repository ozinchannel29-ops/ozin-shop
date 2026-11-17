// Pemetaan produk Jean Shop (slug di docs/data.js) → produk di Digiflazz.
// ⚠ Nama brand/kategori di bawah perlu dicocokkan sekali dengan data asli Digiflazz:
//    `npm run df:list`   (setelah kunci diisi di .dev.vars)
import data from "../docs/data.js";

// Game: brand Digiflazz = nama game huruf besar, kategori "Games".
// dfBrand boleh berupa daftar beberapa kemungkinan nama brand (dicocokkan tanpa beda huruf besar/kecil).
const game = (name, { dfBrand } = {}) => ({
  df: { brand: dfBrand || name.toUpperCase(), category: "Games" },
});

const GAME = {
  "mobile-legends": game("Mobile Legends"),
  "free-fire": game("Free Fire"),
  "free-fire-max": game("Free Fire MAX", { dfBrand: ["FREE FIRE MAX", "FREEFIRE MAX", "FF MAX"] }),
  "arena-of-valor": game("Arena of Valor", { dfBrand: ["ARENA OF VALOR", "AOV", "GARENA AOV"] }),
  "pubg-mobile": game("PUBG Mobile"),
  "call-of-duty-mobile": game("Call of Duty Mobile", { dfBrand: ["CALL OF DUTY MOBILE", "CALL OF DUTY", "CODM"] }),
  "valorant": game("Valorant"),
  "sausage-man": game("Sausage Man"),
  "genshin-impact": game("Genshin Impact"),
  "league-of-legends-wild-rift": game("League of Legends Wild Rift", { dfBrand: ["LEAGUE OF LEGENDS WILD RIFT", "WILD RIFT", "LOL WILD RIFT"] }),
  "stumble-guys": game("Stumble Guys"),
  "fc-mobile": game("FC Mobile", { dfBrand: ["EA SPORTS FC MOBILE", "FC MOBILE", "FIFA MOBILE"] }),
  "growtopia": game("Growtopia"),
  "pubg-new-state": game("PUBG New State", { dfBrand: ["PUBG NEW STATE", "NEW STATE MOBILE", "PUBG NEW STATE MOBILE"] }),
  "league-of-legends-pc": game("League of Legends", { dfBrand: ["LEAGUE OF LEGENDS", "LEAGUE OF LEGENDS PC", "LOL PC"] }),
  "honor-of-kings": game("Honor of Kings"),
  "magic-chess-go-go": game("Magic Chess", { dfBrand: ["MAGIC CHESS GO GO", "MAGIC CHESS"] }),
  "delta-force": game("Delta Force"),
  "last-war-survival": game("Last War Survival", { dfBrand: ["LAST WAR SURVIVAL", "LAST WAR"] }),
  "asphalt-9": game("Asphalt 9", { dfBrand: ["ASPHALT 9", "ASPHALT 9 LEGENDS", "ASPHALT LEGENDS"] }),
  "dragon-city": game("Dragon City"),
};

const pulsa = (brand) => ({ df: { brand, category: "Pulsa" } });

const PREPAID = {
  "pulsa-telkomsel": pulsa("TELKOMSEL"),
  "pulsa-indosat": pulsa("INDOSAT"),
  "pulsa-xl": pulsa("XL"),
  "pulsa-axis": pulsa("AXIS"),
  "pulsa-tri": pulsa("TRI"),
  "pulsa-smartfren": pulsa("SMARTFREN"),
};

export const { FIELDS } = data;

/** Produk lengkap: data tampilan dari data.js + pemetaan Digiflazz (map.df). null kalau tidak dikenal. */
export function getProduct(slug) {
  const p = data.PRODUCTS.find((x) => x.slug === slug);
  if (!p) return null;
  if (GAME[slug]) return { ...p, kind: "game", map: GAME[slug] };
  if (PREPAID[slug]) return { ...p, kind: "prepaid", map: PREPAID[slug] };
  return null;
}
