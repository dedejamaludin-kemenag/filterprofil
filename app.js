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
    e_penilaian: document.getElementById("e_penilaian"),
    e_tahapan: document.getElementById("e_tahapan"),
    e_pic: document.getElementById("e_pic"),

    // Toast & Confirm
    toastContainer: document.getElementById("toastContainer"),
    confirmModal: document.getElementById("confirmModal"),
    confirmText: document.getElementById("confirmText"),
    btnConfirmYes: document.getElementById("btnConfirmYes"),
    btnConfirmNo: document.getElementById("btnConfirmNo"),
  };

  let allRowsData = []; 

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
      profil: els.profil.value.trim(),
      indikator: els.indikator.value.trim(),
      program: els.program.value.trim(),
      penilaian: els.penilaian.value.trim(),
      tahapan: els.tahapan.value.trim(),
      pic: els.pic.value.trim(),
      q: els.q.value.trim().toLowerCase(),
    };
  }

  // --- MODAL & DATA LOGIC ---
  function openModal(row) {
    if (row) {
      els.modalTitle.textContent = "Edit Data";
      els.e_id.value = row.id;
      els.e_profil.value = row.profil || "";
      els.e_definisi.value = row.definisi || "";
      els.e_indikator.value = row.indikator || "";
      els.e_program.value = row.program || "";
      els.e_penilaian.value = row.penilaian || "";
      els.e_tahapan.value = row.tahapan || "";
      els.e_pic.value = row.pic || "";
      els.btnDeleteData.classList.remove("hidden");
    } else {
      els.modalTitle.textContent = "Tambah Data Baru";
      els.e_id.value = "";
      els.e_profil.value = "";
      els.e_definisi.value = "";
      els.e_indikator.value = "";
      els.e_program.value = "";
      els.e_penilaian.value = "";
      els.e_tahapan.value = "";
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
      profil: els.e_profil.value.trim(),
      definisi: els.e_definisi.value.trim(),
      indikator: els.e_indikator.value.trim(),
      program: els.e_program.value.trim(),
      penilaian: els.e_penilaian.value.trim(),
      tahapan: els.e_tahapan.value.trim(),
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
        await fetchData(); 
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
        await fetchData();
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
      await fetchData(); 
    }
  }

  // --- DATA LOADING ---
  async function loadFilterOptions(currentFilters) {
    const f = currentFilters;
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

  function renderRows(rows) {
    allRowsData = rows || []; 
    els.count.textContent = String(rows?.length || 0);
    const empty = `<div style="padding:40px;text-align:center;color:var(--text-muted)">Data tidak ditemukan.</div>`;

    if (!rows || !rows.length) {
      els.tbody.innerHTML = `<tr><td colspan="6">${empty}</td></tr>`;
      els.cards.innerHTML = empty;
      return;
    }

    els.tbody.innerHTML = rows.map((r, i) => `
      <tr data-index="${i}">
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

    els.cards.innerHTML = rows.map((r, i) => `
      <div class="m-card" data-index="${i}">
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

    document.querySelectorAll('tr[data-index]').forEach(row => {
      row.addEventListener('click', () => openModal(allRowsData[row.getAttribute('data-index')]));
    });
    
    document.querySelectorAll('.m-card[data-index]').forEach(card => {
      card.addEventListener('click', () => openModal(allRowsData[card.getAttribute('data-index')]));
    });
  }

  async function fetchData() {
    const f = readFilters();
    setStatus("Syncing...", "load");
    await loadFilterOptions(f);
    let q = db.from("program_pontren").select("*").order("profil", { ascending: true });

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
      notify("Gagal ambil data", "error");
      setStatus("Error", "err");
    } else {
      renderRows(data || []);
      setStatus("Ready", "ok");
    }
  }

  function resetFilters() {
    els.profil.value = ""; els.indikator.value = ""; els.program.value = "";
    els.penilaian.value = ""; els.tahapan.value = ""; els.pic.value = ""; els.q.value = "";
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
        const newProgram = (row['Program'] || row['program'] || '').trim();
        const newPic = (row['PIC'] || row['pic'] || '').trim();
        
        if (!newProgram || !newPic) continue;

        const newProfil = (row['Profil'] || row['profil'] || '').trim();
        const newDefinisi = (row['Definisi'] || row['definisi'] || '').trim();
        const newIndikator = (row['Indikator'] || row['indikator'] || '').trim();
        const newPenilaian = (row['Penilaian'] || row['penilaian'] || '').trim();
        const newTahapan = (row['Tahapan'] || row['tahapan'] || '').trim();

        const match = dbData.find(d => 
          (d.program || '').toLowerCase() === newProgram.toLowerCase() && 
          (d.pic || '').toLowerCase() === newPic.toLowerCase()
        );

        if (match) {
          const updates = {
            profil: newProfil || match.profil,
            definisi: newDefinisi || match.definisi,
            indikator: newIndikator || match.indikator,
            penilaian: newPenilaian || match.penilaian,
            tahapan: newTahapan || match.tahapan,
            updated_at: new Date()
          };
          promises.push(db.from("program_pontren").update(updates).eq("id", match.id));
          updateCount++;
        } else {
          const newData = {
            program: newProgram,
            pic: newPic,
            profil: newProfil,
            definisi: newDefinisi,
            indikator: newIndikator,
            penilaian: newPenilaian,
            tahapan: newTahapan
          };
          promises.push(db.from("program_pontren").insert(newData));
          insertCount++;
        }
      }

      await Promise.all(promises);
      notify(`Selesai! Baru: ${insertCount}, Update: ${updateCount}`, "success");
      els.fileExcel.value = "";
      await fetchData();

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
    await fetchData();
  });
  [els.profil, els.indikator, els.program, els.penilaian, els.tahapan, els.pic].forEach(el => 
    el && el.addEventListener("change", fetchData)
  );

  els.btnCloseModal.addEventListener("click", closeModal);
  els.btnCancelEdit.addEventListener("click", closeModal);
  els.btnSaveEdit.addEventListener("click", saveChanges);
  els.btnDeleteData.addEventListener("click", deleteData);
  els.modal.addEventListener("click", (e) => {
    if (e.target === els.modal) closeModal();
  });

  (async function init() {
    if (window.innerWidth < 1024) els.filtersPanel.open = false;
    await fetchData();
  })();
})();
