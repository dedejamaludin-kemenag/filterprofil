# Pontren Data Explorer (Program Pontren)

## Fitur utama
- Filter & pencarian data `program_pontren`
- Edit/tambah/hapus data
- Import Excel (merge berdasarkan unik `profil + program`)
- Tabel hasil dengan **header kolom sticky** dan panel filter **scroll vertikal**

## Modul Dokumen & Bukti (SOP/IK/Record)
Aplikasi menyediakan modal **"Dokumen & Bukti"** untuk:
- Upload dokumen SOP (PDF/DOCX)
- Upload dokumen Instruksi Kerja (IK) (PDF/DOCX)
- Tambah record bukti (log kejadian + lampiran opsional)

### 1) Jalankan migrasi SQL
Jalankan file:
- `sql/migrations_program_docs_records.sql`

Ini akan membuat tabel:
- `public.program_pontren_docs`
- `public.program_pontren_records`

### 2) Siapkan Supabase Storage
Buat bucket storage bernama `pontren_docs`.

Jika bucket berbeda, ubah konstanta di `app.js`:
- `STORAGE_BUCKET`

### 3) Catatan keamanan
Repo ini memakai **Supabase anon key** (tanpa login), jadi:
- Jika bucket PUBLIC: link file bisa dibuka via public url.
- Jika bucket PRIVATE: butuh storage policy yang mengizinkan signed url/read untuk role yang digunakan.

Disarankan untuk produksi: tambahkan autentikasi + policy berbasis role.
