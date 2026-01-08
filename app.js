(function () {
  const { createClient } = supabase;

  // KONFIGURASI SUPABASE
  const SUPABASE_URL = "https://unhacmkhjawhoizdctdk.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuaGFjbWtoamF3aG9pemRjdGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MjczOTMsImV4cCI6MjA4MTQwMzM5M30.oKIm1s9gwotCeZVvS28vOCLddhIN9lopjG-YeaULMtk";

  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Cache Element DOM
  const els = {
    profilUtama: document.getElementById("f_profil_utama"),
    profilPendukung: document.getElementById("f_profil_pendukung"),
    program: document.getElementById("f_program"),
    bukti: document.getElementById("f_bukti"),
    frekuensi: document.getElementById("f_frekuensi"),
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
    e_profil_utama: document.getElementById("e_profil_utama"),
    e_profil_pendukung: document.getElementById("e_profil_pendukung"),
    e_definisi: document.getElementById("e_definisi"),
    e_indikator: document.getElementById("e_indikator"),
    e_program: document.getElementById("e_program"),
    e_bukti: document.getElementById("e_bukti"),
    e_frekuensi: document.getElementById("e_frekuensi"),
    e_pic: document.getElementById("e_pic"),

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
      profil_utama: norm(els.profilUtama.value),
      profil_pendukung: norm(els.profilPendukung.value),
      program: els.program.value.trim(),
      bukti: norm(els.bukti.value),
      frekuensi: norm(els.frekuensi.value),
      pic: els.pic.value.trim(),
      q: els.q.value.trim().toLowerCase(),
    };
  }

  // --- MODAL & DATA LOGIC ---
  function openModal(row) {
    if (row) {
      els.modalTitle.textContent = "Edit Data";
      els.e_id.value = row.id;
      els.e_profil_utama.value = row.profil_utama || "";
      els.e_profil_pendukung.value = row.profil_pendukung || "";
      els.e_definisi.value = row.definisi || "";
      els.e_indikator.value = row.indikator || "";
      els.e_program.value = row.program || "";
      els.e_bukti.value = row.bukti || "";
      els.e_frekuensi.value = row.frekuensi || "";
      els.e_pic.value = row.pic || "";
      els.btnDeleteData.classList.remove("hidden");
    } else {
      els.modalTitle.textContent = "Tambah Data Baru";
      els.e_id.value = "";
      els.e_profil_utama.value = "";
      els.e_profil_pendukung.value = "";
      els.e_definisi.value = "";
      els.e_indikator.value = "";
      els.e_program.value = "";
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
      profil_utama: norm(els.e_profil_utama.value),
      profil_pendukung: norm(els.e_profil_pendukung.value),
      definisi: els.e_definisi.value.trim(),
      indikator: els.e_indikator.value.trim(),
      program: els.e_program.value.trim(),
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
      .order("profil_utama", { ascending: true })
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
      if (skipKey !== "profil_utama" && f.profil_utama && norm(r.profil_utama) !== f.profil_utama) return false;
      if (skipKey !== "profil_pendukung" && f.profil_pendukung && norm(r.profil_pendukung) !== f.profil_pendukung) return false;
      if (skipKey !== "program" && f.program && norm(r.program) !== f.program) return false;
      if (skipKey !== "pic" && f.pic && norm(r.pic) !== f.pic) return false;
      if (skipKey !== "bukti" && f.bukti && norm(r.bukti) !== f.bukti) return false;
      if (skipKey !== "frekuensi" && f.frekuensi && norm(r.frekuensi) !== f.frekuensi) return false;

      if (!q) return true;
      const hay = [
        r.profil_utama,
        r.profil_pendukung,
        r.definisi,
        r.indikator,
        r.program,
        r.pic,
        r.bukti,
        r.frekuensi
      ].map(normLower).join(" | ");
      return hay.includes(q);
    });
  }

  function updateFilterOptions(f) {
    const rowsForProfilUtama = applyFilters(allRowsData, f, "profil_utama");
    const rowsForProfilPendukung = applyFilters(allRowsData, f, "profil_pendukung");
    const rowsForProgram = applyFilters(allRowsData, f, "program");
    const rowsForPic = applyFilters(allRowsData, f, "pic");
    const rowsForBukti = applyFilters(allRowsData, f, "bukti");
    const rowsForFrekuensi = applyFilters(allRowsData, f, "frekuensi");

    setOptions(els.profilUtama, uniqueSorted(rowsForProfilUtama.map(r => r.profil_utama)));
    setOptions(els.profilPendukung, uniqueSorted(rowsForProfilPendukung.map(r => r.profil_pendukung)));
    setOptions(els.program, uniqueSorted(rowsForProgram.map(r => r.program)));
    setOptions(els.pic, uniqueSorted(rowsForPic.map(r => r.pic)));
    setOptions(els.bukti, uniqueSorted(rowsForBukti.map(r => r.bukti)));
    setOptions(els.frekuensi, uniqueSorted(rowsForFrekuensi.map(r => r.frekuensi)));
  }

  function renderRows(rows) {
    viewRowsData = rows || [];
    els.count.textContent = String(viewRowsData.length || 0);
    const empty = `<div style="padding:40px;text-align:center;color:var(--text-muted)">Data tidak ditemukan.</div>`;

    if (!viewRowsData.length) {
      els.tbody.innerHTML = `<tr><td colspan="8">${empty}</td></tr>`;
      els.cards.innerHTML = empty;
      return;
    }

    els.tbody.innerHTML = viewRowsData.map((r, i) => `
      <tr data-index="${i}">
        <td>${safeText(r.profil_utama)}</td>
        <td>${safeText(r.profil_pendukung || "-")}</td>
        <td>${safeText(r.definisi || "-")}</td>
        <td>${safeText(r.indikator || "-")}</td>
        <td>${safeText(r.program || "-")}</td>
        <td>${safeText(r.pic || "-")}</td>
        <td>${safeText(r.bukti || "-")}</td>
        <td>${safeText(r.frekuensi || "-")}</td>
      </tr>
    `).join("");

    els.cards.innerHTML = viewRowsData.map((r, i) => `
      <div class="m-card" data-index="${i}">
        <div class="m-header">
          <div class="m-title">${safeText(r.profil_utama)} <span style="opacity:.7">${safeText(r.profil_pendukung ? `(${r.profil_pendukung})` : "")}</span></div>
          <div class="m-sub">${safeText(r.definisi || "-")}</div>
        </div>
        <div class="m-row"><div class="m-label">Indikator</div><div>${safeText(r.indikator || "-")}</div></div>
        <div class="m-row"><div class="m-label">Program</div><div>${safeText(r.program || "-")}</div></div>
        <div class="m-row"><div class="m-label">PIC</div><div>${safeText(r.pic || "-")}</div></div>
        <div class="m-row"><div class="m-label">Bukti</div><div>${safeText(r.bukti || "-")}</div></div>
        <div class="m-row"><div class="m-label">Frekuensi</div><div>${safeText(r.frekuensi || "-")}</div></div>
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
    els.profilUtama.value = "";
    els.profilPendukung.value = "";
    els.program.value = "";
    els.pic.value = "";
    els.bukti.value = "";
    els.frekuensi.value = "";
    els.q.value = "";
  }

  // --- IMPORT EXCEL ---
  els.fileExcel.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const confirm = await askConfirm(`Import file "${file.name}"?\nData duplikat (Program & PIC sama) akan di-merge.`);
    if (!confirm) {
      els.fileExcel.value = ""; 
      return;
    }

    setStatus("Reading...", "load");
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawExcel = XLSX.utils.sheet_to_json(worksheet);

      if (!rawExcel.length) throw new Error("File kosong");

      const { data: dbData, error: dbErr } = await db.from("program_pontren").select("*");
      if (dbErr) throw dbErr;

      let insertCount = 0;
      let updateCount = 0;
      const promises = [];

      for (let row of rawExcel) {
        // Wajib
        const newProgram = norm(row['Program'] || row['program']);
        const newPic = norm(row['PIC'] || row['pic']);
        if (!newProgram || !newPic) continue;

        // Template baru (Matriks_Program_AQIL.xlsx)
        const newProfilUtama = norm(
          row['Profil (Utama)'] || row['Profil Utama'] || row['Profil'] || row['profil']
        );
        const newProfilPendukung = norm(
          row['Profil (Pendukung)'] || row['Profil Pendukung'] || row['profil_pendukung']
        );
        const newDefinisi = norm(row['Definisi'] || row['definisi']);
        const newIndikator = norm(row['Indikator'] || row['indikator']);
        const newBukti = norm(row['Bukti'] || row['Penilaian'] || row['penilaian'] || row['bukti']);
        const newFrekuensi = norm(row['Frekuensi'] || row['Tahapan'] || row['tahapan'] || row['frekuensi']);

        const match = dbData.find(d => 
          (d.program || '').toLowerCase() === newProgram.toLowerCase() && 
          (d.pic || '').toLowerCase() === newPic.toLowerCase()
        );

        if (match) {
          const updates = {
            profil_utama: newProfilUtama || match.profil_utama,
            profil_pendukung: newProfilPendukung || match.profil_pendukung,
            definisi: newDefinisi || match.definisi,
            indikator: newIndikator || match.indikator,
            bukti: newBukti || match.bukti,
            frekuensi: newFrekuensi || match.frekuensi,
            updated_at: new Date()
          };
          promises.push(db.from("program_pontren").update(updates).eq("id", match.id));
          updateCount++;
        } else {
          const newData = {
            program: newProgram,
            pic: newPic,
            profil_utama: newProfilUtama,
            profil_pendukung: newProfilPendukung,
            definisi: newDefinisi,
            indikator: newIndikator,
            bukti: newBukti,
            frekuensi: newFrekuensi
          };
          promises.push(db.from("program_pontren").insert(newData));
          insertCount++;
        }
      }

      await Promise.all(promises);
      notify(`Selesai! Baru: ${insertCount}, Update: ${updateCount}`, "success");
      els.fileExcel.value = "";
      await refreshAllData();
      fetchData();

    } catch (err) {
      console.error(err);
      notify("Gagal Import: " + err.message, "error");
      setStatus("Error", "err");
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
    els.profilUtama,
    els.profilPendukung,
    els.program,
    els.pic,
    els.bukti,
    els.frekuensi,
  ].forEach(el => el && el.addEventListener("change", fetchData));

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