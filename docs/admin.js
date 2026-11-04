/* Jean Shop — halaman admin: login, ringkasan, daftar pesanan & aksi */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const rupiah = (n) => "Rp " + Math.round(n || 0).toLocaleString("id-ID");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const fmtDate = (t) => new Date(t).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  const TABS = [
    ["", "Semua"], ["ATTENTION", "Perlu Tindakan"], ["UNPAID", "Menunggu Bayar"], ["PROCESSING", "Diproses"],
    ["SUCCESS", "Berhasil"], ["FAILED", "Gagal"], ["EXPIRED", "Kedaluwarsa"], ["REFUNDED", "Refund"],
  ];
  const STATUS_CLASS = { UNPAID: "wait", PAID: "proc", PROCESSING: "proc", SUCCESS: "ok", FAILED: "bad", EXPIRED: "bad", REFUNDED: "ref" };
  const state = { status: "", q: "", page: 1, attention: 0 };

  /* ---------- sesi ---------- */
  const KEY = "jeanshop_admin";
  const getToken = () => { try { const s = JSON.parse(sessionStorage.getItem(KEY)); return s && s.exp > Date.now() ? s.token : ""; } catch { return ""; } };
  const setToken = (s) => { try { s ? sessionStorage.setItem(KEY, JSON.stringify(s)) : sessionStorage.removeItem(KEY); } catch {} };

  async function api(path, { method = "GET", body } = {}) {
    const res = await fetch(path, {
      method,
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), Authorization: `Bearer ${getToken()}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && !path.endsWith("/login")) { setToken(null); showLogin(data.error); throw new Error(data.error); }
    if (!res.ok) throw new Error(data.error || "Server admin tidak tersedia");
    return data;
  }

  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }

  /* ---------- tampilan ---------- */
  function showLogin(msg) {
    clearInterval(refreshTimer);
    $("#dashView").hidden = true;
    $("#logoutBtn").hidden = true;
    $("#loginView").hidden = false;
    const err = $("#loginError");
    err.hidden = !msg; err.textContent = msg || "";
    $("#loginForm").password.focus();
  }

  function showDash() {
    $("#loginView").hidden = true;
    $("#dashView").hidden = false;
    $("#logoutBtn").hidden = false;
    renderTabs();
    refresh();
    clearInterval(refreshTimer);
    refreshTimer = setInterval(() => { if (!document.hidden) refresh(); }, 20000);
  }

  function renderTabs() {
    $("#statusTabs").innerHTML = TABS.map(([id, label]) =>
      `<button role="tab" data-status="${id}" class="${state.status === id ? "active" : ""}">${label}${id === "ATTENTION" && state.attention ? `<span class="n">${state.attention}</span>` : ""}</button>`).join("");
  }

  function renderStats(s) {
    state.attention = s.attention.count;
    const sim = s.simulation.supplier || s.simulation.payment;
    const warn = $("#warnBar");
    const msgs = [];
    if (sim) msgs.push("Mode simulasi: pesanan di sini hanya data uji, bukan transaksi sungguhan.");
    if (s.default_password) msgs.push("Password bawaan \"admin\" sedang dipakai. Isi ADMIN_PASSWORD sebelum toko online.");
    warn.hidden = !msgs.length; warn.textContent = msgs.join(" ");

    const a = s.attention;
    $("#stats").innerHTML = `
      <div class="panel stat"><small>Pesanan hari ini</small><b>${s.today.total}</b><span>${s.today.success} berhasil • ${s.today.processing} diproses</span></div>
      <div class="panel stat profit"><small>Untung hari ini</small><b>${rupiah(s.today.profit)}</b><span>Omzet ${rupiah(s.today.revenue)}</span></div>
      <div class="panel stat profit"><small>Untung 30 hari</small><b>${rupiah(s.month.profit)}</b><span>Omzet ${rupiah(s.month.revenue)} • ${s.month.success} berhasil</span></div>
      <div class="panel stat alert ${a.count ? "" : "calm"}" id="attnCard"><small>Perlu tindakan</small><b>${a.count}</b><span>${a.count ? `Sudah dibayar tapi gagal • ${rupiah(a.amount)}` : "Tidak ada pesanan bermasalah"}</span></div>`;
    renderTabs();
  }

  function actionsFor(o) {
    const btns = [];
    if (o.needs_action) {
      btns.push(`<button class="retry" data-act="retry" data-inv="${o.inv}">Kirim ulang</button>`);
      btns.push(`<button class="refund" data-act="refunded" data-inv="${o.inv}">Sudah direfund</button>`);
    }
    if (o.needs_action || o.status === "PAID" || o.status === "PROCESSING") btns.push(`<button data-act="success" data-inv="${o.inv}">Tandai berhasil</button>`);
    return btns.join("");
  }

  function renderOrders(r) {
    const box = $("#orders");
    if (!r.orders.length) { box.innerHTML = `<div class="adm-empty">Belum ada pesanan${state.status || state.q ? " yang cocok dengan filter ini" : ""}.</div>`; }
    else {
      box.innerHTML = `
        <div class="adm-row head"><span>Invoice</span><span>Produk</span><span>Tujuan</span><span>Total / Untung</span><span>Status</span><span>Aksi</span></div>
        ${r.orders.map((o) => {
          const wa = o.wa.replace(/^0/, "62");
          const waMsg = encodeURIComponent(`Halo, ini admin ${STORE.name} terkait pesanan ${o.inv} (${o.product} – ${o.item}).`);
          return `
          <div class="adm-row ${o.needs_action ? "attn" : ""}">
            <span><b>${esc(o.inv)}</b><small>${fmtDate(o.created_at)}</small></span>
            <span><b>${esc(o.product)}</b><small>${esc(o.item)}</small></span>
            <span><b>${esc(o.target)}${o.zone ? ` (${esc(o.zone)})` : ""}</b><small><a class="wa" href="https://wa.me/${esc(wa)}?text=${waMsg}" target="_blank" rel="noopener">${esc(o.wa)}</a></small></span>
            <span class="money"><b>${rupiah(o.amount)}</b><small class="plus">+${rupiah(o.profit)} • ${esc(o.method_name)}</small></span>
            <span class="c-status"><span class="status ${STATUS_CLASS[o.status] || ""}">${esc(o.status_label)}</span></span>
            <span class="c-actions adm-actions">${actionsFor(o)}</span>
            ${o.note ? `<span class="note">${esc(o.note)}</span>` : ""}
          </div>`;
        }).join("")}`;
    }
    $("#pager").innerHTML = r.pages > 1
      ? `<button data-page="${r.page - 1}" ${r.page <= 1 ? "disabled" : ""}>‹ Sebelumnya</button><span>Hal. ${r.page} / ${r.pages} • ${r.total} pesanan</span><button data-page="${r.page + 1}" ${r.page >= r.pages ? "disabled" : ""}>Berikutnya ›</button>`
      : r.total ? `<span>${r.total} pesanan</span>` : "";
  }

  let refreshTimer;
  async function refresh() {
    try {
      const qs = new URLSearchParams({ status: state.status, q: state.q, page: state.page });
      const [stats, orders] = await Promise.all([api("/api/admin/stats"), api(`/api/admin/orders?${qs}`)]);
      $("#serverError").hidden = true;
      renderStats(stats);
      renderOrders(orders);
    } catch (e) {
      if (!$("#dashView").hidden) { $("#serverError").hidden = false; $("#serverError").textContent = e.message; }
    }
  }

  /* ---------- event ---------- */
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("button", e.target);
    btn.disabled = true;
    try {
      const r = await api("/api/admin/login", { method: "POST", body: { password: e.target.password.value } });
      setToken({ token: r.token, exp: r.exp });
      e.target.reset();
      showDash();
    } catch (err) {
      $("#loginError").hidden = false;
      $("#loginError").textContent = /fetch|tidak tersedia/i.test(err.message) ? "Server admin tidak tersedia di alamat ini." : err.message;
    } finally { btn.disabled = false; }
  });

  $("#logoutBtn").addEventListener("click", () => { setToken(null); showLogin(); });

  $("#statusTabs").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-status]");
    if (!b) return;
    state.status = b.dataset.status; state.page = 1;
    renderTabs(); refresh();
  });
  $("#stats").addEventListener("click", (e) => {
    if (!e.target.closest("#attnCard") || !state.attention) return;
    state.status = "ATTENTION"; state.page = 1; renderTabs(); refresh();
  });

  let searchTimer;
  $("#searchInput").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.q = e.target.value.trim(); state.page = 1; refresh(); }, 350);
  });

  $("#pager").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-page]");
    if (!b || b.disabled) return;
    state.page = Number(b.dataset.page); refresh();
  });

  const CONFIRM = {
    retry: "Kirim ulang pesanan ini ke VIPayment? Saldo VIPayment akan terpakai lagi.",
    refunded: "Tandai sudah direfund? Pastikan dana sudah benar-benar dikembalikan ke pembeli.",
    success: "Tandai pesanan ini berhasil? Pakai ini kalau sudah diproses manual.",
  };
  $("#orders").addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-act]");
    if (!b || !confirm(`${b.dataset.inv}\n\n${CONFIRM[b.dataset.act]}`)) return;
    b.disabled = true;
    try {
      const o = await api(`/api/admin/orders/${b.dataset.inv}`, { method: "POST", body: { action: b.dataset.act } });
      toast(`${o.inv}: ${o.status_label}`);
      refresh();
    } catch (err) { toast(err.message); b.disabled = false; }
  });

  /* ---------- mulai ---------- */
  getToken() ? showDash() : showLogin();
})();
