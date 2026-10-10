# Planning — Pengembangan Analitik UMKM Banjarnegara

Sumber data master: `I:\analiotik\master data\EXCEL + CSV\EXCEL + CSV`
OPD kunci: **15. DISPERINDAGKOP UKM** (paling langsung) + **47. BPS** (konteks makro).

## Data yang sudah dipakai aplikasi
- `Banyaknya Pasar Dirinci Menurut Jenisnya` → tabel `pasar` (2016–2024)
- `Data sarana perdagangan` → tabel `sarana_perdagangan` (2016–2024)
- `Jumlah Perusahaan, Jumlah Tenaga Kerja` → tabel `industri` (per sub-jenis, 2016–2024)
- `Jumlah Koperasi Aktif Menurut Kecamatan` → tabel `koperasi_kec` (2016–2023, OJK)
- `Data Koperasi, Tenaga Kerja, Nilai Investasi` → tabel `koperasi` (agregat)

## Data BARU yang belum dipakai (tahap 1 fokus)
| File | Isi | Nilai |
|---|---|---|
| `15.…/Jumlah Industri…/Sub Jenis CSV.csv` | **Jumlah unit usaha per kecamatan × tahun** (2016–2024, 23 kec) | Fondasi **peta klaster industri per kecamatan** |
| `15.…/Tenaga Kerja…/Tenaga Kerja Dirinci Berdasarkan Jenis Industri CSV.csv` | **Tenaga kerja per sub-jenis × tahun** (2016–2024) | Matriks padat-karya vs padat-moda |
| `15.…/Jumlah Industri…/*.xlsx` (nilai produksi, jumlah perusahaan per sub-jenis) | Nilai produksi per sub-jenis | Ranking sub-jenis terbesar |
| `47. BPS/Nilai dan Kontribusi Lapangan Usaha dalam PDRB (Harga Konstan) 2018-2024` | PDRB per sektor + kontribusi | Peran industri/pertanian di PDRB |
| `47. BPS/Laju Pertumbuhan Ekonomi` | Pertumbuhan 2018–2024 (2020: −1.32%) | Siklus ekonomi |
| `47. BPS/Kemiskinan` / `IPM` / `Gini` / `Pengeluaran Perkapita` | Sosial-ekonomi | Konteks daya beli |

## Tahapan

### Tahap 1 — Peta Spasial + Matriks Industri  ✅ SELESAI
Koreksi: `Sub Jenis CSV.csv` per kecamatan **tidak tersedia** di master data (hanya agregat sub-jenis).
Data per kecamatan yang ADA di DB: `koperasi_aktif` (2016–2023) + `home_industri` (per kategori pangan/sandang/konveksi/jasa).
- [x] `PetaSpasial.tsx` — Leaflet choropleth per kecamatan (toggle Koperasi Aktif / Home Industri), filter tahun
- [x] `Spasial.tsx` tab Matriks — scatter Unit Usaha × Tenaga Kerja × Nilai Produksi per sub-jenis (dari tabel `industri` agregat)
- [x] Halaman `/spasial` (tab: Peta Spasial + Matriks) + route + nav "Spasial"
- [x] Typecheck + build bersih (`tsc --noEmit` exit 0; `/spasial` HTTP 200)

### Tahap 2 — Dashbord Makro UMKM (BPS)  ✅ SELESAI
- [x] Tabel `pdrb` (berlaku + konstan), `ipm`, `gini`, `pertumbuhan`, `pop_miskin`, `garis_kemiskinan`, `indeks_kedalaman`, `indeks_keparahan`
- [x] Halaman `/makro`: 6 stat card + PDRB per sektor (bar, toggle harga), pertumbuhan (area), kemiskinan (dual-axis line), IPM (area), Gini (line)
- [x] Route `/makro` + nav "Makro"
- [x] Typecheck + build bersih (`tsc --noEmit` exit 0; `/makro` HTTP 200)

### Tahap 3 — Korelasi Koperasi ↔ Industri + Prediksi  ✅ SELESAI
- [x] Korelasi per kecamatan (koperasi vs industri) — scatter + Pearson r, garis regresi
- [x] Prediksi tren 1–2 tahun (regresi linear sederhana per indikator) — agregat + per-kecamatan, segmen proyeksi putus-putus
- [x] Filter silang global (tahun + kecamatan + jenis) — select tahun / kecamatan / horizon
- Halaman: `src/pages/Korelasi.tsx` (route `/korelasi`, nav "Korelasi")

### Tahap 4 — Gap analysis pasar + inflasi
- [ ] Pertumbuhan pasar modern vs tradisional (peluang investasi) — **DITUNDA**: tidak ada dataset pasar modern/tradisional di master data (pasar.csv & sarana_perdagangan.csv = struktur sarana, bukan transaksi). Butuh data baru (jumlah/penjualan minimarket vs pasar/warung per kecamatan).
- [x] Inflasi & daya beli (perbandingan antar-kabupaten) — SELESAI. Halaman `src/pages/Inflasi.tsx` (route `/inflasi`, nav "Inflasi"). Tabel baru db.ts: `inflasi` + `pengeluaran_perkapita` (long-form tahun+wilayah+nilai); sumber BPS Perbandingan Laju Inflasi + Perbandingan Pengeluaran Perkapita (2018–2024).

**Catatan Tahap 4 (data):**
- **Inflasi Banjarnegara = "—" seluruh tahun** di dataset BPS ini; hanya pembanding (Cilacap, Banyumas, Wonosobo, Jateng, Nasional) yang bernilai. Halaman menampilkan seri pembanding + callout keterbatasan.
- **Pengeluaran per kapita (proksi daya beli) tersedia untuk Banjarnegara** → fokus utama. Banja terendah: Rp 9,16rb (2018) → Rp 10,59rb (2024), CAGR 1,5%/th; celah vs Jateng melebar ±19% (2018) → ±30% (2024).
- Korelasi kuantitatif inflasi↔daya beli **Banjarnegara ditunda** (inflasi lokal null). Helper `getInflasiTren/getPengeluaranTren` sudah siap — saat data inflasi lokal tersedia, Pearson bisa langsung ditambah.

## Catatan data
- `Sub Jenis CSV.csv`: tahun 2016–2024; 2016/2018/2022/2024 adalah blok terpisah per kecamatan (nilai = jumlah unit usaha); tahun lain (2017,2019,2020,2021,2023) hanya agregat kabupaten → peta hanya bisa untuk tahun blok (2016,2018,2022,2024).
- Nama kecamatan di CSV: 23 (termasuk Kalijering); GeoJSON peta: 20. → mapping case-insensitive, abaikan yang tidak cocok.
- Data agregat = unit usaha, bukan koordinat riil.
