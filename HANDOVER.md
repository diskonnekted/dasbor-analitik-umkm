# Handover — Dasbor Analitik UMKM & Ekonomi Lokal

> Dokumen ini merangkum state proyek per sesi terakhir sebelum restart PC. Baca dokumen ini untuk melanjutkan.

## Lokasi & Stack
- **Proyek**: `i:\umkm\aplikasi` (Vite + React 18 + TypeScript)
- **Stack**: Tailwind CSS v4 (via `@tailwindcss/vite`), sql.js (SQLite WASM di browser), Recharts, Leaflet, lucide-react, zustand, react-router-dom v7
- **Tanpa backend** — semua data diolah di peramban.
- **Dokumen PRD/arsitektur**: `i:\umkm\aplikasi\.trae\documents\prd.md` & `tech-arch.md` (sudah disetujui user)

## Status Build (per sesi terakhir)
| Item | Status |
|---|---|
| Scaffold Vite react-ts | ✅ selesai |
| Deps terpasang (`npm install`) | ✅ selesai |
| Tailwind v4 + CSS neo-brutalist (`src/index.css`) | ✅ selesai |
| Data CSV + GeoJSON di `public/data` & `public/geo` | ✅ selesai |
| `public/sql-wasm.wasm` (asset sql.js) | ✅ selesai |
| `src/lib/normalize.ts` | ✅ selesai |
| `src/lib/db.ts` (init sql.js + skema + impor CSV) | ✅ selesai |
| `src/lib/kmeans.ts` | ✅ selesai |
| Komponen UI (`src/components/ui.tsx`, `Header.tsx`, `PetaKlaster.tsx`) | ✅ selesai |
| `src/hooks/useDB.ts` | ✅ selesai |
| `src/pages/Dasbor.tsx` | ✅ selesai (diperbaiki: hapus prop invalid `strokeWidth2`) |
| `src/pages/Klaster.tsx` | ✅ selesai |
| `src/pages/Industri.tsx` | ✅ selesai |
| `src/App.tsx` (routing 3 halaman + footer) | ✅ selesai |
| **Jalankan dev server & verifikasi di browser** | ⏳ BELUM DIJALANKAN — todo berikutnya |

## Cara Lanjut Setelah Restart
1. Buka terminal di `i:\umkm\aplikasi`.
2. Jalankan dev server: `npm run dev` (deps sudah terinstal, tidak perlu `npm install` ulang kecuali `node_modules` terhapus).
3. Buka URL yang ditampilkan (biasanya `http://localhost:5173`).
4. Verifikasi: halaman Dasbor memuat data (stat cards, line chart koperasi, top industri, peta klaster). Bila error, baca bagian "Poin Pengecekan" di bawah.

## Poin Pengecekan (kemungkinan error setelah restart)
- **sql.js gagal load WASM**: pastikan `public/sql-wasm.wasm` ada. `vite.config.ts` sudah set `optimizeDeps.exclude: ['sql.js']` & `assetsInclude: ['**/*.wasm']`. Lokasi wasm di-resolve ke `/sql-wasm.wasm` di `src/lib/db.ts`.
- **CSV tidak ditemukan**: pastikan 7 file ada di `public/data/` (koperasi_aktif, koperasi_detail, industri, pasar, sarana_perdagangan, pdrb_berlaku, laju_pertumbuhan) + `public/geo/peta_kecamatan.geojson`.
- **TS error**: jalankan `npm run check`. Periksa `tsconfig.json` punya path alias `@/*` → `src/*` (dari template vite-init, via `vite-tsconfig-paths`).
- **Hapus sisa template**: file `src/components/Empty.tsx`, `src/hooks/useTheme.ts`, `src/pages/Home.tsx` masih ada dari template — belum dibersihkan. Bisa dihapus (tidak terpakai).
- **Tailwind v4**: tidak ada `tailwind.config.js`/`postcss.config.js` (sudah dihapus). Config lewat `@theme` di `src/index.css` + plugin `@tailwindcss/vite` di `vite.config.ts`.

## Catatan Data (dari analisis CSV asli)
- Sumber CSV: `I:\analiotik\master data\EXCEL + CSV\EXCEL + CSV\15. DISPERINDAGKOP UKM\` + `47. BPS\`.
- **Industri CSV** angka dibungkus quote dengan pemisah ribuan (`"2,062"`), desimal koma (`" 211,5 "` → 211.5). `normalize.ts` menangani via `toNumber()`.
- **Nama komoditas inkonsisten** antar tahun (`Tempe Kedelai`/`Tempe Kedelai`, `Gybsum`/`Gypsum`, `Emping Mlinjo`/`Emping Melinjo`). `normKomoditas()` di `normalize.ts` punya alias map (perlu di-review: mungkin ada kasus tertangkap salah).
- **Industri CSV tidak punya kolom kecamatan** → fitur klaster hanya memakai dimensi koperasi aktif per kecamatan (disebutkan sebagai catatan di halaman Klaster).
- **GeoJSON** punya property `Kecamatan` (lowercase tanpa spasi, mis. `purwarejaklampok`). `normKecamatan()` menyeragamkan key CSV ke format ini.

## Struktur Folder
```
i:\umkm\aplikasi\
├─ .trae\documents\        # PRD + tech-arch (approved)
├─ public\
│  ├─ data\*.csv           # 7 file CSV sumber
│  ├─ geo\peta_kecamatan.geojson
│  └─ sql-wasm.wasm
├─ src\
│  ├─ components\          # ui.tsx, Header.tsx, PetaKlaster.tsx
│  ├─ hooks\               # useDB.ts (+ useTheme.ts sisa template)
│  ├─ lib\                 # db.ts, kmeans.ts, normalize.ts, utils.ts
│  ├─ pages\               # Dasbor.tsx, Klaster.tsx, Industri.tsx (+ Home.tsx sisa)
│  ├─ App.tsx              # routing + footer
│  ├─ index.css            # Tailwind v4 + font + utilities brutalist
│  └─ main.tsx
├─ vite.config.ts          # plugin tailwind v4 + exclude sql.js
└─ package.json
```

## Roadmap Berikutnya (setelah dev server jalan)
1. Verifikasi semua 3 halaman render & data masuk.
2. Tambah dimensi klaster (gabung koperasi + sarana perdagangan) bila sudah ada data per-kecamatan.
3. Tambah halaman/rekomendasi pembinaan UMKM (output sesuai PRD).
4. Optimasi: persist DB SQLite ke IndexedDB (opsional, agar tidak impor ulang tiap reload).
