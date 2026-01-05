(function () {
  const { createClient } = supabase;

  const SUPABASE_URL = "https://unhacmkhjawhoizdctdk.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuaGFjbWtoamF3aG9pemRjdGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MjczOTMsImV4cCI6MjA4MTQwMzM5M30.oKIm1s9gwotCeZVvS28vOCLddhIN9lopjG-YeaULMtk";

  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  if (!window.supabase) {
    console.error("Supabase SDK belum termuat. Cek tag CDN supabase-js.");
  }
  console.log("Supabase URL:", SUPABASE_URL);

  const els = {
    profil: document.getElementById("f_profil"),
    indikator: document.getElementById("f_indikator"),
    pic: document.getElementById("f_pic"),
    program: document.getElementById("f_program"),
    penilaian: document.getElementById("f_penilaian"),
    q: document.getElementById("q"),
    btnApply: document.getElementById("btn_apply"),
    btnReset: document.getElementById("btn_reset"),
    tbody: document.getElementById("tbody"),
    cards: document.getElementById("cards"),
    count: document.getElementById("count"),
    status: document.getElementById("status"),
    statusDot: document.getElementById("statusDot"),
    filtersPanel: document.getElementById("filtersPanel"),
  };

  function safeText(x) {
    return (x ?? "").toString().replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function setStatus(msg, state = "ok") {
    // state: ok | load | err
    els.status.textContent = msg;

    els.statusDot.classList.remove("ok", "load", "err");
    els.statusDot.classList.add(state);

    const loading = state === "load";
    document.body.classList.toggle("loading", loading);

    els.btnApply.disabled = loading;
    els.btnReset.disabled = loading;

    [els.profil, els.indikator, els.pic, els.program, els.penilaian, els.q].forEach((el) => {
      if (el) el.disabled = loading;
    });
  }

  function setOptions(selectEl, items) {
    const currentValue = selectEl.value;

    // Rebuild safely
    selectEl.innerHTML = "";
    const optAll = document.createElement("option");
    optAll.value = "";
    optAll.textContent = "Semua";
    selectEl.appendChild(optAll);

    const arr = (items || []).filter((v) => v != null && String(v).trim() !== "");
    arr.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = String(v);
      opt.textContent = String(v);
      selectEl.appendChild(opt);
    });

    // Keep selection if still exists
    const exists = arr.some((v) => String(v) === currentValue);
    selectEl.value = exists ? currentValue : "";
  }

  function readFilters() {
    return {
      profil: els.profil.value.trim(),
      indikator: els.indikator.value.trim(),
      pic: els.pic.value.trim(),
      program: els.program.value.trim(),
      penilaian: els.penilaian.value.trim(),
      q: els.q.value.trim().toLowerCase(),
    };
  }

  // =========================================================================
  // Load cascading filter options (RPC with fallback)
  // =========================================================================
  async function loadFilterOptions(currentFilters) {
    const { profil, indikator, pic, program, penilaian } = currentFilters;

    let data = null;

    // Coba RPC dulu
    const rpcRes = await db
      .rpc("get_program_pontren_options", {
        profil_filter: profil || null,
        indikator_filter: indikator || null,
        pic_filter: pic || null,
        program_filter: program || null,
        penilaian_filter: penilaian || null,
      })
      .single();

    if (!rpcRes.error) {
      data = rpcRes.data;
    } else {
      console.warn("RPC get_program_pontren_options gagal, fallback ke tabel opsi:", rpcRes.error);

      const fallback = await db
        .from("program_pontren_filter_options")
        .select("*")
        .single();

      if (fallback.error) {
        console.error(fallback.error);
        return null;
      }
      data = fallback.data;
    }

    setOptions(els.profil, data?.profil);
    setOptions(els.indikator, data?.indikator);
    setOptions(els.pic, data?.pic);
    setOptions(els.program, data?.program);
    setOptions(els.penilaian, data?.penilaian);

    return data;
  }
  // =========================================================================

  function renderRows(rows) {
    const n = rows?.length || 0;
    els.count.textContent = String(n);

    // Empty states
    if (!rows || rows.length === 0) {
      els.tbody.innerHTML = `<tr><td colspan="5" class="muted">Tidak ada data yang cocok.</td></tr>`;
      els.cards.innerHTML = `<div class="rowcard"><div class="muted">Tidak ada data yang cocok.</div></div>`;
      return;
    }

    // Desktop table
    els.tbody.innerHTML = rows
      .map((r) => {
        const profilDef = `<b>${safeText(r.profil)}</b><br><span class="muted-small">(${safeText(r.definisi)})</span>`;
        return `
          <tr>
            <td>${profilDef}</td>
            <td>${safeText(r.indikator)}</td>
            <td>${safeText(r.pic)}</td>
            <td>${safeText(r.program)}</td>
            <td>${safeText(r.penilaian || "")}</td>
          </tr>
        `;
      })
      .join("");

    // Mobile cards
    els.cards.innerHTML = rows
      .map((r) => {
        return `
          <div class="rowcard">
            <div class="top">
              <div>
                <div class="title">${safeText(r.profil)}</div>
                <div class="def">(${safeText(r.definisi)})</div>
              </div>
              <span class="tag">${safeText(r.penilaian || "—")}</span>
            </div>

            <div class="kv">
              <div class="k">Indikator</div><div class="v">${safeText(r.indikator)}</div>
              <div class="k">PIC</div><div class="v">${safeText(r.pic)}</div>
              <div class="k">Program</div><div class="v">${safeText(r.program)}</div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  async function fetchData() {
    const f = readFilters();
    setStatus("Memuat opsi & data...", "load");

    // 1) Load relevant filter options
    const optOk = await loadFilterOptions(f);
    if (optOk === null) {
      setStatus("Gagal memuat opsi filter. Cek console.", "err");
      renderRows([]);
      return;
    }

    // 2) Query data utama
    let q = db
      .from("program_pontren")
      .select("id, profil, definisi, indikator, pic, program, penilaian")
      .order("profil", { ascending: true })
      .order("indikator", { ascending: true });

    if (f.profil) q = q.eq("profil", f.profil);
    if (f.indikator) q = q.eq("indikator", f.indikator);
    if (f.pic) q = q.eq("pic", f.pic);
    if (f.program) q = q.eq("program", f.program);
    if (f.penilaian) q = q.eq("penilaian", f.penilaian);

    if (f.q) {
      const like = `%${f.q}%`;
      q = q.or(
        `profil.ilike.${like},definisi.ilike.${like},indikator.ilike.${like},pic.ilike.${like},program.ilike.${like},penilaian.ilike.${like}`
      );
    }

    const { data, error } = await q;

    if (error) {
      console.error(error);
      setStatus("Gagal ambil data. Cek console.", "err");
      renderRows([]);
      return;
    }

    renderRows(data || []);
    setStatus("Siap.", "ok");

    // UX: di mobile, saat user apply manual, biarkan panel filter menutup biar hasil terlihat
    // (tapi jangan memaksa jika user memang ingin tetap open)
  }

  function resetFilters() {
    els.profil.value = "";
    els.indikator.value = "";
    els.pic.value = "";
    els.program.value = "";
    els.penilaian.value = "";
    els.q.value = "";
  }

  // Events
  els.btnApply.addEventListener("click", fetchData);

  els.q.addEventListener("keyup", (e) => {
    if (e.key === "Enter") fetchData();
  });

  els.btnReset.addEventListener("click", async () => {
    resetFilters();
    await fetchData();
  });

  [els.profil, els.indikator, els.pic, els.program, els.penilaian].forEach((el) =>
    el.addEventListener("change", fetchData)
  );

  // Init
  (async function init() {
    // Auto-collapse filter panel on small screens
    try {
      if (window.matchMedia && window.matchMedia("(max-width: 760px)").matches) {
        els.filtersPanel.open = false;
      }
    } catch (_) {}

    await fetchData();
  })();
})();
