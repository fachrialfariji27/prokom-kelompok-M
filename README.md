# SIGAP Ambulans Semarang

Aplikasi web berbasis peta untuk mencari fasilitas kesehatan terdekat di Kota Semarang, memesan ambulans darurat, dan memantau pergerakan ambulans secara realtime.

## Teknologi
- Frontend: HTML, CSS, JavaScript, Bootstrap 5
- Peta: Leaflet.js + OpenStreetMap
- Backend: Node.js + Express + Socket.io
- Database: MySQL schema dan seed tersedia di folder `sql/`

## Fitur Utama
- Deteksi lokasi pengguna via GPS
- Peta interaktif untuk rumah sakit, klinik, ambulans, dan rute perjalanan
- Pencarian fasilitas terdekat berdasarkan jarak dan ketersediaan ambulans
- Form pemesanan ambulans dengan Bahasa Indonesia
- Tracking ambulans realtime dengan simulasi GPS
- Dashboard admin untuk tambah dan ubah data rumah sakit, klinik, dan ambulans
- Riwayat pemesanan ambulans
- Dark mode dan tampilan responsif mobile/desktop

## Struktur Folder
```text
.
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── sql/
│   ├── schema.sql
│   └── seed.sql
├── src/
│   └── data/
│       └── seed.js
├── server.js
├── package.json
└── README.md
```

## Cara Menjalankan
1. Install dependensi:
	```bash
	npm install
	```
2. Jalankan server:
	```bash
	npm start
	```
3. Buka aplikasi:
	```text
	http://localhost:3000
	```

## Endpoint API
- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/fasilitas`
- `GET /api/lokasi-saya`
- `POST /api/lokasi-saya`
- `GET /api/riwayat-pemesanan`
- `GET /api/tracking/:id`
- `POST /api/pemesanan-ambulans`
- `POST /api/admin/rumah-sakit`
- `POST /api/admin/klinik`
- `POST /api/admin/ambulans`
- `PATCH /api/hospitals/:id/capacity`
- `PATCH /api/clinics/:id/capacity`
- `PATCH /api/ambulances/:id/status`

## Database
Gunakan file berikut untuk membuat database MySQL:
- `sql/schema.sql`
- `sql/seed.sql`

## Data Dummy
- Rumah sakit Kota Semarang
- Klinik Kota Semarang
- Ambulans dummy Semarang
- Riwayat pemesanan ambulans dummy

## Catatan
- Aplikasi ini memakai data simulasi realtime agar bisa langsung dijalankan tanpa konfigurasi tambahan.
- Jika ingin dihubungkan ke MySQL, gunakan skema dan seed di folder `sql/` sebagai dasar integrasi.