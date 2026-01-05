(function () {
  const { createClient } = supabase;

  // KONFIGURASI SUPABASE
  const SUPABASE_URL = "https://unhacmkhjawhoizdctdk.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuaGFjbWtoamF3aG9pemRjdGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MjczOTMsImV4cCI6MjA4MTQwMzM5M30.oKIm1s9gwotCeZVvS28vOCLddhIN9lopjG-YeaULMtk";

  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Cache Element DOM
  const els = {
    profil: document.getElementById("f_profil"),
    indikator: document.getElementById("f_indikator"),
    program: document.getElementById("f_program"),
    penilaian: document.getElementById("f_penilaian"),
    tahapan: document.getElementById("f_tahapan"),
    pic: document.getElementById("f_pic"),
    q: document.getElementById("q"),
    btnApply: document.getElementById("btn_apply"),
    btnReset: document.getElementById("btn_reset"),
    tbody: document.getElementById("tbody"),
    cards: document.getElementById("cards"),
    count: document.getElementById("count"),
    status: document.getElementById("status"),
    statusDot: document.getElementById("statusDot"),
    filtersPanel: document.getElementById("filtersPanel"),
    fileExcel: document.getElementById("fileExcel"),
  };

  function safeText(x) {
    return (x ?? "").toString().replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function setStatus(msg, state = "ok") {
    els.status.textContent = msg;
    els.statusDot.className = "dot " + state;
    const loading = state === "load";
    [els.btnApply, els.btnReset].forEach(b => b.disabled = loading);
    els.btnApply.style.opacity = loading ? "0.7" : "1";
    document.body.style.cursor = loading ? "wait" : "default";
  }

  function setOptions(selectEl, items) {
    if (!selectEl) return;
    const current = selectEl.value;
    selectEl.innerHTML = '<option value="">Semua</option>';
    const arr = (items || []).filter(v => v != null && String(v).trim() !== "");
    arr.forEach(v => {
      const opt = document.createElement("option");
      opt.value = String(v);
      opt.textContent = String(v);
      selectEl.appendChild(opt);
    });
    if (arr.some(v => String(v) === current)) selectEl.value = current;
  }

  function readFilters() {
    return {
      profil: els.profil.value.trim(),
      indikator: els.indikator.value.trim(),
      program: els.program.value.trim(),
      penilaian: els.penilaian.value.trim(),
      tahapan: els.tahapan.value.trim(),
      pic: els.pic.value.trim(),
      q: els.q.value.trim().toLowerCase(),
    };
  }

  // 1. Load Filter Options (RPC / Table)
  async function loadFilterOptions(currentFilters) {
    const f = currentFilters;
    // Coba load via RPC
    const { data, error } = await db.rpc("get_program_pontren_options", {
        profil_filter: f.profil || null,
        indikator_filter: f.indikator || null,
        pic_filter: f.pic || null,
        program_filter: f.program || null,
        penilaian_filter: f.penilaian || null,
    }).single();

    if (!error && data) {
        setOptions(els.profil, data.profil);
        setOptions(els.indikator, data.indikator);
        setOptions(els.program, data.program);
        setOptions(els.penilaian, data.penilaian);
        setOptions(els.pic, data.pic);
        if(data.tahapan) setOptions(els.tahapan, data.tahapan);
        return;
    }

    // Fallback: View biasa
    const fallback = await db.from("program_pontren_filter_options").select("*").single();
    if (fallback.data) {
        const d = fallback.data;
        setOptions(els.profil, d.profil);
        setOptions(els.indikator, d.indikator);
        setOptions(els.program, d.program);
        setOptions(els.penilaian, d.penilaian);
        setOptions(els.pic, d.pic);
        setOptions(els.tahapan, d.tahapan);
    }
  }

  // 2. Render Data
  function renderRows(rows) {
    els.count.textContent = String(rows?.length || 0);
    const empty = `<div style="padding:40px;text-align:center;color:var(--text-muted)">Data tidak ditemukan.</div>`;

    if (!rows || !rows.length) {
      els.tbody.innerHTML = `<tr><td colspan="6">${empty}</td></tr>`;
      els.cards.innerHTML = empty;
      return;
    }

    // UPDATE: Kolom PIC & Tahapan sekarang dirender polos (safeText saja)
    els.tbody.innerHTML = rows.map(r => `
      <tr>
        <td>
          <span class="cell-profil">${safeText(r.profil)}</span>
          <span class="cell-def">${safeText(r.definisi)}</span>
        </td>
        <td>${safeText(r.indikator)}</td>
        <td>${safeText(r.program)}</td>
        <td>${safeText(r.penilaian || "-")}</td>
        <td>${safeText(r.tahapan || "-")}</td>
        <td>${safeText(r.pic)}</td>
      </tr>
    `).join("");

    // Mobile view
    els.cards.innerHTML = rows.map(r => `
      <div class="m-card">
        <div class="m-header">
          <div class="m-title">${safeText(r.profil)}</div>
          <div class="m-sub">${safeText(r.definisi)}</div>
        </div>
        <div class="m-row"><div class="m-label">Indikator</div><div>${safeText(r.indikator)}</div></div>
        <div class="m-row"><div class="m-label">Program</div><div>${safeText(r.program)}</div></div>
        <div class="m-row"><div class="m-label">Penilaian</div><div>${safeText(r.penilaian || "-")}</div></div>
        <div class="m-row"><div class="m-label">Tahapan</div><div>${safeText(r.tahapan || "-")}</div></div>
        <div class="m-row"><div class="m-label">PIC</div><div>${safeText(r.pic)}</div></div>
      </div>
    `).join("");
  }

  // 3. Fetch Core Data
  async function fetchData() {
    const f = readFilters();
    setStatus("Syncing...", "load");

    await loadFilterOptions(f);

    let q = db.from("program_pontren")
      .select("id, profil, definisi, indikator, pic, program, penilaian, tahapan")
      .order("profil", { ascending: true });

    if (f.profil) q = q.eq("profil", f.profil);
    if (f.indikator) q = q.eq("indikator", f.indikator);
    if (f.program) q = q.eq("program", f.program);
    if (f.penilaian) q = q.eq("penilaian", f.penilaian);
    if (f.tahapan) q = q.eq("tahapan", f.tahapan);
    if (f.pic) q = q.eq("pic", f.pic);

    if (f.q) {
      const like = `%${f.q}%`;
      q = q.or(`profil.ilike.${like},definisi.ilike.${like},program.ilike.${like},tahapan.ilike.${like},pic.ilike.${like}`);
    }

    const { data, error } = await q;
    
    if (error) {
      console.error(error);
      setStatus("Error mengambil data", "err");
    } else {
      renderRows(data || []);
      setStatus("Ready", "ok");
    }
  }

  function resetFilters() {
    els.profil.value = ""; els.indikator.value = ""; els.program.value = "";
    els.penilaian.value = ""; els.tahapan.value = ""; els.pic.value = ""; els.q.value = "";
  }

  // ==========================================
  // EXCEL IMPORT LOGIC
  // ==========================================
  els.fileExcel.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm(`Import data dari file "${file.name}"?`)) {
      els.fileExcel.value = ""; 
      return;
    }

    setStatus("Reading Excel...", "load");

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(worksheet);

      if (!rawData.length) throw new Error("File kosong");

      // Mapping Kolom Excel -> Supabase
      const dbData = rawData.map(row => ({
        profil: row['Profil'] || row['profil'] || '',
        definisi: row['Definisi'] || row['definisi'] || '',
        indikator: row['Indikator'] || row['indikator'] || '',
        program: row['Program'] || row['program'] || '',
        penilaian: row['Penilaian'] || row['penilaian'] || null,
        tahapan: row['Tahapan'] || row['tahapan'] || null,
        pic: row['PIC'] || row['pic'] || ''
      }));

      setStatus(`Uploading ${dbData.length} rows...`, "load");

      const { error } = await db.from("program_pontren").insert(dbData);

      if (error) throw error;

      alert("Sukses import data!");
      els.fileExcel.value = "";
      await fetchData();

    } catch (err) {
      console.error(err);
      alert("Gagal Import: " + err.message + "\n(Cek console/RLS Policy)");
      setStatus("Error Import", "err");
    }
  });

  // Events
  els.btnApply.addEventListener("click", () => {
    if (window.innerWidth < 1024) els.filtersPanel.open = false;
    fetchData();
  });
  
  els.q.addEventListener("keyup", (e) => {
    if (e.key === "Enter") {
        if (window.innerWidth < 1024) els.filtersPanel.open = false;
        fetchData();
    }
  });

  els.btnReset.addEventListener("click", async () => {
    resetFilters();
    await fetchData();
  });

  [els.profil, els.indikator, els.program, els.penilaian, els.tahapan, els.pic].forEach(el => 
    el && el.addEventListener("change", fetchData)
  );

  (async function init() {
    if (window.innerWidth < 1024) els.filtersPanel.open = false;
    await fetchData();
  })();
})();
