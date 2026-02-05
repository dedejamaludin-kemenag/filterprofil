(function () {
  const { createClient } = supabase;

  // --- 1. KONFIGURASI SUPABASE ---
  const SUPABASE_URL = "https://unhacmkhjawhoizdctdk.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuaGFjbWtoamF3aG9pemRjdGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MjczOTMsImV4cCI6MjA4MTQwMzM5M30.oKIm1s9gwotCeZVvS28vOCLddhIN9lopjG-YeaULMtk";

  // REVISI: Cek apakah instance sudah ada di window (Singleton Pattern)
  // Ini mencegah warning "Multiple GoTrueClient" saat refresh/hot-reload
  let db;
  if (window.pontrenDbInstance) {
    db = window.pontrenDbInstance;
  } else {
    db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true, // Simpan sesi
        detectSessionInUrl: false // Matikan deteksi URL agar lebih bersih
      }
    });
    window.pontrenDbInstance = db;
  }

  const STORAGE_BUCKET = "pontren_docs"; 
  const DOCS_TABLE = "program_pontren_docs";
  const RECORDS_TABLE = "program_pontren_records";

  // --- 2. CACHE ELEMENT DOM ---
  const els = {
    // Filter Inputs
    profil: document.getElementById("f_profil"),
    sasaran: document.getElementById("f_sasaran"), 
    frekuensi: document.getElementById("f_frekuensi"), 
    pic: document.getElementById("f_pic"),
    q: document.getElementById("q"),
    
    // Buttons
    btnApply: document.getElementById("btn_apply"),
    btnReset: document.getElementById("btn_reset"),
    btnAddData: document.getElementById("btnAddData"),
    
    // Areas
    tbody: document.getElementById("tbody"),
    cards: document.getElementById("cards"),
    count: document.getElementById("count"),
    status: document.getElementById("status"),
    statusDot: document.getElementById("statusDot"),
    fileExcel: document.getElementById("fileExcel"),
    
    // Modal Edit
    modal: document.getElementById("editModal"),
    modalTitle: document.getElementById("modalTitle"),
    btnCloseModal: document.getElementById("btnCloseModal"),
    btnCancelEdit: document.getElementById("btnCancelEdit"),
    btnSaveEdit: document.getElementById("btnSaveEdit"),
    btnDeleteData: document.getElementById("btnDeleteData"),
    
    // Inputs Form
    e_id: document.getElementById("e_id"),
    e_profil: document.getElementById("e_profil"),
    e_definisi: document.getElementById("e_definisi"),
    e_indikator: document.getElementById("e_indikator"),
    e_program: document.getElementById("e_program"),
    e_sasaran: document.getElementById("e_sasaran"),
    e_frekuensi: document.getElementById("e_frekuensi"),
    e_pic: document.getElementById("e_pic"),
    
    // Utils
    toastContainer: document.getElementById("toastContainer"),
    confirmModal: document.getElementById("confirmModal"),
    confirmText: document.getElementById("confirmText"),
    btnConfirmYes: document.getElementById("btnConfirmYes"),
    btnConfirmNo: document.getElementById("btnConfirmNo"),
  };

  // --- 3. STATE ---
  let allRowsData = [];
  let viewRowsData = [];
  let activeProgramRow = null;
  let latestFiles = { SILABUS: null, SOP: null, IK: null, REC: null };

  // --- 4. GLOBAL HELPERS ---
  window.handleQuickTemplate = (type) => downloadTemplatePrefilled(type); 
  window.handleQuickUploadClick = (type) => document.getElementById(`file_${type}`).click();
  window.handleQuickUploadFile = (type, input) => quickUploadFile(type, input);
  window.handleQuickDownload = (type) => quickDownloadLatest(type);
  window.deleteSingleFile = (type, id, path) => deleteSingleFile(type, id, path);
  
  window.openFileInNewTab = async (path) => {
    const url = await getFileUrl(path);
    if(url) window.open(url, '_blank');
    else notify("Gagal mendapatkan URL file", "error");
  };

  // --- 5. UTILITY FUNCTIONS ---
  function norm(x) { return (x ?? "").toString().trim(); }
  function normLower(x) { return norm(x).toLowerCase(); }
  function safeText(x) { return (x ?? "").toString().replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function sanitizeFileName(name) { return String(name || "file").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 100); }

  function buildStoragePath(programId, kind, fileName) {
    const d = new Date();
    const ts = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`;
    return `program_pontren/${programId}/${kind}/${ts}_${sanitizeFileName(fileName)}`;
  }

  async function getFileUrl(path) {
    try {
      const { data, error } = await db.storage.from(STORAGE_BUCKET).createSignedUrl(path, 60 * 60); 
      if (!error && data?.signedUrl) return data.signedUrl;
    } catch (_) {}
    const { data } = db.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data?.publicUrl || "";
  }

  function notify(msg, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    let icon = type==="success"?"check-circle": type==="error"?"warning-circle":"info";
    toast.innerHTML = `<i class="ph ph-${icon}"></i> <span>${msg}</span>`;
    els.toastContainer.appendChild(toast);
    setTimeout(() => { toast.style.opacity="0"; setTimeout(() => toast.remove(), 300); }, 3000);
  }

  function askConfirm(message) {
    return new Promise((resolve) => {
      els.confirmText.textContent = message;
      els.confirmModal.classList.add("open");
      const cleanup = () => {
        els.btnConfirmYes.onclick = null; els.btnConfirmNo.onclick = null;
        els.confirmModal.classList.remove("open");
      };
      els.btnConfirmYes.onclick = () => { cleanup(); resolve(true); };
      els.btnConfirmNo.onclick = () => { cleanup(); resolve(false); };
    });
  }

  function setStatus(msg, state = "ok") {
    els.status.textContent = msg;
    els.statusDot.className = "dot " + state;
    document.body.style.cursor = state === "load" ? "wait" : "default";
  }

  function setOptions(selectEl, items) {
    if (!selectEl) return;
    const current = selectEl.value;
    selectEl.innerHTML = '<option value="">Semua</option>';
    (items || []).forEach(v => {
      if(v) {
        const opt = document.createElement("option");
        opt.value = v; opt.textContent = v;
        selectEl.appendChild(opt);
      }
    });
    if (items.includes(current)) selectEl.value = current;
  }

  function renderPicBadges(value) {
    const s = norm(value);
    if (!s) return `<span class="pill-badge pic is-empty">—</span>`;
    return s.split(/[\n;,]+/).filter(Boolean).slice(0, 4).map(p => 
      `<span class="pill-badge pic">${safeText(p.trim())}</span>`
    ).join("");
  }

  // --- 6. GENERATOR TEMPLATE EXCEL (ISO Standard) ---
  function generateWorksheet(kind, row) {
    const today = new Date().toISOString().slice(0, 10);
    const programRaw = row.program || "PROGRAM";
    const program = programRaw.toUpperCase();
    const programTitle = program.length > 60 ? program.substring(0, 60) + "..." : program; 
    const profil = row.profil || "-";
    const pic = row.pic || "Admin";
    const progCode = sanitizeFileName(program).substring(0, 6).toUpperCase().replace(/_/g, "");
    const docNo = `${kind}/${progCode}/001`;

    const borderAll = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };
    const fontBase = { name: "Arial", sz: 10 };
    const fontBold = { name: "Arial", sz: 10, bold: true };
    const fontTitleMain = { name: "Arial", sz: 12, bold: true }; 
    const fontTitleDoc = { name: "Arial", sz: 14, bold: true };  

    const styleIsoBrand = { font: fontTitleMain, alignment: { horizontal: "center", vertical: "center", wrapText: true }, border: borderAll };
    const styleIsoTitle = { font: fontTitleDoc, alignment: { horizontal: "center", vertical: "center", wrapText: true }, border: borderAll };
    const styleIsoLabel = { font: { ...fontBold, sz: 9 }, fill: { fgColor: { rgb: "F2F2F2" } }, alignment: { horizontal: "left", vertical: "center", indent: 1 }, border: borderAll };
    const styleIsoValue = { font: { ...fontBase, sz: 9 }, alignment: { horizontal: "left", vertical: "center", indent: 1 }, border: borderAll };
    const styleTableHead = { font: { ...fontBold, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "4472C4" } }, alignment: { horizontal: "center", vertical: "center", wrapText: false }, border: borderAll };
    const styleCellLeft = { font: fontBase, alignment: { horizontal: "left", vertical: "center", indent: 1, wrapText: false }, border: borderAll };
    const styleCellCenter = { font: fontBase, alignment: { horizontal: "center", vertical: "center", wrapText: false }, border: borderAll };
    const styleFooter = { font: fontBase, alignment: { horizontal: "center", vertical: "center" } };

    let titleDoc = "";
    let wsData = [];
    let filename = "";
    let colsWidth = [];

    if (kind === 'SILABUS') {
      titleDoc = "SILABUS PEMBELAJARAN"; filename = `SILABUS_${sanitizeFileName(programRaw)}.xlsx`;
      wsData = [
        ["NO", "MATERI POKOK", "TUJUAN PEMBELAJARAN", "TARGET", "AQIL", "KELAS", "REFERENSI", "PENILAIAN", "JP"],
        [1, `Pengantar ${programTitle}`, "Peserta memahami konsep dasar", "Paham 100%", profil, "Semua", "Modul", "Tulis", "2"],
        [2, `Praktek ${programTitle}`, "Peserta mampu mempraktikkan", "Bisa", profil, "Semua", "SOP", "Praktek", "4"]
      ];
      colsWidth = [{wpx: 40}, {wpx: 250}, {wpx: 250}, {wpx: 150}, {wpx: 80}, {wpx: 80}, {wpx: 150}, {wpx: 120}, {wpx: 50}];
    } else if (kind === 'SOP') {
      titleDoc = "STANDAR OPERASIONAL PROSEDUR"; filename = `SOP_${sanitizeFileName(programRaw)}.xlsx`;
      wsData = [
        ["NO", "TAHAPAN PROSES", "URAIAN AKTIVITAS", "PELAKSANA", "OUTPUT / HASIL", "KONTROL / INDIKATOR", "BUKTI FISIK"],
        [1, "Persiapan", `Menyiapkan alat untuk ${programTitle}`, pic, "Alat Siap", "Ceklist", "Foto"],
        [2, "Pelaksanaan", `Melakukan ${programTitle} sesuai juknis`, "Tim", "Berjalan", "Absensi", "Dokumen"]
      ];
      colsWidth = [{wpx: 40}, {wpx: 150}, {wpx: 300}, {wpx: 120}, {wpx: 150}, {wpx: 150}, {wpx: 150}];
    } else if (kind === 'IK') {
      titleDoc = "INSTRUKSI KERJA (IK)"; filename = `IK_${sanitizeFileName(programRaw)}.xlsx`;
      wsData = [
        ["NO", "LANGKAH KERJA", "DETAIL / CARA MELAKUKAN", "CATATAN / SAFETY / ALAT"],
        [1, "Persiapan", `Siapkan alat bantu ${programTitle}`, "Cek kondisi alat"],
        [2, "Eksekusi", "Lakukan sesuai urutan", "Hati-hati"]
      ];
      colsWidth = [{wpx: 40}, {wpx: 200}, {wpx: 400}, {wpx: 250}];
    } else { 
      titleDoc = "FORMULIR REKAMAN KEGIATAN"; filename = `BUKTI_${sanitizeFileName(programRaw)}.xlsx`;
      wsData = [
        ["NO", "HARI / TANGGAL", "URAIAN KEGIATAN", "LOKASI", "BUKTI FISIK", "STATUS", "PARAF"],
        [1, today, `Pelaksanaan ${programTitle}`, "Area Pontren", "Foto", "OK", ""]
      ];
      colsWidth = [{wpx: 40}, {wpx: 120}, {wpx: 350}, {wpx: 120}, {wpx: 150}, {wpx: 80}, {wpx: 80}];
    }

    const wb = XLSX.utils.book_new();
    const ws = {};
    const setCell = (r, c, v, s) => { ws[XLSX.utils.encode_cell({r,c})] = { v, t: 's', s }; };
    const maxCol = colsWidth.length - 1;

    // Header ISO
    const merges = [ {s:{r:0,c:0},e:{r:4,c:1}}, {s:{r:0,c:2},e:{r:1,c:maxCol-2}}, {s:{r:2,c:2},e:{r:4,c:maxCol-2}} ];
    setCell(0,0,"PONTREN\nDATA EXPLORER", styleIsoBrand);
    setCell(0,2,titleDoc, styleIsoTitle);
    setCell(2,2,program, { ...styleIsoTitle, font: {name:"Arial", sz:11} });
    
    ["No. Dok", "Revisi", "Tanggal", "Halaman", "PIC"].forEach((l,i) => setCell(i, maxCol-1, l, styleIsoLabel));
    [docNo, "00", today, "1 dari 1", pic].forEach((v,i) => setCell(i, maxCol, v, styleIsoValue));
    
    for(let r=0;r<=4;r++) for(let c=0;c<=maxCol;c++) if(!ws[XLSX.utils.encode_cell({r,c})]) setCell(r,c,"",styleIsoBrand);

    const startRow = 6;
    wsData.forEach((row, idx) => {
      const r = startRow + idx;
      row.forEach((v, c) => {
        let s = styleCellLeft;
        if (idx === 0) s = styleTableHead;
        else if (c === 0 || String(v).length <= 4) s = styleCellCenter;
        setCell(r, c, v, s);
      });
    });

    const fRow = startRow + wsData.length + 2;
    setCell(fRow, 1, "Dibuat Oleh,", styleFooter);
    setCell(fRow, maxCol-1, "Disetujui Oleh,", styleFooter);
    setCell(fRow+4, 1, `( ${pic} )`, styleFooter);
    setCell(fRow+4, maxCol-1, "( Pimpinan )", styleFooter);
    
    merges.push({s:{r:fRow,c:1},e:{r:fRow,c:2}}, {s:{r:fRow+4,c:1},e:{r:fRow+4,c:2}}, 
                {s:{r:fRow,c:maxCol-1},e:{r:fRow,c:maxCol}}, {s:{r:fRow+4,c:maxCol-1},e:{r:fRow+4,c:maxCol}});

    const rowHeights = [];
    for(let i=0; i<=4; i++) rowHeights[i] = { hpt: 25 }; 
    rowHeights[5] = { hpt: 10 };
    rowHeights[6] = { hpt: 30 };
    
    ws['!rows'] = rowHeights;
    ws['!ref'] = XLSX.utils.encode_range({s:{r:0,c:0},e:{r:fRow+5,c:maxCol}});
    ws['!cols'] = colsWidth;
    ws['!merges'] = merges;

    XLSX.utils.book_append_sheet(wb, ws, kind);
    return { wb, filename };
  }

  async function downloadTemplatePrefilled(kind) {
    if (!activeProgramRow?.id) return notify("Simpan data program dulu.", "error");
    try {
      const { wb, filename } = generateWorksheet(kind, activeProgramRow);
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 0);
      notify("Template berhasil dibuat", "success");
    } catch (e) { notify("Error template: "+e.message, "error"); }
  }

  // --- 7. LOGIKA WIDGET FILE ---

  async function refreshQuickWidgetStatus(programId) {
    ['SILABUS', 'SOP', 'IK', 'REC'].forEach(t => {
      document.getElementById(`status_txt_${t}`).innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
      document.getElementById(`list_${t}`).innerHTML = '';
      document.getElementById(`list_${t}`).classList.remove('has-items');
      document.getElementById(`btn_down_${t}`).disabled = true;
      latestFiles[t] = null;
    });

    try {
      const { data: docs } = await db.from(DOCS_TABLE).select('*').eq('program_id', programId).eq('is_active', true).order('created_at', {ascending: false});
      const { data: recs } = await db.from(RECORDS_TABLE).select('*').eq('program_id', programId).order('created_at', {ascending: false});

      const renderList = (type, files) => {
        const container = document.getElementById(`list_${type}`);
        const statusTxt = document.getElementById(`status_txt_${type}`);
        const btnDown = document.getElementById(`btn_down_${type}`);

        if (files && files.length > 0) {
          latestFiles[type] = files[0];
          btnDown.disabled = false;
          statusTxt.textContent = `${files.length} File`;
          statusTxt.classList.add('has-file');
          container.classList.add('has-items');

          container.innerHTML = files.map(f => {
            const name = f.title || (f.file_path ? f.file_path.split('/').pop() : "File");
            const date = new Date(f.created_at || f.record_date).toLocaleDateString('id-ID');
            return `
              <div class="file-item">
                <div class="file-item-info">
                  <div class="file-item-name" title="${safeText(name)}">${safeText(name)}</div>
                  <div class="file-item-meta">${date}</div>
                </div>
                <div class="file-item-actions">
                  <button class="btn-icon-sm" onclick="openFileInNewTab('${f.file_path}')" title="Buka"><i class="ph ph-arrow-square-out"></i></button>
                  <button class="btn-icon-sm del" onclick="deleteSingleFile('${type}', ${f.id}, '${f.file_path}')" title="Hapus"><i class="ph ph-trash"></i></button>
                </div>
              </div>
            `;
          }).join('');
        } else {
          statusTxt.textContent = "0 File";
          statusTxt.classList.remove('has-file');
        }
      };

      const filterDocs = (type) => (docs || []).filter(d => d.doc_type === type);
      
      renderList('SILABUS', filterDocs('SILABUS'));
      renderList('SOP', filterDocs('SOP'));
      renderList('IK', filterDocs('IK'));
      renderList('REC', recs || []);

    } catch (e) { console.error(e); }
  }

  async function quickDownloadLatest(type) {
    const f = latestFiles[type];
    if (!f) return notify("Tidak ada file.", "error");
    setStatus("Membuka...", "load");
    const url = await getFileUrl(f.file_path);
    if(url) window.open(url, '_blank');
    else notify("Gagal mendapatkan URL.", "error");
    setStatus("Ready");
  }

  // --- DELETE & UPLOAD ---
  async function deleteSingleFile(type, id, path) {
    if (!await askConfirm("Hapus file ini permanen?")) return;
    setStatus("Menghapus...", "load");
    
    if (path) await db.storage.from(STORAGE_BUCKET).remove([path]);

    const table = (type === 'REC') ? RECORDS_TABLE : DOCS_TABLE;
    const { error } = await db.from(table).delete().eq('id', id);
    
    if (error) notify("Gagal hapus DB: " + error.message, "error");
    else {
      notify("File dihapus", "success");
      await refreshQuickWidgetStatus(activeProgramRow.id);
      await refreshCountsForViewRows();
    }
    setStatus("Ready");
  }

  async function quickUploadFile(type, input) {
    const file = input.files[0];
    if (!file || !activeProgramRow?.id) return;
    const pid = activeProgramRow.id;
    const path = buildStoragePath(pid, type, file.name);
    
    setStatus("Mengupload...", "load");
    try {
      const { error: upErr } = await db.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      let payload = {};
      if (type === 'REC') {
        payload = { program_id: pid, record_date: new Date().toISOString(), title: file.name, file_path: path };
        await db.from(RECORDS_TABLE).insert(payload);
      } else {
        payload = { program_id: pid, doc_type: type, title: file.name, file_path: path, is_active: true };
        await db.from(DOCS_TABLE).insert(payload);
      }
      
      notify("Berhasil upload", "success");
      input.value = "";
      await refreshQuickWidgetStatus(pid);
      await refreshCountsForViewRows();
    } catch (e) { notify("Gagal upload: " + e.message, "error"); }
    setStatus("Ready");
  }

  // --- 8. CORE CRUD ---
  
  async function openModal(row) {
    activeProgramRow = row || null;
    if (row) {
      els.modalTitle.textContent = "Edit Data";
      els.btnDeleteData.classList.remove("hidden");
      ["id","profil","definisi","indikator","program","sasaran","frekuensi","pic"].forEach(k => {
        if(els[`e_${k}`]) els[`e_${k}`].value = row[k] || (k==='profil'?row.profil_utama:'') || "";
      });
      await refreshQuickWidgetStatus(row.id);
    } else {
      els.modalTitle.textContent = "Tambah Data";
      els.btnDeleteData.classList.add("hidden");
      // RESET SEMUA 7 FIELD (+ID)
      ["id","profil","definisi","indikator","program","sasaran","frekuensi","pic"].forEach(k => { if(els[`e_${k}`]) els[`e_${k}`].value = ""; });
      
      // Reset widgets
      ['SILABUS','SOP','IK','REC'].forEach(t => {
        document.getElementById(`status_txt_${t}`).textContent = "0 File";
        document.getElementById(`list_${t}`).innerHTML = "";
        document.getElementById(`list_${t}`).classList.remove('has-items');
        document.getElementById(`btn_down_${t}`).disabled = true;
      });
    }
    els.modal.classList.add("open");
  }

  async function saveChanges() {
    const id = els.e_id.value;
    const data = {
      profil: norm(els.e_profil.value), 
      definisi: els.e_definisi.value, 
      indikator: els.e_indikator.value,
      program: els.e_program.value, 
      sasaran: els.e_sasaran.value, 
      frekuensi: els.e_frekuensi.value, 
      pic: els.e_pic.value
    };
    
    if (id) {
      const { error } = await db.from("program_pontren").update({...data, updated_at: new Date()}).eq('id', id);
      if(error) notify("Gagal update: "+error.message, "error");
      else { els.modal.classList.remove("open"); notify("Data diperbarui", "success"); refreshAllData(); }
    } else {
      const { error } = await db.from("program_pontren").insert(data);
      if(error) notify("Gagal simpan: "+error.message, "error");
      else { els.modal.classList.remove("open"); notify("Data ditambahkan", "success"); refreshAllData(); }
    }
  }

  async function deleteData() {
    if (!await askConfirm("Hapus data program ini permanen?")) return;
    const { error } = await db.from("program_pontren").delete().eq('id', els.e_id.value);
    if (!error) { els.modal.classList.remove("open"); notify("Data dihapus", "success"); refreshAllData(); }
    else notify("Gagal hapus: "+error.message, "error");
  }

  // --- 9. VIEW & FILTER LOGIC (UPDATED) ---

  async function refreshAllData() {
    setStatus("Syncing...", "load");
    const { data } = await db.from("program_pontren").select("*").order("program", {ascending: true});
    allRowsData = data || [];
    fetchData();
  }

  function fetchData() {
    // REVISI FILTER: Filter Sasaran & Frekuensi ditambahkan
    const f = {
      p: norm(els.profil.value), 
      s: norm(els.sasaran.value), // Filter Sasaran
      fr: norm(els.frekuensi.value), // Filter Frekuensi
      pi: els.pic.value, 
      q: normLower(els.q.value)
    };
    
    viewRowsData = allRowsData.filter(r => {
      if (f.p && norm(r.profil||r.profil_utama)!==f.p) return false;
      if (f.s && norm(r.sasaran)!==f.s) return false; // Match Sasaran
      if (f.fr && norm(r.frekuensi)!==f.fr) return false; // Match Frekuensi
      if (f.pi && norm(r.pic)!==f.pi) return false;
      if (f.q) {
        const hay = [r.profil, r.definisi, r.indikator, r.program, r.sasaran, r.pic].map(normLower).join("|");
        if (!hay.includes(f.q)) return false;
      }
      return true;
    });
    
    renderRows();
    setStatus("Ready");
  }

  async function refreshCountsForViewRows() {
    const ids = viewRowsData.map(r => r.id);
    if (!ids.length) return;
    
    const { data: docs } = await db.from(DOCS_TABLE).select('program_id, doc_type').in('program_id', ids);
    const { data: recs } = await db.from(RECORDS_TABLE).select('program_id').in('program_id', ids);
    const map = {};
    ids.forEach(id => map[id] = { sop:0, ik:0, rec:0, sil:0 });
    
    docs?.forEach(d => { 
      if(map[d.program_id]) { 
        if(d.doc_type==='SOP') map[d.program_id].sop++; 
        if(d.doc_type==='IK') map[d.program_id].ik++; 
        if(d.doc_type==='SILABUS') map[d.program_id].sil++; 
      }
    });
    recs?.forEach(r => { if(map[r.program_id]) map[r.program_id].rec++; });

    document.querySelectorAll("[data-chip-count]").forEach(el => {
      const pid = el.getAttribute("data-pid");
      const k = el.getAttribute("data-kind");
      const c = map[pid];
      if (!c) return;
      const n = (k==='sil') ? c.sil : (k==='ik') ? c.ik : (k==='rec') ? c.rec : c.sop;
      el.textContent = `${n} File`;
    });
  }

  function renderRows() {
    els.count.textContent = viewRowsData.length;
    els.tbody.innerHTML = viewRowsData.map((r, i) => `
      <tr onclick="openModalById(${i})">
        <td>${i+1}</td>
        <td><span class="cell-profil">${safeText(r.profil||r.profil_utama)}</span><span class="cell-def">${safeText(r.definisi)}</span></td>
        <td>${safeText(r.indikator)}</td>
        <td>${safeText(r.program)}</td>
        <td>${safeText(r.sasaran)}</td>
        <td><div class="badge-wrap">${renderPicBadges(r.pic)}</div></td>
        <td>${safeText(r.frekuensi)}</td>
        <td><div class="mini-chips"><span class="chip-count" data-chip-count data-pid="${r.id}" data-kind="sil">0 File</span></div></td>
        <td><div class="mini-chips"><span class="chip-count" data-chip-count data-pid="${r.id}" data-kind="sop">0 File</span></div></td>
        <td><div class="mini-chips"><span class="chip-count" data-chip-count data-pid="${r.id}" data-kind="ik">0 File</span></div></td>
        <td><div class="mini-chips"><span class="chip-count" data-chip-count data-pid="${r.id}" data-kind="rec">0 File</span></div></td>
      </tr>
    `).join("");
    
    els.cards.innerHTML = viewRowsData.map((r, i) => `
      <div class="m-card" onclick="openModalById(${i})">
        <div class="m-header">
          <div class="m-title">${safeText(r.program)}</div>
          <div class="m-id">ID: ${safeText(r.id)}</div>
        </div>

        <div class="m-body">
          <div class="m-row"><div class="m-label">Profil</div><div>${safeText(r.profil || r.profil_utama)}</div></div>
          <div class="m-row"><div class="m-label">Sasaran</div><div>${safeText(r.sasaran)}</div></div>
          <div class="m-row"><div class="m-label">PIC</div><div>${safeText(r.pic)}</div></div>
          <div class="m-row"><div class="m-label">Frekuensi</div><div>${safeText(r.frekuensi)}</div></div>
        </div>

        <div class="m-footer">
          <div class="m-chip"><span data-chip-count data-pid="${r.id}" data-kind="sil">0 File</span>Silabus</div>
          <div class="m-chip"><span data-chip-count data-pid="${r.id}" data-kind="sop">0 File</span>SOP</div>
          <div class="m-chip"><span data-chip-count data-pid="${r.id}" data-kind="ik">0 File</span>IK</div>
          <div class="m-chip"><span data-chip-count data-pid="${r.id}" data-kind="rec">0 File</span>Bukti</div>
        </div>
      </div>
    `).join("");
    
    refreshCountsForViewRows();
  }
  
  window.openModalById = (idx) => openModal(viewRowsData[idx]);

  // --- 10. IMPORT EXCEL MASTER ---
  els.fileExcel.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!await askConfirm("Import Excel?")) { els.fileExcel.value=""; return; }
    notify("Fitur Import Master Data belum diaktifkan.", "info");
    els.fileExcel.value = "";
  });

  // --- 11. INIT ---
  els.btnAddData.onclick = () => openModal(null);
  els.btnCloseModal.onclick = els.btnCancelEdit.onclick = () => els.modal.classList.remove("open");
  els.btnSaveEdit.onclick = saveChanges;
  els.btnDeleteData.onclick = deleteData;
  els.btnApply.onclick = fetchData;
  els.btnReset.onclick = () => { els.q.value=""; els.profil.value=""; fetchData(); };
  
  els.q.addEventListener("keyup", (e) => { if(e.key==="Enter") fetchData(); });
  // UPDATE: Event listener untuk filter baru
  [els.profil, els.sasaran, els.frekuensi, els.pic].forEach(el => el && el.addEventListener("change", fetchData));

  (async function init() {
    await refreshAllData();
    const uniq = (k) => [...new Set(allRowsData.map(r => r[k]||r[k+'_utama']).filter(Boolean))].sort();
    
    setOptions(els.profil, uniq('profil'));
    setOptions(els.sasaran, uniq('sasaran')); // Populate Sasaran Dropdown
    setOptions(els.frekuensi, uniq('frekuensi')); // Populate Frekuensi Dropdown
    setOptions(els.pic, uniq('pic'));
  })();

})();