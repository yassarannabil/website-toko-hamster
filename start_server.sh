#!/usr/bin/env bash
# Skrip untuk menjalankan Django dan Next.js secara bersamaan

# Bersihkan port jika ada server yang nyangkut dari sebelumnya
echo "Membersihkan port 3000 dan 8000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

echo "🐹 Memulai Server Noska Hamster..."

# Jalankan Django di background (menggunakan 'python' agar sesuai environment aktif)
python manage.py runserver 8000 &
DJANGO_PID=$!

# Pindah ke frontend dan jalankan Next.js
cd frontend
npm run dev &
NEXT_PID=$!
cd ..

echo ""
echo "======================================================="
echo "✅ Server Noska Hamster Aktif!"
echo "   Lokal   : http://localhost:3000"
echo "   Admin   : http://localhost:8000/admin/"
echo "======================================================="
echo "Tekan CTRL+C untuk mematikan semua server."

# Tangkap signal CTRL+C untuk mematikan semua background proses
trap "kill $DJANGO_PID $NEXT_PID 2>/dev/null" SIGINT

# Tunggu proses selesai
wait $DJANGO_PID $NEXT_PID
