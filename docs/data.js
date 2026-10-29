/* =========================================================
   JEAN SHOP — DATA TOKO
   Edit file ini untuk mengubah nomor WA, produk, dan harga.
   Harga di bawah masih CONTOH, silakan ganti dengan harga jual Anda.
   ========================================================= */

const STORE = {
  name: "Jean Shop",
  domain: "",                     // isi setelah domain dibeli, mis. "jeanshop.com"
  wa: "6287868325296",            // nomor WhatsApp admin (format 62…)
  email: "ozinchannel29@gmail.com",
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
const BANNERS = [];

/* c1, c2 = warna kartu (dipakai kalau belum ada gambar).
   img = (opsional) gambar kartu, mis. "assets/games/mobile-legends.jpg".
   Ukuran gambar kartu: 600 × 900 px (rasio 2 : 3), JPG/WebP, idealnya < 150 KB.
   Gambar tampil penuh, jadi masukkan logo/nama game & "JEAN SHOP" di desain gambarnya. */
const PRODUCTS = [
  // ---------------- TOP UP GAME ----------------
  { slug: "mobile-legends", name: "Mobile Legends", short: "MLBB", cat: "topup", publisher: "Moonton", c1: "#1d4ed8", c2: "#0b1640", fields: "idzone", popular: true,
    items: list("Diamonds", [[5, 1500], [12, 3500], [28, 8000], [44, 12000], [86, 22000], [172, 44000], [257, 65000], [344, 87000], [429, 108000], [514, 129000], [706, 176000], [878, 218000], [1412, 350000], [2195, 540000]]).concat([{ name: "Weekly Diamond Pass", price: 27500 }, { name: "Twilight Pass", price: 145000 }]) },
  { slug: "free-fire", name: "Free Fire", short: "FF", cat: "topup", publisher: "Garena", c1: "#f97316", c2: "#3b0d0d", fields: "playerid", popular: true,
    items: list("Diamonds", [[5, 1000], [12, 2000], [50, 7500], [70, 10000], [140, 19500], [355, 48000], [720, 95000], [1450, 190000], [2180, 285000], [3640, 470000]]).concat([{ name: "Membership Mingguan", price: 28000 }, { name: "Membership Bulanan", price: 85000 }]) },
  { slug: "pubg-mobile", name: "PUBG Mobile", short: "PUBG", cat: "topup", publisher: "Tencent", c1: "#ca8a04", c2: "#2a1d05", fields: "playerid",
    items: list("UC", [[30, 7000], [60, 14000], [325, 70000], [660, 140000], [1800, 350000], [3850, 700000], [8100, 1400000]]) },
  { slug: "valorant", name: "Valorant", short: "VAL", cat: "topup", publisher: "Riot Games", c1: "#ef4444", c2: "#2b0a12", fields: "riot",
    items: list("VP", [[125, 15000], [420, 50000], [700, 80000], [1375, 150000], [2400, 260000], [4000, 420000], [8150, 840000]]) },
  { slug: "arena-breakout", name: "Arena Breakout", short: "AB", cat: "topup", publisher: "MoreFun Studios", c1: "#65a30d", c2: "#141f07", fields: "userid",
    items: list("Bonds", [[60, 15000], [310, 75000], [630, 150000], [1580, 370000], [3200, 740000]]) },
  { slug: "blood-strike", name: "Blood Strike", short: "BS", cat: "topup", publisher: "NetEase", c1: "#db2777", c2: "#2a0619", fields: "userid",
    items: list("Gold", [[100, 15000], [300, 45000], [500, 73000], [1000, 145000], [2000, 285000], [5000, 700000]]) },
  { slug: "call-of-duty-mobile", name: "Call of Duty Mobile", short: "CODM", cat: "topup", publisher: "Activision", c1: "#525252", c2: "#0d0d0d", fields: "userid",
    items: list("CP", [[31, 5000], [63, 10000], [128, 20000], [321, 50000], [645, 100000], [1373, 200000], [3564, 500000]]) },
  { slug: "genshin-impact", name: "Genshin Impact", short: "GI", cat: "topup", publisher: "HoYoverse", c1: "#7c3aed", c2: "#170a33", fields: "uidserver", popular: false,
    items: list("Genesis Crystals", [[60, 16000], [330, 79000], [1090, 249000], [2240, 479000], [3880, 799000], [8080, 1599000]]).concat([{ name: "Blessing of the Welkin Moon", price: 79000 }]) },
  { slug: "growtopia", name: "Growtopia", short: "GT", cat: "topup", publisher: "Ubisoft", c1: "#0ea5e9", c2: "#08243a", fields: "growid",
    items: list("World Lock", [[1, 3500], [10, 33000], [50, 160000], [100, 315000]]).concat(list("Diamond Lock", [[1, 330000]])) },
  { slug: "honor-of-kings", name: "Honor of Kings", short: "HOK", cat: "topup", publisher: "TiMi Studio", c1: "#d97706", c2: "#2a1402", fields: "userid",
    items: list("Tokens", [[16, 3000], [80, 15000], [240, 45000], [400, 75000], [560, 105000], [830, 150000], [1245, 225000], [2508, 450000]]) },
  { slug: "magic-chess-go-go", name: "Magic Chess Go Go", short: "MCGG", cat: "topup", publisher: "Moonton", c1: "#2563eb", c2: "#0d1a47", fields: "idzone",
    items: list("Diamonds", [[5, 1500], [12, 3500], [28, 8000], [86, 22000], [172, 44000], [344, 87000], [706, 176000]]) },
  { slug: "stumble-guys", name: "Stumble Guys", short: "SG", cat: "topup", publisher: "Scopely", c1: "#0891b2", c2: "#05263a", fields: "userid",
    items: list("Gems", [[200, 15000], [600, 40000], [1400, 90000], [3000, 180000], [8000, 450000]]) },
  { slug: "honkai-star-rail", name: "Honkai: Star Rail", short: "HSR", cat: "topup", publisher: "HoYoverse", c1: "#6366f1", c2: "#0f1238", fields: "uidserver",
    items: list("Oneiric Shards", [[60, 16000], [330, 79000], [1090, 249000], [2240, 479000], [3880, 799000], [8080, 1599000]]).concat([{ name: "Express Supply Pass", price: 79000 }]) },
  { slug: "roblox", name: "Roblox", short: "RBX", cat: "topup", publisher: "Roblox Corp.", c1: "#e11d48", c2: "#1f0710", fields: "username",
    items: list("Robux", [[80, 16000], [400, 75000], [800, 150000], [1700, 300000], [4500, 750000]]) },
  { slug: "point-blank", name: "Point Blank", short: "PB", cat: "topup", publisher: "Zepetto", c1: "#a16207", c2: "#211405", fields: "userid",
    items: list("PB Cash", [[1200, 10000], [2400, 20000], [6000, 50000], [12000, 100000], [36000, 300000]]) },
  { slug: "clash-of-clans", name: "Clash of Clans", short: "COC", cat: "topup", publisher: "Supercell", c1: "#16a34a", c2: "#06210f", fields: "email",
    items: list("Gems", [[80, 16000], [500, 79000], [1200, 159000], [2500, 319000], [6500, 799000]]).concat([{ name: "Gold Pass", price: 79000 }]) },
  { slug: "zenless-zone-zero", name: "Zenless Zone Zero", short: "ZZZ", cat: "topup", publisher: "HoYoverse", c1: "#eab308", c2: "#1f1a05", fields: "uidserver",
    items: list("Monochrome", [[60, 16000], [330, 79000], [1090, 249000], [2240, 479000], [3880, 799000], [8080, 1599000]]) },
  { slug: "delta-force", name: "Delta Force", short: "DF", cat: "topup", publisher: "TiMi Studio", c1: "#059669", c2: "#05201a", fields: "userid",
    items: list("Delta Coins", [[60, 15000], [320, 75000], [660, 150000], [1680, 370000], [3480, 740000]]) },
  { slug: "wuthering-waves", name: "Wuthering Waves", short: "WuWa", cat: "topup", publisher: "Kuro Games", c1: "#14b8a6", c2: "#062421", fields: "uidserver",
    items: list("Lunite", [[60, 16000], [300, 79000], [980, 249000], [1980, 479000], [3280, 799000], [6480, 1599000]]) },
  { slug: "efootball", name: "eFootball", short: "eFB", cat: "topup", publisher: "Konami", c1: "#1e40af", c2: "#08123a", fields: "userid",
    items: list("Coins", [[130, 15000], [300, 33000], [550, 59000], [1040, 109000], [3130, 319000]]) },
  { slug: "sausage-man", name: "Sausage Man", short: "SM", cat: "topup", publisher: "XD Inc.", c1: "#f59e0b", c2: "#2a1803", fields: "userid",
    items: list("Candy", [[60, 15000], [180, 45000], [300, 73000], [680, 160000], [1280, 300000]]) },
  { slug: "super-sus", name: "Super Sus", short: "SUS", cat: "topup", publisher: "Pinkcore", c1: "#a855f7", c2: "#1e0a33", fields: "userid",
    items: list("Goldstar", [[100, 15000], [310, 45000], [520, 73000], [1060, 145000], [2180, 290000]]) },

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

const PAYMENTS = [
  { id: "qris", name: "QRIS", note: "Semua e-wallet & m-banking", fee: 0.007 },
  { id: "dana", name: "DANA", note: "Bayar dengan saldo DANA", fee: 0.015 },
  { id: "ovo", name: "OVO", note: "Bayar dengan saldo OVO", fee: 0.015 },
  { id: "shopeepay", name: "ShopeePay", note: "Bayar dengan saldo ShopeePay", fee: 0.015 },
  { id: "gopay", name: "GoPay", note: "Bayar dengan saldo GoPay", fee: 0.015 },
];

/* Dipakai juga oleh server (Cloudflare Worker); di browser baris ini diabaikan */
if (typeof module !== "undefined") module.exports = { STORE, FIELDS, PRODUCTS, PAYMENTS, BANNERS };
