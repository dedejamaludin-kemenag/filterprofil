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
    bukti: document.getElementById("f_bukti"),
    frekuensi: document.getElementById("f_frekuensi"),
    sop: document.getElementById("f_sop"),
    instruksi_kerja: document.getElementById("f_instruksi_kerja"),
    
    pic: document.getElementById("f_pic"),
    q: document.getElementById("q"),
    btnApply: document.getElementById("btn_apply"),
    btnReset: document.getElementById("btn_reset"),
    btnAddData: document.getElementById("btnAddData"),
    tbody: document.getElementById("tbody"),
    cards: document.getElementById("cards"),
    count: document.getElementById("count"),
    status: document.getElementById("status"),
    statusDot: document.getElementById("statusDot"),
    filtersPanel: document.getElementById("filtersPanel"),
    fileExcel: document.getElementById("fileExcel"),
    
    // Modal Edit
    modal: document.getElementById("editModal"),
    modalTitle: document.getElementById("modalTitle"),
    btnCloseModal: document.getElementById("btnCloseModal"),
    btnCancelEdit: document.getElementById("btnCancelEdit"),
    btnSaveEdit: document.getElementById("btnSaveEdit"),
    btnDeleteData: document.getElementById("btnDeleteData"),
    
    // Form Inputs
    e_id: document.getElementById("e_id"),
    e_profil: document.getElementById("e_profil"),
    e_definisi: document.getElementById("e_definisi"),
    e_indikator: document.getElementById("e_indikator"),
    e_program: document.getElementById("e_program"),
    e_sasaran: document.getElementById("e_sasaran"),
    e_bukti: document.getElementById("e_bukti"),
    e_frekuensi: document.getElementById("e_frekuensi"),
    e_pic: document.getElementById("e_pic"),
    e_sop: document.getElementById("e_sop"),
    e_instruksi_kerja: document.getElementById("e_instruksi_kerja"),

    // Toast & Confirm
    toastContainer: document.getElementById("toastContainer"),
    confirmModal: document.getElementById("confirmModal"),
    confirmText: document.getElementById("confirmText"),
    btnConfirmYes: document.getElementById("btnConfirmYes"),
    btnConfirmNo: document.getElementById("btnConfirmNo"),
  };

  // master data (dari DB), dan data yang sedang ditampilkan
  let allRowsData = [];
  let viewRowsData = [];

  // Normalisasi string
  function norm(x) {
    return (x ?? "").toString().trim();
  }

  function normLower(x) {
    return norm(x).toLowerCase();
  }

  // --- NOTIFICATION SYSTEM (TOAST) ---
  function notify(msg, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    let icon = "info";
    if (type === "success") icon = "check-circle";
    if (type === "error") icon = "warning-circle";

    toast.innerHTML = `<i class="ph ph-${icon}"></i> <span>${msg}</span>`;
    
    els.toastContainer.appendChild(toast);

    // Auto remove after 4s
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // --- CUSTOM CONFIRM MODAL ---
  function askConfirm(message) {
    return new Promise((resolve) => {
      els.confirmText.textContent = message;
      els.confirmModal.classList.add("open");

      // Handler untuk tombol
      const handleYes = () => {
        cleanup();
        resolve(true);
      };
      
      const handleNo = () => {
        cleanup();
        resolve(false);
      };

      // Cleanup event listeners agar tidak menumpuk
      function cleanup() {
        els.btnConfirmYes.removeEventListener("click", handleYes);
        els.btnConfirmNo.removeEventListener("click", handleNo);
        els.confirmModal.classList.remove("open");
      }

      els.btnConfirmYes.addEventListener("click", handleYes);
      els.btnConfirmNo.addEventListener("click", handleNo);
    });
  }

  // Utils
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
    profil: norm(els.profil.value),
    indikator: norm(els.indikator.value),
    program: els.program.value.trim(),
    pic: els.pic.value.trim(),
    q: els.q.value.trim(),
  };
}

  // --- MODAL & DATA LOGIC ---
  function openModal(row) {
    if (row) {
      els.modalTitle.textContent = "Edit Data";
      els.e_id.value = row.id;
      els.e_profil.value = row.profil || row.profil_utama || "";
      els.e_definisi.value = row.definisi || "";
      els.e_indikator.value = row.indikator || "";
      els.e_program.value = row.program || "";
      els.e_sasaran.value = row.sasaran || "";
      els.e_sop.value = row.sop || "";
      els.e_instruksi_kerja.value = row.instruksi_kerja || "";
      els.e_bukti.value = row.bukti || "";
      els.e_frekuensi.value = row.frekuensi || "";
      els.e_pic.value = row.pic || "";
      els.btnDeleteData.classList.remove("hidden");
    } else {
      els.modalTitle.textContent = "Tambah Data Baru";
      els.e_id.value = "";
      els.e_profil.value = "";
      els.e_definisi.value = "";
      els.e_indikator.value = "";
      els.e_program.value = "";
      els.e_sasaran.value = "";
      els.e_sop.value = "";
      els.e_instruksi_kerja.value = "";
      els.e_bukti.value = "";
      els.e_frekuensi.value = "";
      els.e_pic.value = "";
      els.btnDeleteData.classList.add("hidden");
    }
    els.modal.classList.add("open");
  }

  function closeModal() {
    els.modal.classList.remove("open");
  }

  async function saveChanges() {
    const id = els.e_id.value;
    const dataToSave = {
      profil: norm(els.e_profil.value),
      definisi: els.e_definisi.value.trim(),
      indikator: els.e_indikator.value.trim(),
      program: els.e_program.value.trim(),
      sasaran: els.e_sasaran.value.trim(),
      sop: els.e_sop.value.trim(),
      instruksi_kerja: els.e_instruksi_kerja.value.trim(),
      bukti: norm(els.e_bukti.value),
      frekuensi: norm(els.e_frekuensi.value),
      pic: els.e_pic.value.trim(),
    };

    const hasData = Object.values(dataToSave).some(val => val !== "");
    if (!hasData) {
      notify("Harap isi minimal 1 kolom!", "error");
      return;
    }

    if (id) {
      const confirm = await askConfirm("Simpan perubahan pada data ini?");
      if (!confirm) return;

      setStatus("Menyimpan...", "load");
      dataToSave.updated_at = new Date();
      const { error } = await db.from("program_pontren").update(dataToSave).eq("id", id);
      
      if (error) {
        notify("Gagal update: " + error.message, "error");
        setStatus("Gagal", "err");
      } else {
        closeModal();
        notify("Data berhasil diperbarui!", "success");
        await refreshAllData();
        fetchData();
      }
    } else {
      setStatus("Menambahkan...", "load");
      const { error } = await db.from("program_pontren").insert(dataToSave);
      
      if (error) {
        notify("Gagal tambah: " + error.message, "error");
        setStatus("Gagal", "err");
      } else {
        closeModal();
        notify("Data baru berhasil ditambahkan!", "success");
        await refreshAllData();
        fetchData();
      }
    }
  }

  async function deleteData() {
    const id = els.e_id.value;
    if (!id) return;
    
    const confirm = await askConfirm("PERINGATAN: Apakah Anda yakin ingin menghapus data ini secara permanen?");
    if (!confirm) return;

    setStatus("Menghapus...", "load");
    const { error } = await db.from("program_pontren").delete().eq("id", id);
    
    if (error) {
      notify("Gagal hapus: " + error.message, "error");
      setStatus("Gagal", "err");
    } else {
      closeModal();
      notify("Data berhasil dihapus.", "success");
      await refreshAllData();
      fetchData();
    }
  }

  // --- DATA LOADING (tanpa RPC) ---
  async function refreshAllData() {
    setStatus("Syncing...", "load");
    const { data, error } = await db
      .from("program_pontren")
      .select("*")
      .order("profil", { ascending: true })
      .order("program", { ascending: true });

    if (error) {
      notify("Gagal ambil data: " + error.message, "error");
      setStatus("Error", "err");
      allRowsData = [];
      return;
    }
    allRowsData = data || [];
    setStatus("Ready", "ok");
  }

  function uniqueSorted(values) {
    const set = new Set((values || []).map(v => norm(v)).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }

  function applyFilters(rows, f, skipKey = null) {
  const q = normLower(f.q);

  return (rows || []).filter(r => {
    // Hanya 4 filter yang aktif: Profil, Indikator, Program, PIC
    if (skipKey !== "profil" && f.profil && norm(r.profil || r.profil_utama) !== f.profil) return false;
    if (skipKey !== "indikator" && f.indikator && norm(r.indikator) !== f.indikator) return false;
    if (skipKey !== "program" && f.program && norm(r.program) !== f.program) return false;
    if (skipKey !== "pic" && f.pic && norm(r.pic) !== norm(f.pic)) return false;

    // Search (q) tetap nyapu semua kolom (biar enak)
    if (!q) return true;

    const hay = [
      r.profil || r.profil_utama,
      r.definisi,
      r.indikator,
      r.program,
      r.sasaran,
      r.pic,
      r.frekuensi,
      r.sop,
      r.instruksi_kerja,
      r.bukti,
    ].map(normLower).join(" | ");

    return hay.includes(q);
  });
}

  function updateFilterOptions(f) {
  const rowsForProfil = applyFilters(allRowsData, f, "profil");
  const rowsForIndikator = applyFilters(allRowsData, f, "indikator");
  const rowsForProgram = applyFilters(allRowsData, f, "program");
  const rowsForPic = applyFilters(allRowsData, f, "pic");

  setOptions(els.profil, uniqueSorted(rowsForProfil.map(r => r.profil || r.profil_utama)));
  setOptions(els.indikator, uniqueSorted(rowsForIndikator.map(r => r.indikator)));
  setOptions(els.program, uniqueSorted(rowsForProgram.map(r => r.program)));
  setOptions(els.pic, uniqueSorted(rowsForPic.map(r => r.pic)));
}

  function renderRows(rows) {
    viewRowsData = rows || [];
    els.count.textContent = String(viewRowsData.length || 0);
    const empty = `<div style="padding:40px;text-align:center;color:var(--text-muted)">Data tidak ditemukan.</div>`;

    if (!viewRowsData.length) {
      els.tbody.innerHTML = `<tr><td colspan="10">${empty}</td></tr>`;
      els.cards.innerHTML = empty;
      return;
    }

    els.tbody.innerHTML = viewRowsData.map((r, i) => `
  <tr data-index="${i}">
    <td>${i + 1}</td>
    <td><span class="cell-profil">${safeText(r.profil || r.profil_utama || "-")}</span><span class="cell-def">${safeText(r.definisi || "-")}</span></td>
    <td>${safeText(r.indikator || "-")}</td>
    <td>${safeText(r.program || "-")}</td>
    <td>${safeText(r.sasaran || "-")}</td>
    <td>${safeText(r.pic || "-")}</td>
    <td>${safeText(r.frekuensi || "-")}</td>
    <td>${safeText(r.sop || "-")}</td>
    <td>${safeText(r.instruksi_kerja || "-")}</td>
    <td>${safeText(r.bukti || "-")}</td>
  </tr>
`).join("");

    els.cards.innerHTML = viewRowsData.map((r, i) => `
  <div class="m-card" data-index="${i}">
    <div class="m-header">
      <div class="m-title">${safeText(r.profil || r.profil_utama || "-")}</div>
      <div class="m-sub">${safeText(r.definisi || "-")}</div>
    </div>
    <div class="m-row"><div class="m-label">Indikator</div><div>${safeText(r.indikator || "-")}</div></div>
    <div class="m-row"><div class="m-label">Program</div><div>${safeText(r.program || "-")}</div></div>
    <div class="m-row"><div class="m-label">Sasaran</div><div>${safeText(r.sasaran || "-")}</div></div>
    <div class="m-row"><div class="m-label">PIC</div><div>${safeText(r.pic || "-")}</div></div>
    <div class="m-row"><div class="m-label">Frekuensi</div><div>${safeText(r.frekuensi || "-")}</div></div>
    <div class="m-row"><div class="m-label">SOP</div><div>${safeText(r.sop || "-")}</div></div>
    <div class="m-row"><div class="m-label">Instruksi Kerja</div><div>${safeText(r.instruksi_kerja || "-")}</div></div>
    <div class="m-row"><div class="m-label">Bukti</div><div>${safeText(r.bukti || "-")}</div></div>
  </div>
`).join("");

    document.querySelectorAll('tr[data-index]').forEach(row => {
      row.addEventListener('click', () => openModal(viewRowsData[row.getAttribute('data-index')]));
    });
    
    document.querySelectorAll('.m-card[data-index]').forEach(card => {
      card.addEventListener('click', () => openModal(viewRowsData[card.getAttribute('data-index')]));
    });
  }

  function fetchData() {
    const f = readFilters();
    updateFilterOptions(f);
    const rows = applyFilters(allRowsData, f, null);
    renderRows(rows);
    setStatus("Ready", "ok");
  }

  function resetFilters() {
  els.profil.value = "";
  els.indikator.value = "";
  els.program.value = "";
  els.pic.value = "";
  els.q.value = "";
  fetchData();
}

  // --- IMPORT EXCEL (Matriks_Program_AQIL) ---
function normHeader(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\w]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const HEADER_TO_DB = {
  // Profil / Kategori
  profil: "profil",
  kategori: "profil",
  kategori_aqil: "profil",
  profil_utama: "profil",

  // Kolom utama
  program: "program",
  definisi: "definisi",
  indikator: "indikator",
  sop: "sop",
  instruksi_kerja: "instruksi_kerja",
  instruksi: "instruksi_kerja",
  instruksi_kerja_ik: "instruksi_kerja",

  pic: "pic",
  pj: "pic",
  penanggung_jawab: "pic",

  bukti: "bukti",
  eviden: "bukti",
  penilaian: "bukti",

  frekuensi: "frekuensi",
  tahapan: "frekuensi",
};

function makeKey(profil, program) {
  return `${normLower(profil)}||${normLower(program)}`;
}

els.fileExcel.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const confirm = await askConfirm(
    `Import file "${file.name}"?\nDuplikat (Profil & Program sama) akan di-merge (update otomatis).`
  );
  if (!confirm) {
    els.fileExcel.value = "";
    return;
  }

  setStatus("Reading...", "load");
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    const aoa = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
    if (!aoa.length) throw new Error("File kosong");

    const rawHeaders = aoa[0] || [];
    const headerMap = rawHeaders.map((h) => HEADER_TO_DB[normHeader(h)] || null);

    // Ambil DB sekali untuk merge kosong -> tetap pakai data lama
    const { data: dbData, error: dbErr } = await db.from("program_pontren").select("*");
    if (dbErr) throw dbErr;

    const existingMap = new Map();
    (dbData || []).forEach((r) => {
      const p = r.profil || r.profil_utama || "";
      const pr = r.program || "";
      if (!p || !pr) return;
      existingMap.set(makeKey(p, pr), r);
    });

    const stagedMap = new Map(); // key -> merged row (last win)
    let skipped = 0;

    for (let i = 1; i < aoa.length; i++) {
      const line = aoa[i];
      if (!line || line.every((c) => String(c ?? "").trim() === "")) continue;

      const obj = {};
      for (let c = 0; c < headerMap.length; c++) {
        const k = headerMap[c];
        if (!k) continue;
        const val = norm(line[c]);
        obj[k] = val;
      }

      // Wajib: profil & program (mengikuti unique key)
      const profil = obj.profil || "";
      const program = obj.program || "";

      if (!profil || !program) {
        skipped++;
        continue;
      }

      const key = makeKey(profil, program);
      const old = existingMap.get(key);

      const merged = {
        profil,
        program,
        definisi: obj.definisi || (old ? (old.definisi || "") : ""),
        indikator: obj.indikator || (old ? (old.indikator || "") : ""),
        sop: obj.sop || (old ? (old.sop || "") : ""),
        instruksi_kerja: obj.instruksi_kerja || (old ? (old.instruksi_kerja || "") : ""),
        pic: obj.pic || (old ? (old.pic || "") : ""),
        bukti: obj.bukti || (old ? (old.bukti || "") : ""),
        frekuensi: obj.frekuensi || (old ? (old.frekuensi || "") : ""),
      };

      // Rapikan indikator multiline (kalau user pakai ; / newline)
      if (typeof merged.indikator === "string" && merged.indikator) {
        merged.indikator = merged.indikator
          .split(/\r?\n|;/)
          .map((s) => s.trim())
          .filter(Boolean)
          .join("\n");
      }

      stagedMap.set(key, merged);
    }

    const stagedRows = Array.from(stagedMap.values());
    if (!stagedRows.length) throw new Error("Tidak ada baris valid untuk di-import (cek kolom Profil & Program).");

    let insertCount = 0;
    let updateCount = 0;

    stagedMap.forEach((_, key) => {
      if (existingMap.has(key)) updateCount++;
      else insertCount++;
    });

    // Upsert bertahap agar tidak terlalu besar
    const CHUNK = 200;
    for (let i = 0; i < stagedRows.length; i += CHUNK) {
      const chunk = stagedRows.slice(i, i + CHUNK);
      const { error } = await db
        .from("program_pontren")
        .upsert(chunk, { onConflict: "profil,program" });
      if (error) throw error;
    }

    const skippedNote = skipped ? ` (skip ${skipped} baris: profil/program kosong)` : "";
    notify(`Selesai! Baru: ${insertCount}, Update: ${updateCount}${skippedNote}`, "success");
    els.fileExcel.value = "";
    await refreshAllData();
    fetchData();
  } catch (err) {
    console.error(err);
    notify("Gagal Import: " + (err?.message || String(err)), "error");
    setStatus("Error", "err");
    els.fileExcel.value = "";
  }
});

  els.btnAddData.addEventListener("click", () => openModal(null));
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
    fetchData();
  });
  [
    els.profil,
    els.indikator,
    els.program,
    els.pic,
    els.bukti,
    els.frekuensi,
  ].forEach(el => el && el.addEventListener("change", fetchData));


  // Filter text inputs (SOP & Instruksi Kerja)
  [els.sop, els.instruksi_kerja].forEach(el => {
    if (!el) return;
    el.addEventListener("input", () => {
      fetchData();
    });
    el.addEventListener("keyup", (e) => {
      if (e.key === "Enter") {
        if (window.innerWidth < 1024) els.filtersPanel.open = false;
        fetchData();
      }
    });
  });

  els.btnCloseModal.addEventListener("click", closeModal);
  els.btnCancelEdit.addEventListener("click", closeModal);
  els.btnSaveEdit.addEventListener("click", saveChanges);
  els.btnDeleteData.addEventListener("click", deleteData);
  els.modal.addEventListener("click", (e) => {
    if (e.target === els.modal) closeModal();
  });

  (async function init() {
    if (window.innerWidth < 1024) els.filtersPanel.open = false;
    await refreshAllData();
    fetchData();
  })();
})();