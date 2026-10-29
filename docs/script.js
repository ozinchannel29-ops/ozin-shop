/* Ozin Shop — tampilan & alur pemesanan (tanpa backend: pesanan dikirim lewat WhatsApp) */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const app = $("#app");
  const rupiah = (n) => "Rp " + Math.round(n).toLocaleString("id-ID");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const waLink = (text = "") => `https://wa.me/${STORE.wa}${text ? "?text=" + encodeURIComponent(text) : ""}`;
  const bySlug = (slug) => PRODUCTS.find((p) => p.slug === slug);
  const CATS = [
    { id: "topup", label: "Top Up" },
    { id: "pulsa", label: "Pulsa" },
    { id: "token", label: "Token" },
  ];

  /* ---------- penyimpanan transaksi di perangkat ---------- */
  /* ---------- API server (null = mode WA manual, mis. di GitHub Pages) ---------- */
  let API = null;
  let pollTimer;
  async function api(path, { method = "GET", body } = {}) {
    const res = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || "Gagal terhubung ke server"), { status: res.status });
    return data;
  }

  const TX_KEY = "ozinshop_tx";
  const loadTx = () => { try { return JSON.parse(localStorage.getItem(TX_KEY)) || []; } catch { return []; } };
  const saveTx = (list) => { try { localStorage.setItem(TX_KEY, JSON.stringify(list.slice(0, 50))); } catch {} };
  const newInvoice = () => {
    const d = new Date();
    const ymd = [d.getFullYear() % 100, d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, "0")).join("");
    const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `OZN${ymd}${rnd}`;
  };

  /* ---------- komponen ---------- */
  const cover = (p, cls = "") => `
    <div class="cover ${cls}" style="--c1:${p.c1};--c2:${p.c2}">
      ${p.img ? `<img src="${p.img}" alt="" loading="lazy" />` : `<span class="cover-mark">${esc(p.short)}</span>`}
    </div>`;

  /* Kartu bergambar: gambar tampil penuh (nama & logo game sudah ada di desain gambarnya) */
  const card = (p) => p.img ? `
    <a class="game-card has-img" href="#/topup/${p.slug}" aria-label="${esc(p.name)}">
      <img class="gc-img" src="${p.img}" alt="${esc(p.name)}" loading="lazy" />
    </a>` : `
    <a class="game-card" href="#/topup/${p.slug}" style="--c1:${p.c1};--c2:${p.c2}">
      <span class="gc-badge"><b>OZIN SHOP</b><small>TOP UP GAME</small></span>
      <span class="gc-mark">${esc(p.short)}</span>
      <span class="gc-name">${esc(p.name)}</span>
      <span class="gc-foot">${esc(p.publisher)}</span>
    </a>`;

  const hero = () => BANNERS.length ? `
    <section class="hero" data-slider>
      <div class="hero-track">
        ${BANNERS.map((b) => {
          const img = `<img src="${b.img}" alt="${esc(b.alt || STORE.name)}" />`;
          return b.link ? `<a class="slide img-slide" href="${b.link}">${img}</a>` : `<div class="slide img-slide">${img}</div>`;
        }).join("")}
      </div>
      <div class="hero-dots"></div>
    </section>` : `
    <section class="hero" data-slider>
      <div class="hero-track">
        <div class="slide s1">
          <span class="pill-logo">OZIN SHOP<small>TOP UP GAME</small></span>
          <h1><span class="welcome">WELCOME TO</span><span class="big">OZIN SHOP</span></h1>
          <p class="ribbon">${esc(STORE.tagline)}</p>
        </div>
        <div class="slide s2">
          <span class="pill-logo">PROMO HARI INI</span>
          <h2><span class="welcome">DIAMOND MLBB</span><span class="big">MULAI ${rupiah(1500)}</span></h2>
          <a class="ribbon" href="#/topup/mobile-legends">Top up sekarang →</a>
        </div>
        <div class="slide s3">
          <span class="pill-logo">BAYAR GAMPANG</span>
          <h2><span class="welcome">SEMUA E-WALLET</span><span class="big">PAKAI QRIS</span></h2>
          <p class="ribbon">DANA • OVO • ShopeePay • GoPay • m-Banking</p>
        </div>
      </div>
      <div class="hero-dots"></div>
    </section>`;

  const popular = () => {
    const tiles = [
      { href: "#/topup/free-fire", p: bySlug("free-fire"), title: "Free Fire", sub: "Top Up Game" },
      { href: "#/topup/mobile-legends", p: bySlug("mobile-legends"), title: "Mobile Legends", sub: "Top Up Game" },
      { href: "#/stok-akun", p: { short: "STOK", c1: "#c22a35", c2: "#2a0709" }, title: "Stok Akun", sub: "Beli akun game" },
      { href: waLink("Halo admin Ozin Shop, saya mau jual akun game."), ext: true, p: { short: "JUAL", c1: "#e0602b", c2: "#2a0d05" }, title: "Jual Akun", sub: "Hubungi admin jual akun via WhatsApp" },
    ];
    return `
      <section class="section">
        <h3 class="sec-title"><span class="fire">🔥</span> POPULER SEKARANG</h3>
        <p class="sec-sub">Berikut adalah beberapa produk yang paling sering dipilih.</p>
        <div class="popular">
          ${tiles.map((t) => `
            <a class="pop-card" href="${t.href}" ${t.ext ? 'target="_blank" rel="noopener"' : ""}>
              ${cover(t.p, "pop-cover")}
              <span><b>${esc(t.title)}</b><small>${esc(t.sub)}</small></span>
            </a>`).join("")}
        </div>
      </section>`;
  };

  /* ---------- halaman ---------- */
  const state = { cat: "topup", expanded: false };

  function pageHome() {
    app.innerHTML = `
      ${hero()}
      ${popular()}
      <section class="section">
        <div class="tabs" role="tablist">
          ${CATS.map((c) => `<button role="tab" class="tab ${state.cat === c.id ? "active" : ""}" data-cat="${c.id}">${c.label}</button>`).join("")}
        </div>
        <div class="grid" id="grid"></div>
        <div class="more-wrap"><button class="btn-more" id="moreBtn">Tampilkan Lainnya...</button></div>
      </section>`;
    renderGrid();
    initSlider($("[data-slider]"));
    $$(".tab").forEach((b) => b.addEventListener("click", () => {
      state.cat = b.dataset.cat; state.expanded = false;
      $$(".tab").forEach((x) => x.classList.toggle("active", x === b));
      renderGrid();
    }));
    $("#moreBtn").addEventListener("click", () => { state.expanded = true; renderGrid(); });
  }

  function renderGrid() {
    const items = PRODUCTS.filter((p) => p.cat === state.cat);
    const LIMIT = 12;
    const shown = state.expanded ? items : items.slice(0, LIMIT);
    $("#grid").innerHTML = shown.map(card).join("");
    $("#moreBtn").parentElement.hidden = state.expanded || items.length <= LIMIT;
  }

  function pageProduct(slug) {
    const p = bySlug(slug);
    if (!p) return pageNotFound();
    const fields = FIELDS[p.fields] || FIELDS.userid;
    const order = { item: null, pay: null };
    const auto = !!API;
    // Nominal & metode bayar: dari server (VIPayment + Tripay) atau dari data.js (mode WA manual)
    let items = auto ? [] : p.items.map((it) => ({ ...it, available: true }));
    const pays = auto ? API.payments : PAYMENTS.map((m) => ({ code: m.id, name: m.name, group: m.note, fee_flat: 0, fee_percent: m.fee * 100 }));
    const feeOf = (m, price) => Math.ceil(m.fee_flat + (price * m.fee_percent) / 100);
    const PAY_CLASS = { qris: "qris", dana: "dana", ovo: "ovo", shopeepay: "spay", gopay: "gopay" };

    app.innerHTML = `
      <nav class="crumbs"><a href="#/">Beranda</a> / <a href="#/" data-gocat="${p.cat}">${CATS.find((c) => c.id === p.cat).label}</a> / <span>${esc(p.name)}</span></nav>
      <div class="product">
        <aside class="p-side">
          <div class="p-head" style="--c1:${p.c1};--c2:${p.c2}">
            ${cover(p, "p-cover")}
            <div>
              <h1>${esc(p.name)}</h1>
              <p>${esc(p.publisher)}</p>
              <div class="chips"><span>⚡ Proses cepat</span><span>🛡️ Aman</span><span>💬 CS 24 jam</span></div>
            </div>
          </div>
          <div class="panel howto">
            <h4>Cara Top Up</h4>
            <ol>
              <li>Masukkan data akun ${esc(p.name)} kamu.</li>
              <li>Pilih nominal yang diinginkan.</li>
              <li>Pilih metode pembayaran.</li>
              <li>Isi nomor WhatsApp, lalu klik <b>Pesan Sekarang</b>.</li>
              <li>Selesaikan pembayaran, pesanan diproses dan masuk ke akunmu.</li>
            </ol>
          </div>
        </aside>

        <form class="p-main" id="orderForm" novalidate>
          <div class="panel step">
            <h3><span class="num">1</span> Masukkan Data Akun</h3>
            <div class="field-row">
              ${fields.map((f) => `
                <label class="field ${f.small ? "small" : ""}">
                  <span>${esc(f.label)}</span>
                  ${f.type === "select"
                    ? `<select name="${f.key}" required><option value="">Pilih ${esc(f.label)}</option>${f.options.map((o) => `<option>${esc(o)}</option>`).join("")}</select>`
                    : `<input name="${f.key}" type="${f.type === "number" ? "text" : f.type}" ${f.type === "number" ? 'inputmode="numeric" pattern="[0-9]*"' : ""} placeholder="${esc(f.placeholder)}" required />`}
                </label>`).join("")}
            </div>
            <p class="nick" id="nick" hidden></p>
            <p class="hint">Pastikan data yang dimasukkan sudah benar. Kesalahan input bukan tanggung jawab kami.</p>
          </div>

          <div class="panel step">
            <h3><span class="num">2</span> Pilih Nominal</h3>
            <div class="items" id="items"></div>
          </div>

          <div class="panel step">
            <h3><span class="num">3</span> Pilih Pembayaran</h3>
            <div class="pays">
              ${pays.map((m) => `
                <button type="button" class="pay-opt" data-pay="${esc(m.code)}">
                  ${m.icon ? `<img class="pay-icon" src="${esc(m.icon)}" alt="${esc(m.name)}" loading="lazy" />` : `<span class="pay ${PAY_CLASS[m.code.toLowerCase()] || ""}">${esc(m.name)}</span>`}
                  <small>${esc(m.icon ? m.name : m.group || "")}</small>
                  <b class="pay-price">—</b>
                </button>`).join("")}
            </div>
          </div>

          <div class="panel step">
            <h3><span class="num">4</span> Detail Kontak</h3>
            <label class="field">
              <span>Nomor WhatsApp</span>
              <input name="wa" type="tel" inputmode="tel" placeholder="08xxxxxxxxxx" required />
            </label>
            <p class="hint">Bukti & status transaksi akan dikirim ke nomor ini.</p>
          </div>

          <div class="panel summary">
            <div>
              <small>Total Pembayaran</small>
              <b id="sumTotal">${rupiah(0)}</b>
              <span id="sumItem">Belum memilih nominal</span>
            </div>
            <button class="btn-primary" type="submit">Pesan Sekarang</button>
          </div>
        </form>
      </div>`;

    const form = $("#orderForm");
    const total = () => (order.item ? order.item.price + (order.pay ? feeOf(order.pay, order.item.price) : 0) : 0);
    const refresh = () => {
      $$(".pay-opt").forEach((b) => {
        const m = pays.find((x) => x.code === b.dataset.pay);
        $(".pay-price", b).textContent = order.item ? rupiah(order.item.price + feeOf(m, order.item.price)) : "—";
      });
      $("#sumTotal").textContent = rupiah(total());
      $("#sumItem").textContent = order.item ? `${order.item.name}${order.pay ? " • " + order.pay.name : ""}` : "Belum memilih nominal";
    };
    const renderItems = () => {
      $("#items").innerHTML = items.length
        ? items.map((it, i) => `
          <button type="button" class="item" data-item="${i}" ${it.available ? "" : "disabled"}>
            <b>${esc(it.name)}</b>
            <span>${it.available ? rupiah(it.price) : "Stok habis"}</span>
          </button>`).join("")
        : `<p class="hint">Nominal belum tersedia. Silakan hubungi admin.</p>`;
    };
    $("#items").addEventListener("click", (e) => {
      const b = e.target.closest(".item");
      if (!b || b.disabled) return;
      order.item = items[+b.dataset.item];
      $$(".item").forEach((x) => x.classList.toggle("active", x === b));
      refresh();
    });
    $$(".pay-opt").forEach((b) => b.addEventListener("click", () => {
      order.pay = pays.find((x) => x.code === b.dataset.pay);
      $$(".pay-opt").forEach((x) => x.classList.toggle("active", x === b));
      refresh();
    }));
    $$("[data-gocat]").forEach((a) => a.addEventListener("click", () => { state.cat = a.dataset.gocat; }));

    if (auto) {
      $("#items").innerHTML = `<p class="hint">Memuat nominal…</p>`;
      api(`/api/products/${p.slug}`)
        .then((r) => { items = r.items; renderItems(); })
        .catch((e) => { $("#items").innerHTML = `<p class="hint">${esc(e.message)}</p>`; });

      // Cek nickname otomatis setelah semua data akun terisi
      let nickTimer;
      const nick = $("#nick");
      form.addEventListener("input", (e) => {
        if (!fields.some((f) => f.key === e.target.name)) return;
        clearTimeout(nickTimer);
        nick.hidden = true;
        const data = Object.fromEntries(new FormData(form));
        if (fields.some((f) => !String(data[f.key] || "").trim())) return;
        nickTimer = setTimeout(() => {
          const qs = new URLSearchParams({ slug: p.slug, ...Object.fromEntries(fields.map((f) => [f.key, data[f.key].trim()])) });
          api(`/api/nickname?${qs}`)
            .then((r) => { nick.className = "nick ok"; nick.textContent = `✓ Nickname: ${r.nickname}`; nick.hidden = false; })
            .catch((err) => { if (err.status === 400 && /tidak tersedia/.test(err.message)) return; nick.className = "nick err"; nick.textContent = err.message; nick.hidden = false; });
        }, 700);
      });
    } else {
      renderItems();
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      const missing = fields.find((f) => !String(data[f.key] || "").trim());
      if (missing) return toast(`${missing.label} belum diisi`), form.elements[missing.key].focus();
      if (!order.item) return toast("Pilih nominal terlebih dahulu");
      if (!order.pay) return toast("Pilih metode pembayaran");
      const wa = String(data.wa || "").replace(/\D/g, "");
      if (wa.length < 10) return toast("Nomor WhatsApp belum valid"), form.elements.wa.focus();

      const account = fields.map((f) => `${f.label}: ${String(data[f.key]).trim()}`);
      openModal(`
        <h3 id="modalTitle">Konfirmasi Pesanan</h3>
        <dl class="kv">
          <dt>Produk</dt><dd>${esc(p.name)}</dd>
          ${fields.map((f) => `<dt>${esc(f.label)}</dt><dd>${esc(String(data[f.key]).trim())}</dd>`).join("")}
          <dt>Nominal</dt><dd>${esc(order.item.name)}</dd>
          <dt>Pembayaran</dt><dd>${esc(order.pay.name)}</dd>
          <dt>WhatsApp</dt><dd>${esc(wa)}</dd>
          <dt class="tot">Total</dt><dd class="tot">${rupiah(total())}</dd>
        </dl>
        <p class="hint">${auto
          ? "Kamu akan diarahkan ke halaman pembayaran. Setelah lunas, pesanan diproses otomatis."
          : "Setelah klik tombol di bawah, kamu akan diarahkan ke WhatsApp admin untuk menerima instruksi pembayaran."}</p>
        <button class="btn-primary block" id="confirmBtn">${auto ? "Lanjut ke Pembayaran" : "Lanjut ke WhatsApp"}</button>`);

      $("#confirmBtn").addEventListener("click", async (ev) => {
        if (auto) {
          const btn = ev.currentTarget;
          btn.disabled = true; btn.textContent = "Membuat tagihan…";
          try {
            const r = await api("/api/order", {
              method: "POST",
              body: { slug: p.slug, code: order.item.code, method: order.pay.code, wa, fields: Object.fromEntries(fields.map((f) => [f.key, String(data[f.key]).trim()])) },
            });
            saveTx([{ inv: r.inv, product: p.name, item: order.item.name, total: total(), date: new Date().toISOString(), auto: true }, ...loadTx()]);
            location.href = r.pay_url;
          } catch (err) {
            toast(err.message);
            btn.disabled = false; btn.textContent = "Lanjut ke Pembayaran";
          }
          return;
        }
        const tx = {
          inv: newInvoice(), product: p.name, account, item: order.item.name, pay: order.pay.name,
          total: total(), wa, date: new Date().toISOString(), status: "Menunggu Pembayaran",
        };
        saveTx([tx, ...loadTx()]);
        const msg = [
          `Halo admin ${STORE.name}, saya mau order:`, "",
          `No. Invoice: ${tx.inv}`, `Produk: ${tx.product}`, ...account,
          `Nominal: ${tx.item}`, `Pembayaran: ${tx.pay}`, `Total: ${rupiah(tx.total)}`, `No. WA: ${wa}`,
        ].join("\n");
        window.open(waLink(msg), "_blank", "noopener");
        openModal(`
          <div class="success">
            <div class="check">✓</div>
            <h3 id="modalTitle">Pesanan Dibuat</h3>
            <p>Simpan nomor invoice kamu:</p>
            <div class="inv">${tx.inv}</div>
            <p class="hint">Jika WhatsApp tidak terbuka otomatis, <a href="${waLink(msg)}" target="_blank" rel="noopener">klik di sini</a>.</p>
            <a class="btn-primary block" href="#/cek-transaksi?inv=${tx.inv}" data-close>Cek Transaksi</a>
          </div>`);
      });
    });
  }

  function pageAccounts() {
    app.innerHTML = `
      <section class="section page-head">
        <h1 class="page-title">Stok Akun</h1>
        <p class="sec-sub">Akun game siap pakai. Klik <b>Beli via WhatsApp</b> untuk menanyakan & membeli.</p>
      </section>
      ${ACCOUNTS.length ? `
      <div class="acc-grid">
        ${ACCOUNTS.map((a) => `
          <article class="panel acc">
            ${a.sample ? '<span class="tag-sample">CONTOH</span>' : ""}
            <small class="acc-game">${esc(a.game)}</small>
            <h3>${esc(a.title)}</h3>
            <ul>${a.details.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>
            <div class="acc-foot">
              <b>${rupiah(a.price)}</b>
              <a class="btn-primary sm" target="_blank" rel="noopener" href="${waLink(`Halo admin ${STORE.name}, saya mau beli akun ${a.id} (${a.game} – ${a.title}). Masih tersedia?`)}">Beli via WhatsApp</a>
            </div>
          </article>`).join("")}
      </div>` : `<div class="panel empty">Stok akun sedang kosong. Hubungi admin untuk info stok terbaru.</div>`}
      <div class="panel cta-sell">
        <div><h3>Mau jual akun game?</h3><p>Kirim detail akunmu ke admin, kami bantu jualkan dengan aman.</p></div>
        <a class="btn-primary" target="_blank" rel="noopener" href="${waLink(`Halo admin ${STORE.name}, saya mau jual akun game.`)}">Jual Akun</a>
      </div>`;
  }

  function pageCheck(params) {
    const initial = params.get("inv") || "";
    app.innerHTML = `
      <section class="section page-head">
        <h1 class="page-title">Cek Transaksi</h1>
        <p class="sec-sub">Masukkan nomor invoice untuk melihat detail pesananmu.</p>
      </section>
      <form class="panel check-form" id="checkForm">
        <input name="inv" placeholder="Contoh: OZN261030K7QX2M9A" value="${esc(initial)}" autocomplete="off" />
        <button class="btn-primary" type="submit">Cari</button>
      </form>
      <div id="checkResult"></div>
      <section class="section">
        <h3 class="sec-title">Riwayat di perangkat ini</h3>
        <div id="history"></div>
      </section>`;

    const askAdmin = (inv) => waLink(`Halo admin ${STORE.name}, saya mau cek status pesanan ${inv}.`);
    const STATUS_CLASS = { UNPAID: "wait", PAID: "proc", PROCESSING: "proc", SUCCESS: "ok", FAILED: "bad", EXPIRED: "bad" };

    // Mode otomatis: status diambil dari server dan diperbarui tiap 5 detik selama belum selesai
    const showAuto = async (inv) => {
      clearTimeout(pollTimer);
      const box = $("#checkResult");
      if (!box) return;
      try {
        const o = await api(`/api/status/${encodeURIComponent(inv)}`);
        if (!$("#checkResult")) return;
        box.innerHTML = `
          <div class="panel tx">
            <div class="tx-head"><b>${esc(o.inv)}</b><span class="status ${STATUS_CLASS[o.status] || ""}">${esc(o.status_label)}</span></div>
            <dl class="kv">
              <dt>Tanggal</dt><dd>${new Date(o.created_at).toLocaleString("id-ID")}</dd>
              <dt>Produk</dt><dd>${esc(o.product)}</dd>
              <dt>Tujuan</dt><dd>${esc(o.target)}${o.zone ? ` (${esc(o.zone)})` : ""}</dd>
              <dt>Nominal</dt><dd>${esc(o.item)}</dd>
              <dt>Pembayaran</dt><dd>${esc(o.method)}</dd>
              ${o.note ? `<dt>Keterangan</dt><dd>${esc(o.note)}</dd>` : ""}
              <dt class="tot">Total</dt><dd class="tot">${rupiah(o.amount)}</dd>
            </dl>
            <div class="tx-actions">
              ${o.pay_url ? `<a class="btn-primary sm" href="${esc(o.pay_url)}">Bayar Sekarang</a>` : ""}
              <a class="btn-primary sm ghost" target="_blank" rel="noopener" href="${askAdmin(o.inv)}">Hubungi admin</a>
            </div>
          </div>`;
        if (["UNPAID", "PAID", "PROCESSING"].includes(o.status)) pollTimer = setTimeout(() => showAuto(inv), 5000);
      } catch (err) {
        box.innerHTML = `<div class="panel empty">${esc(err.message)}. <a target="_blank" rel="noopener" href="${askAdmin(inv)}">Tanyakan ke admin via WhatsApp</a>.</div>`;
      }
    };

    const show = (inv) => {
      inv = inv.trim().toUpperCase();
      const box = $("#checkResult");
      if (!inv) { box.innerHTML = ""; return; }
      if (API) return showAuto(inv);
      const tx = loadTx().find((t) => t.inv === inv);
      box.innerHTML = tx ? `
        <div class="panel tx">
          <div class="tx-head"><b>${esc(tx.inv)}</b><span class="status">${esc(tx.status)}</span></div>
          <dl class="kv">
            <dt>Tanggal</dt><dd>${new Date(tx.date).toLocaleString("id-ID")}</dd>
            <dt>Produk</dt><dd>${esc(tx.product)}</dd>
            ${tx.account.map((a) => { const [k, ...v] = a.split(": "); return `<dt>${esc(k)}</dt><dd>${esc(v.join(": "))}</dd>`; }).join("")}
            <dt>Nominal</dt><dd>${esc(tx.item)}</dd>
            <dt>Pembayaran</dt><dd>${esc(tx.pay)}</dd>
            <dt class="tot">Total</dt><dd class="tot">${rupiah(tx.total)}</dd>
          </dl>
          <a class="btn-primary sm" target="_blank" rel="noopener" href="${waLink(`Halo admin ${STORE.name}, saya mau cek status pesanan ${tx.inv}.`)}">Tanya status ke admin</a>
        </div>` : `
        <div class="panel empty">Invoice <b>${esc(inv)}</b> tidak ditemukan di perangkat ini.
          <a target="_blank" rel="noopener" href="${waLink(`Halo admin ${STORE.name}, saya mau cek status pesanan ${inv}.`)}">Tanyakan ke admin via WhatsApp</a>.</div>`;
    };

    const hist = loadTx();
    $("#history").innerHTML = hist.length
      ? `<div class="hist">${hist.map((t) => `
          <button class="panel hist-item" data-inv="${esc(t.inv)}">
            <span><b>${esc(t.inv)}</b><small>${esc(t.product)} • ${esc(t.item)}</small></span>
            <span class="hist-right"><b>${rupiah(t.total)}</b><small>${esc(t.status || "Lihat status")}</small></span>
          </button>`).join("")}</div>`
      : `<p class="sec-sub">Belum ada transaksi.</p>`;
    $$(".hist-item").forEach((b) => b.addEventListener("click", () => { $("#checkForm").inv.value = b.dataset.inv; show(b.dataset.inv); }));
    $("#checkForm").addEventListener("submit", (e) => { e.preventDefault(); show(e.target.inv.value); });
    show(initial);
  }

  const LEGAL = {
    "kebijakan-privasi": ["Kebijakan Privasi", [
      ["Data yang kami kumpulkan", "Kami hanya meminta data yang diperlukan untuk memproses pesanan: ID/akun game, nomor tujuan, dan nomor WhatsApp."],
      ["Penggunaan data", "Data digunakan untuk memproses transaksi, mengirim bukti pembayaran, dan layanan pelanggan. Kami tidak menjual data kepada pihak lain."],
      ["Penyimpanan", "Riwayat transaksi di halaman Cek Transaksi disimpan di perangkatmu sendiri (browser) dan dapat dihapus kapan saja dengan membersihkan data situs."],
      ["Kontak", `Pertanyaan seputar privasi dapat dikirim ke ${STORE.email}.`],
    ]],
    "syarat-ketentuan": ["Syarat & Ketentuan", [
      ["Pemesanan", "Pembeli wajib memastikan data akun/nomor tujuan sudah benar. Kesalahan input oleh pembeli bukan tanggung jawab Ozin Shop."],
      ["Pembayaran", "Pesanan diproses setelah pembayaran terkonfirmasi. Nominal transfer harus sesuai dengan total yang tertera."],
      ["Proses", "Sebagian besar pesanan selesai dalam hitungan menit. Pada kondisi tertentu (gangguan server game/provider) proses dapat lebih lama."],
      ["Refund", "Refund hanya diberikan jika pesanan gagal diproses dari pihak kami, dikembalikan sesuai nominal yang dibayarkan."],
      ["Jual beli akun", "Akun yang sudah diserahterimakan menjadi tanggung jawab pembeli. Segera ganti data login setelah menerima akun."],
    ]],
  };

  function pageLegal(key) {
    const [title, items] = LEGAL[key];
    app.innerHTML = `
      <section class="section page-head"><h1 class="page-title">${title}</h1></section>
      <div class="panel legal">${items.map(([h, t]) => `<h3>${esc(h)}</h3><p>${esc(t)}</p>`).join("")}</div>`;
  }

  function pageNotFound() {
    app.innerHTML = `<div class="panel empty nf"><h1 class="page-title">404</h1><p>Halaman tidak ditemukan.</p><a class="btn-primary" href="#/">Kembali ke Beranda</a></div>`;
  }

  /* ---------- router ---------- */
  function route() {
    const [path, qs] = (location.hash.slice(1) || "/").split("?");
    const params = new URLSearchParams(qs || "");
    const parts = path.split("/").filter(Boolean);
    const nav = parts[0] === "stok-akun" || parts[0] === "cek-transaksi" ? parts[0] : !parts[0] || parts[0] === "topup" ? "home" : "";
    $$("[data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === nav));
    document.body.dataset.page = parts[0] || "home";
    closeModal();
    stopSlider();
    clearTimeout(pollTimer);

    if (!parts.length) pageHome();
    else if (parts[0] === "topup" && parts[1]) pageProduct(parts[1]);
    else if (parts[0] === "stok-akun") pageAccounts();
    else if (parts[0] === "cek-transaksi") pageCheck(params);
    else if (LEGAL[parts[0]]) pageLegal(parts[0]);
    else pageNotFound();

    const p = parts[0] === "topup" && bySlug(parts[1]);
    document.title = p ? `Top Up ${p.name} Murah | Ozin Shop` : "Ozin Shop | Top Up Game, Pulsa & Token PLN Murah";
    window.scrollTo({ top: 0 });
  }

  /* ---------- slider banner ---------- */
  let sliderTimer;
  const stopSlider = () => clearInterval(sliderTimer);
  function initSlider(el) {
    const track = $(".hero-track", el);
    const slides = $$(".slide", el);
    const dots = $(".hero-dots", el);
    let i = 0;
    dots.innerHTML = slides.map((_, n) => `<button aria-label="Banner ${n + 1}"></button>`).join("");
    const go = (n) => {
      i = (n + slides.length) % slides.length;
      track.style.transform = `translateX(-${i * 100}%)`;
      $$("button", dots).forEach((d, k) => d.classList.toggle("active", k === i));
    };
    const start = () => { stopSlider(); sliderTimer = setInterval(() => go(i + 1), 5000); };
    $$("button", dots).forEach((d, k) => d.addEventListener("click", () => { go(k); start(); }));
    let x0 = null;
    el.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    el.addEventListener("touchend", (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) { go(i + (dx < 0 ? 1 : -1)); start(); }
      x0 = null;
    });
    go(0);
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) start();
  }

  /* ---------- pencarian ---------- */
  const sInput = $("#searchInput");
  const sBox = $("#searchResults");
  sInput.addEventListener("input", () => {
    const q = sInput.value.trim().toLowerCase();
    if (!q) { sBox.hidden = true; return; }
    const hits = PRODUCTS.filter((p) => (p.name + " " + p.short + " " + p.publisher).toLowerCase().includes(q)).slice(0, 8);
    sBox.innerHTML = hits.length
      ? hits.map((p) => `<a href="#/topup/${p.slug}">${cover(p, "s-cover")}<span><b>${esc(p.name)}</b><small>${esc(p.publisher)}</small></span></a>`).join("")
      : `<p class="s-empty">Produk tidak ditemukan</p>`;
    sBox.hidden = false;
  });
  sBox.addEventListener("click", (e) => { if (e.target.closest("a")) { sInput.value = ""; sBox.hidden = true; $("#search").classList.remove("open"); } });
  document.addEventListener("click", (e) => { if (!e.target.closest("#search") && !e.target.closest("#searchToggle")) sBox.hidden = true; });
  $("#searchToggle").addEventListener("click", () => { $("#search").classList.toggle("open"); sInput.focus(); });

  /* ---------- modal & toast ---------- */
  const modal = $("#modal");
  function openModal(html) { $("#modalBody").innerHTML = html; modal.hidden = false; document.body.style.overflow = "hidden"; }
  function closeModal() { modal.hidden = true; document.body.style.overflow = ""; }
  modal.addEventListener("click", (e) => { if (e.target === modal || e.target.closest("[data-close]")) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }

  /* ---------- init ---------- */
  $$("[data-wa]").forEach((a) => { a.href = waLink(`Halo admin ${STORE.name}, saya butuh bantuan.`); a.target = "_blank"; a.rel = "noopener"; });
  $("#mailLink").href = `mailto:${STORE.email}`;
  $("#year").textContent = new Date().getFullYear();
  window.addEventListener("hashchange", route);
  // Cek apakah server API tersedia; kalau tidak (mis. GitHub Pages), situs tetap jalan dengan pemesanan via WA
  const ctl = new AbortController();
  setTimeout(() => ctl.abort(), 4000);
  fetch("/api/config", { signal: ctl.signal })
    .then((r) => (r.ok ? r.json() : null))
    .then((c) => { if (c && c.auto) API = c; })
    .catch(() => {})
    .finally(() => {
      if (API && (API.simulation.supplier || API.simulation.payment)) document.body.insertAdjacentHTML("afterbegin",
        `<div class="sim-bar">MODE SIMULASI – ${API.simulation.supplier ? "supplier" : ""}${API.simulation.supplier && API.simulation.payment ? " & " : ""}${API.simulation.payment ? "pembayaran" : ""} belum tersambung, tidak ada transaksi sungguhan</div>`);
      route();
    });
})();
