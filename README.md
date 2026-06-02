# Panduan Setup Lokal - Website Toko Hamster

Repositori ini adalah proyek mata kuliah **Database Design**. Ikuti panduan di bawah ini untuk menjalankan aplikasi (Backend Django & Frontend Next.js) di komputer lokal Anda.

## ⚠️ Persyaratan Awal
Sebelum memulai, pastikan komputer Anda sudah terinstall:
- **Python** (versi 3.9 atau lebih baru)
- **Node.js** (versi 18 atau lebih baru)
- **Git**

---

## 🚀 Langkah Instalasi

### 1. Clone Repositori
Buka terminal/command prompt, lalu jalankan:
```bash
git clone <URL_GITHUB_REPO_INI>
cd website_toko_hamster
```
*(Catatan: Ganti `<URL_GITHUB_REPO_INI>` dengan URL dari repositori ini)*

### 2. Dapatkan File Rahasia (PENTING!)
Ada beberapa file yang tidak di-upload ke GitHub demi keamanan dan data lokal. Anda **wajib** meminta 3 file ini kepada pengelola repositori dan meletakkannya di posisi yang tepat:
- `db.sqlite3` ➔ Letakkan di **folder utama/root**. (Berisi semua data produk, transaksi, & admin agar Anda tidak perlu input ulang).
- `.env` ➔ Letakkan di **folder utama/root**. (Berisi Secret Key Django & kredensial Cloudinary).
- `.env.local` ➔ Letakkan di dalam **folder `frontend/`**.

### 3. Install Dependencies Backend (Django)
Pastikan Anda berada di folder utama proyek, lalu jalankan:
```bash
# (Opsional tapi sangat disarankan) Buat dan aktifkan Virtual Environment
# python -m venv venv
# source venv/bin/activate  # Untuk Mac/Linux
# venv\Scripts\activate     # Untuk Windows

# Install semua library Python yang dibutuhkan
pip install -r requirements.txt
```

### 4. Install Dependencies Frontend (Next.js)
Masuk ke folder `frontend` dan install paket Node:
```bash
cd frontend
npm install
cd ..
```

---

## 🏃‍♂️ Cara Menjalankan Aplikasi

Terdapat sebuah script bernama `start_server.sh` di folder utama yang dibuat untuk menjalankan backend dan frontend secara bersamaan.

### Menggunakan Script (Mac/Linux)
Pastikan Anda berada di folder utama proyek:
```bash
bash start_server.sh
```

### Menjalankan Manual (Untuk Windows / Jika Script Bermasalah)
Jika Anda menggunakan Windows atau script gagal berjalan, buka **2 Tab Terminal** terpisah.

**Terminal 1 (Backend):**
```bash
# Pastikan berada di folder utama proyek
python manage.py runserver
```
*(Backend akan berjalan di http://localhost:8000)*

**Terminal 2 (Frontend):**
```bash
# Pastikan masuk ke folder frontend terlebih dahulu
cd frontend
npm run dev
```
*(Frontend akan berjalan di http://localhost:3000)*

---

**Selamat mencoba!** Hubungi rekan kelompok jika ada kendala saat setup.
