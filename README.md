# prokom-kelompok-M

Aplikasi dashboard command center darurat untuk dispatch ambulans, monitoring rumah sakit, smart routing, tracking perjalanan, dan analitik operasional.

## Stack
- Frontend: HTML5, CSS3, JavaScript, Bootstrap 5, Leaflet, Chart.js
- Backend: Node.js, Express, Socket.io
- Database: SQL schema dan seed untuk PostgreSQL/MySQL-style relational setup
- Realtime: Socket.io

## Fitur
- Dashboard monitoring realtime ambulans dan rumah sakit
- Dispatch ambulans otomatis berdasarkan lokasi dan ketersediaan
- Smart routing berbasis data lalu lintas simulasi realtime
- Tracking perjalanan dan event operasional
- Analitik performa layanan
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

## Menjalankan Aplikasi
1. Install dependensi:
	```bash
	npm install
	```
2. Jalankan server:
	```bash
	npm start
	```
3. Buka:
	```text
	http://localhost:3000
	```

## Endpoint API
- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/ambulances`
- `GET /api/hospitals`
- `GET /api/incidents`
- `GET /api/analytics`
- `POST /api/dispatch`
- `POST /api/hospitals/:id/capacity`
- `POST /api/ambulances/:id/status`

## Data Dummy
- 5 ambulans dummy
- 5 rumah sakit dummy
- riwayat insiden dan event operasional dummy

## Catatan Implementasi
- Aplikasi berjalan tanpa database eksternal agar langsung bisa dicoba.
- File SQL disediakan sebagai dasar integrasi PostgreSQL/MySQL bila ingin dipindahkan ke database server.
- Peta menggunakan Leaflet dengan tile OSM/CARTO dan update realtime via Socket.io.