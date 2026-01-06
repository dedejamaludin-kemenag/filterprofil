// app.js (stub demo)
// File ini sengaja minimal supaya HTML bisa dibuka tanpa error.
// Integrasikan kembali logic Supabase/Excel kamu di sini.

(function () {
  const tbody = document.getElementById('tbody');
  const countEl = document.getElementById('count');
  const statusEl = document.getElementById('status');
  const dot = document.getElementById('statusDot');

  function setStatus(text, cls) {
    statusEl.textContent = text;
    dot.className = 'dot ' + cls;
  }

  // Dummy rows biar kelihatan scroll workspace-nya
  const rows = Array.from({ length: 80 }).map((_, i) => ({
    profil: 'Kader Da’i',
    definisi: 'Mengikuti proses tarbiyah secara konsisten dan berkelanjutan.',
    indikator: 'Hariishun ‘ala Waqtihi',
    program: 'Belajar efektif: target harian & review 10 menit',
    penilaian: 'Observasi',
    tahapan: 'Pelaksanaan',
    pic: 'Kurikulum'
  }));

  function render() {
    tbody.innerHTML = rows.map((r, i) => `
      <tr>
        <td><span class="cell-profil">${escapeHtml(r.profil)}</span><div class="cell-def">${escapeHtml(r.definisi)}</div></td>
        <td>${escapeHtml(r.indikator)}</td>
        <td>${escapeHtml(r.program)}</td>
        <td>${escapeHtml(r.penilaian)}</td>
        <td>${escapeHtml(r.tahapan)}</td>
        <td>${escapeHtml(r.pic)}</td>
      </tr>
    `).join('');
    countEl.textContent = String(rows.length);
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  // Wire basic buttons (no-op)
  document.getElementById('btn_apply')?.addEventListener('click', () => setStatus('Applied (demo)', 'ok'));
  document.getElementById('btn_reset')?.addEventListener('click', () => setStatus('Reset (demo)', 'ok'));

  // Modal close (demo)
  const editModal = document.getElementById('editModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnCancelEdit = document.getElementById('btnCancelEdit');
  function closeModal() { editModal?.classList.remove('open'); }
  btnCloseModal?.addEventListener('click', closeModal);
  btnCancelEdit?.addEventListener('click', closeModal);

  setStatus('Ready (demo data)', 'ok');
  render();
})();
