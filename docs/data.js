/* =========================================================
   JEAN SHOP — DATA TOKO
   Edit file ini untuk mengubah nomor WA, produk, dan harga.
   Harga di bawah masih CONTOH, silakan ganti dengan harga jual Anda.
   ========================================================= */

const STORE = {
  name: "Jean Shop",
  domain: "jeantopup.com",
  wa: "6287720826802",            // nomor WhatsApp admin (format 62…)
  email: "ihsanyahya08@gmail.com",
  tagline: "Tempat top up sat set, anti ribet & banyak promonya",
};

/* Jenis kolom data akun yang dipakai tiap produk */
const FIELDS = {
  idzone: [
    { key: "id", label: "User ID", placeholder: "Masukkan User ID", type: "number" },
    { key: "zone", label: "Zone ID", placeholder: "Zone", type: "number", small: true },
  ],
  playerid: [{ key: "id", label: "Player ID", placeholder: "Masukkan Player ID", type: "number" }],
  userid: [{ key: "id", label: "User ID", placeholder: "Masukkan User ID", type: "number" }],
  riot: [{ key: "id", label: "Riot ID", placeholder: "Contoh: Nama#TAG", type: "text" }],
  uidserver: [
    { key: "id", label: "UID", placeholder: "Masukkan UID", type: "number" },
    { key: "server", label: "Server", type: "select", options: ["Asia", "America", "Europe", "TW, HK, MO"] },
  ],
  growid: [
    { key: "id", label: "GrowID", placeholder: "Masukkan GrowID", type: "text" },
    { key: "world", label: "Nama World", placeholder: "World untuk drop", type: "text" },
  ],
  username: [{ key: "id", label: "Username", placeholder: "Masukkan username", type: "text" }],
  email: [{ key: "id", label: "Email akun", placeholder: "Email yang terdaftar", type: "email" }],
  phone: [{ key: "id", label: "Nomor HP", placeholder: "08xxxxxxxxxx", type: "tel" }],
  meter: [{ key: "id", label: "Nomor Meter / ID Pelanggan", placeholder: "Masukkan nomor meter", type: "number" }],
};

/* Buat daftar nominal: [jumlah, harga] → objek */
const list = (unit, rows) => rows.map(([qty, price]) => ({ name: `${qty} ${unit}`, price }));

/* Banner beranda. Kosong = pakai banner tulisan bawaan.
   Ukuran gambar: 1920 × 620 px (rasio 3,1 : 1), JPG/WebP, idealnya < 300 KB.
   Taruh file di assets/banners/, contoh:
   { img: "assets/banners/welcome.jpg", alt: "Welcome to Jean Shop", link: "#/topup/mobile-legends" } */
const BANNERS = [
  { img: "assets/banners/welcome.jpg", alt: "Welcome to Jean Shop – buka 25 jam" },
];

/* c1, c2 = warna kartu (dipakai kalau belum ada gambar).
   img = (opsional) gambar kartu, mis. "assets/games/mobile-legends.jpg".
   Ukuran gambar kartu: 600 × 600 px (rasio 1 : 1, persegi), JPG/WebP, idealnya < 120 KB.
   Gambar tampil penuh, jadi masukkan logo/nama game & "JEAN SHOP" di desain gambarnya. */
const PRODUCTS = [
  // ---------------- TOP UP GAME (urutan tampil = urutan di sini) ----------------
  { slug: "mobile-legends", name: "Mobile Legends", short: "MLBB", cat: "topup", publisher: "Moonton", c1: "#1d4ed8", c2: "#0b1640", fields: "idzone", popular: true,
    items: list("Diamonds", [[5, 1500], [12, 3500], [28, 8000], [44, 12000], [86, 22000], [172, 44000], [257, 65000], [344, 87000], [429, 108000], [514, 129000], [706, 176000], [878, 218000], [1412, 350000], [2195, 540000]]).concat([{ name: "Weekly Diamond Pass", price: 27500 }, { name: "Twilight Pass", price: 145000 }]) },
  { slug: "free-fire", name: "Free Fire", short: "FF", cat: "topup", publisher: "Garena", c1: "#f97316", c2: "#3b0d0d", fields: "playerid", popular: true,
    items: list("Diamonds", [[5, 1000], [12, 2000], [50, 7500], [70, 10000], [140, 19500], [355, 48000], [720, 95000], [1450, 190000], [2180, 285000], [3640, 470000]]).concat([{ name: "Membership Mingguan", price: 28000 }, { name: "Membership Bulanan", price: 85000 }]) },
  { slug: "free-fire-max", name: "Free Fire MAX", short: "FFMAX", cat: "topup", publisher: "Garena", c1: "#fb923c", c2: "#3b1206", fields: "playerid",
    items: list("Diamonds", [[5, 1000], [12, 2000], [50, 7500], [70, 10000], [140, 19500], [355, 48000], [720, 95000], [1450, 190000]]) },
  { slug: "arena-of-valor", name: "Arena of Valor", short: "AOV", cat: "topup", publisher: "Garena", c1: "#b45309", c2: "#1f1305", fields: "userid",
    items: list("Vouchers", [[18, 5000], [36, 10000], [90, 25000], [180, 50000], [360, 100000], [900, 250000]]) },
  { slug: "pubg-mobile", name: "PUBG Mobile", short: "PUBG", cat: "topup", publisher: "Tencent", c1: "#ca8a04", c2: "#2a1d05", fields: "playerid",
    items: list("UC", [[30, 7000], [60, 14000], [325, 70000], [660, 140000], [1800, 350000], [3850, 700000], [8100, 1400000]]) },
  { slug: "call-of-duty-mobile", name: "Call of Duty Mobile", short: "CODM", cat: "topup", publisher: "Activision", c1: "#525252", c2: "#0d0d0d", fields: "userid",
    items: list("CP", [[31, 5000], [63, 10000], [128, 20000], [321, 50000], [645, 100000], [1373, 200000], [3564, 500000]]) },
  { slug: "valorant", name: "Valorant", short: "VAL", cat: "topup", publisher: "Riot Games", c1: "#ef4444", c2: "#2b0a12", fields: "riot",
    items: list("VP", [[125, 15000], [420, 50000], [700, 80000], [1375, 150000], [2400, 260000], [4000, 420000], [8150, 840000]]) },
  { slug: "sausage-man", name: "Sausage Man", short: "SM", cat: "topup", publisher: "XD Inc.", c1: "#f59e0b", c2: "#2a1803", fields: "userid",
    items: list("Candy", [[60, 15000], [180, 45000], [300, 73000], [680, 160000], [1280, 300000]]) },
  { slug: "genshin-impact", name: "Genshin Impact", short: "GI", cat: "topup", publisher: "HoYoverse", c1: "#7c3aed", c2: "#170a33", fields: "uidserver",
    items: list("Genesis Crystals", [[60, 16000], [330, 79000], [1090, 249000], [2240, 479000], [3880, 799000], [8080, 1599000]]).concat([{ name: "Blessing of the Welkin Moon", price: 79000 }]) },
  { slug: "league-of-legends-wild-rift", name: "League of Legends: Wild Rift", short: "WR", cat: "topup", publisher: "Riot Games", c1: "#0ea5e9", c2: "#0a1a33", fields: "riot",
    items: list("Wild Cores", [[425, 50000], [1000, 115000], [1850, 210000], [3275, 365000], [4800, 530000]]) },
  { slug: "stumble-guys", name: "Stumble Guys", short: "SG", cat: "topup", publisher: "Scopely", c1: "#0891b2", c2: "#05263a", fields: "userid",
    items: list("Gems", [[200, 15000], [600, 40000], [1400, 90000], [3000, 180000], [8000, 450000]]) },
  { slug: "fc-mobile", name: "EA SPORTS FC Mobile", short: "FCM", cat: "topup", publisher: "EA Sports", c1: "#22c55e", c2: "#052e16", fields: "userid",
    items: list("FC Points", [[40, 8000], [100, 18000], [520, 85000], [1070, 170000], [2200, 340000]]) },
  { slug: "growtopia", name: "Growtopia", short: "GT", cat: "topup", publisher: "Ubisoft", c1: "#0ea5e9", c2: "#08243a", fields: "growid",
    items: list("World Lock", [[1, 3500], [10, 33000], [50, 160000], [100, 315000]]).concat(list("Diamond Lock", [[1, 330000]])) },
  { slug: "pubg-new-state", name: "PUBG: New State Mobile", short: "NS", cat: "topup", publisher: "Krafton", c1: "#475569", c2: "#0f172a", fields: "playerid",
    items: list("NC", [[300, 15000], [1500, 75000], [3000, 150000], [6000, 300000]]) },
  { slug: "league-of-legends-pc", name: "League of Legends (PC)", short: "LoL", cat: "topup", publisher: "Riot Games", c1: "#c8aa6e", c2: "#091428", fields: "riot",
    items: list("RP", [[575, 50000], [1380, 115000], [2800, 225000], [4500, 350000]]) },
  { slug: "honor-of-kings", name: "Honor of Kings", short: "HOK", cat: "topup", publisher: "TiMi Studio", c1: "#d97706", c2: "#2a1402", fields: "userid",
    items: list("Tokens", [[16, 3000], [80, 15000], [240, 45000], [400, 75000], [560, 105000], [830, 150000], [1245, 225000], [2508, 450000]]) },
  { slug: "magic-chess-go-go", name: "Magic Chess Go Go", short: "MCGG", cat: "topup", publisher: "Moonton", c1: "#2563eb", c2: "#0d1a47", fields: "idzone",
    items: list("Diamonds", [[5, 1500], [12, 3500], [28, 8000], [86, 22000], [172, 44000], [344, 87000], [706, 176000]]) },
  { slug: "delta-force", name: "Delta Force", short: "DF", cat: "topup", publisher: "TiMi Studio", c1: "#059669", c2: "#05201a", fields: "userid",
    items: list("Delta Coins", [[60, 15000], [320, 75000], [660, 150000], [1680, 370000], [3480, 740000]]) },
  { slug: "last-war-survival", name: "Last War: Survival", short: "LW", cat: "topup", publisher: "FirstFun", c1: "#64748b", c2: "#111827", fields: "userid",
    items: list("Diamonds", [[100, 15000], [500, 75000], [1000, 150000], [2000, 300000]]) },
  { slug: "asphalt-9", name: "Asphalt 9: Legends", short: "A9", cat: "topup", publisher: "Gameloft", c1: "#e11d48", c2: "#1f0710", fields: "userid",
    items: list("Tokens", [[100, 15000], [500, 75000], [1000, 150000], [2500, 350000]]) },
  { slug: "dragon-city", name: "Dragon City", short: "DC", cat: "topup", publisher: "Social Point", c1: "#f59e0b", c2: "#3a1f05", fields: "userid",
    items: list("Gems", [[120, 15000], [600, 75000], [1250, 150000], [3300, 375000]]) },

  // ---------------- PULSA ----------------
  ...[
    ["telkomsel", "Telkomsel", "TSEL", "#dc2626", "#2a0707"],
    ["indosat", "Indosat Ooredoo", "IM3", "#facc15", "#2a2203"],
    ["xl", "XL Axiata", "XL", "#2563eb", "#091a45"],
    ["axis", "AXIS", "AXIS", "#9333ea", "#1d0833"],
    ["tri", "Tri (3)", "3", "#c026d3", "#2a0630"],
    ["smartfren", "Smartfren", "SF", "#e11d48", "#2a0611"],
  ].map(([slug, name, short, c1, c2]) => ({
    slug: "pulsa-" + slug, name: "Pulsa " + name, short, cat: "pulsa", publisher: name, c1, c2, fields: "phone",
    items: [5000, 10000, 15000, 20000, 25000, 50000, 75000, 100000, 150000, 200000].map((n) => ({ name: `Pulsa ${n.toLocaleString("id-ID")}`, price: n + 1500 })),
  })),

  // ---------------- TOKEN ----------------
  { slug: "token-pln", name: "Token PLN", short: "PLN", cat: "token", publisher: "PLN", c1: "#0284c7", c2: "#061e30", fields: "meter", popular: false,
    items: [20000, 50000, 100000, 200000, 500000, 1000000].map((n) => ({ name: `Token ${n.toLocaleString("id-ID")}`, price: n + 2000 })) },
];

/* Gambar kartu = ikon game/operator di docs/assets/games/<slug>.jpg (600×600).
   Produk baru tanpa gambar: masukkan slug-nya ke NO_ICON supaya memakai kartu warna. */
const NO_ICON = ["league-of-legends-pc"]; // belum ada ikon resmi (game PC)
PRODUCTS.forEach((p) => { if (!p.img && !NO_ICON.includes(p.slug)) p.img = `assets/games/${p.slug}.jpg`; });

const PAYMENTS = [
  { id: "qris", name: "QRIS", note: "Semua e-wallet & m-banking", fee: 0.007 },
  { id: "dana", name: "DANA", note: "Bayar dengan saldo DANA", fee: 0.015 },
  { id: "ovo", name: "OVO", note: "Bayar dengan saldo OVO", fee: 0.015 },
  { id: "shopeepay", name: "ShopeePay", note: "Bayar dengan saldo ShopeePay", fee: 0.015 },
  { id: "gopay", name: "GoPay", note: "Bayar dengan saldo GoPay", fee: 0.015 },
];

/* Dipakai juga oleh server (Cloudflare Worker); di browser baris ini diabaikan */
if (typeof module !== "undefined") module.exports = { STORE, FIELDS, PRODUCTS, PAYMENTS, BANNERS };
