// src/lib/db.ts
// Inisialisasi SQLite (sql.js) di browser, buat skema, impor CSV dari /public/data.

import type { Database, SqlJsStatic } from "sql.js";
import { col, normKecamatan, normKomoditas, parseCSV, toNumber } from "./normalize";

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;

/** Load sql.js (UMD versi browser) via script injection, karena bukan ESM. */
async function loadSqlJs(): Promise<SqlJsStatic> {
  if (SQL) return SQL;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-sqljs]');
    if (existing) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = "/sql-wasm-browser.js";
    s.dataset.sqljs = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Gagal memuat sql.js script"));
    document.head.appendChild(s);
  });
  const w = window as unknown as { initSqlJs?: (cfg: { locateFile: () => string }) => Promise<SqlJsStatic> };
  if (!w.initSqlJs) throw new Error("initSqlJs tidak tersedia di window");
  SQL = await w.initSqlJs({ locateFile: () => "/sql-wasm.wasm" });
  return SQL;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS kecamatan (nama TEXT PRIMARY KEY, kode TEXT);
CREATE TABLE IF NOT EXISTS koperasi_aktif (
  id INTEGER PRIMARY KEY AUTOINCREMENT, kecamatan TEXT, jumlah INTEGER, tahun INTEGER
);
CREATE INDEX IF NOT EXISTS idx_kopaktif_tahun ON koperasi_aktif(tahun);

CREATE TABLE IF NOT EXISTS koperasi_detail (
  id INTEGER PRIMARY KEY AUTOINCREMENT, jenis TEXT, jumlah_unit INTEGER,
  tenaga_kerja INTEGER, shu REAL, tahun INTEGER
);

CREATE TABLE IF NOT EXISTS industri (
  id INTEGER PRIMARY KEY AUTOINCREMENT, jenis_normalized TEXT, jenis_raw TEXT,
  jumlah_perusahaan INTEGER, tenaga_kerja INTEGER, nilai_investasi REAL,
  produksi REAL, tahun INTEGER
);
CREATE INDEX IF NOT EXISTS idx_industri_tahun ON industri(tahun);
CREATE INDEX IF NOT EXISTS idx_industri_jenis ON industri(jenis_normalized);

CREATE TABLE IF NOT EXISTS pasar (id INTEGER PRIMARY KEY AUTOINCREMENT, jenis TEXT, jumlah INTEGER, tahun INTEGER);
CREATE TABLE IF NOT EXISTS home_industri (
  id INTEGER PRIMARY KEY AUTOINCREMENT, kecamatan TEXT,
  pangan INTEGER, sandang INTEGER, konveksi INTEGER, jasa INTEGER, lain INTEGER, jumlah INTEGER, tahun INTEGER
);
CREATE INDEX IF NOT EXISTS idx_homeind_kec ON home_industri(kecamatan, tahun);
CREATE TABLE IF NOT EXISTS rumah_makan (
  id INTEGER PRIMARY KEY AUTOINCREMENT, kecamatan TEXT, jumlah INTEGER, tahun INTEGER
);
CREATE INDEX IF NOT EXISTS idx_rumahmakan_kec ON rumah_makan(kecamatan, tahun);
CREATE TABLE IF NOT EXISTS dana_desa (
  id INTEGER PRIMARY KEY AUTOINCREMENT, kecamatan TEXT, jumlah INTEGER, tahun INTEGER
);
CREATE INDEX IF NOT EXISTS idx_danadesa_kec ON dana_desa(kecamatan, tahun);
CREATE TABLE IF NOT EXISTS sarana_perdagangan (id INTEGER PRIMARY KEY AUTOINCREMENT, jenis TEXT, jumlah INTEGER, tahun INTEGER);
CREATE TABLE IF NOT EXISTS makro (
  id INTEGER PRIMARY KEY AUTOINCREMENT, tahun INTEGER, sektor TEXT, nilai REAL, kontribusi REAL
);
CREATE TABLE IF NOT EXISTS pertumbuhan (
  id INTEGER PRIMARY KEY AUTOINCREMENT, tahun INTEGER, wilayah TEXT, laju REAL
);

-- Data makro BPS (long-form, tahun+nilai) — Tahap 2 dashboard
CREATE TABLE IF NOT EXISTS ipm (tahun INTEGER PRIMARY KEY, nilai REAL);
CREATE TABLE IF NOT EXISTS gini (tahun INTEGER PRIMARY KEY, nilai REAL);
CREATE TABLE IF NOT EXISTS garis_kemiskinan (tahun INTEGER PRIMARY KEY, nilai REAL);
CREATE TABLE IF NOT EXISTS pop_miskin (tahun INTEGER PRIMARY KEY, jumlah INTEGER, proporsi REAL);
CREATE TABLE IF NOT EXISTS indeks_kedalaman (tahun INTEGER PRIMARY KEY, nilai REAL);
CREATE TABLE IF NOT EXISTS indeks_keparahan (tahun INTEGER PRIMARY KEY, nilai REAL);
CREATE TABLE IF NOT EXISTS pdrb (
  id INTEGER PRIMARY KEY AUTOINCREMENT, tahun INTEGER, sektor TEXT,
  nilai REAL, kontribusi REAL, jenis TEXT  -- 'berlaku' | 'konstan'
);
CREATE INDEX IF NOT EXISTS idx_pdrb_tahun ON pdrb(tahun, jenis);

-- Tahap 4: inflasi & daya beli (long-form, tahun+wilayah) — sumber BPS Perbandingan Laju Inflasi
CREATE TABLE IF NOT EXISTS inflasi (
  id INTEGER PRIMARY KEY AUTOINCREMENT, tahun INTEGER, wilayah TEXT, nilai REAL
);
CREATE INDEX IF NOT EXISTS idx_inflasi_tahun ON inflasi(tahun);
-- Tahap 4: pengeluaran per kapita (long-form, tahun+wilayah) — sumber BPS Perbandingan Pengeluaran Perkapita
CREATE TABLE IF NOT EXISTS pengeluaran_perkapita (
  id INTEGER PRIMARY KEY AUTOINCREMENT, tahun INTEGER, wilayah TEXT, nilai REAL
);
CREATE INDEX IF NOT EXISTS idx_pengeluaran_tahun ON pengeluaran_perkapita(tahun);
`;

async function fetchText(path: string): Promise<string> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Gagal memuat ${path}: ${res.status}`);
  return res.text();
}

function insertRun(sql: string, params: (string | number | null)[]) {
  if (!db) throw new Error("DB belum siap");
  db.run(sql, params);
}

function importKoperasiAktif(text: string) {
  const { headers, rows } = parseCSV(text);
  const kec = new Set<string>();
  for (const r of rows) {
    const nama = normKecamatan(col(r, headers, "Kecamatan"));
    const jumlah = toNumber(col(r, headers, "Jumlah"));
    const tahun = toNumber(col(r, headers, "Tahun"));
    if (!nama || !tahun) continue;
    kec.add(nama);
    insertRun(
      "INSERT INTO koperasi_aktif (kecamatan,jumlah,tahun) VALUES (?,?,?)",
      [nama, jumlah ?? 0, tahun]
    );
  }
  kec.forEach((k) => insertRun("INSERT OR IGNORE INTO kecamatan (nama) VALUES (?)", [k]));
}

function importKoperasiDetail(text: string) {
  const { headers, rows } = parseCSV(text);
  for (const r of rows) {
    const jenis = col(r, headers, "Jenis Koperasi").replace(/^-\s*/, "").trim() || col(r, headers, "Jenis");
    const unit = toNumber(col(r, headers, "Jumlah Unit Koperasi"));
    const tk = toNumber(col(r, headers, "Jumlah Tenaga Kerja"));
    const shu = toNumber(col(r, headers, "Besarnya SHU"));
    const tahun = toNumber(col(r, headers, "Tahun"));
    if (!jenis || !tahun) continue;
    insertRun(
      "INSERT INTO koperasi_detail (jenis,jumlah_unit,tenaga_kerja,shu,tahun) VALUES (?,?,?,?,?)",
      [jenis, unit, tk, shu, tahun]
    );
  }
}

function importIndustri(text: string) {
  const { headers, rows } = parseCSV(text);
  for (const r of rows) {
    const raw = col(r, headers, "Jenis Industri");
    const jenis = normKomoditas(raw);
    const jml = toNumber(col(r, headers, "Jumlah Perusahaan"));
    const tk = toNumber(col(r, headers, "Jumlah Tenaga Kerja"));
    const inv = toNumber(col(r, headers, "Nilai Investasi (Juta Rp)"));
    const prod = toNumber(col(r, headers, "Produksi"));
    const tahun = toNumber(col(r, headers, "Tahun"));
    if (!jenis || !tahun) continue;
    insertRun(
      "INSERT INTO industri (jenis_normalized,jenis_raw,jumlah_perusahaan,tenaga_kerja,nilai_investasi,produksi,tahun) VALUES (?,?,?,?,?,?,?)",
      [jenis, raw, jml, tk, inv, prod, tahun]
    );
  }
}

function importPasar(text: string) {
  const { headers, rows } = parseCSV(text);
  for (const r of rows) {
    const jenis = col(r, headers, "Jenis Pasar");
    const jumlah = toNumber(col(r, headers, "Jumlah Pasar"));
    const tahun = toNumber(col(r, headers, "Tahun"));
    if (!jenis || !tahun) continue;
    insertRun("INSERT INTO pasar (jenis,jumlah,tahun) VALUES (?,?,?)", [jenis, jumlah, tahun]);
  }
}

function importHomeIndustri(text: string) {
  const { headers, rows } = parseCSV(text);
  for (const r of rows) {
    const nama = normKecamatan(col(r, headers, "Kecamatan"));
    const tahun = toNumber(col(r, headers, "Tahun"));
    if (!nama || !tahun) continue;
    const pangan = toNumber(col(r, headers, "Pangan")) ?? 0;
    const sandang = toNumber(col(r, headers, "Sandang")) ?? 0;
    const konveksi = toNumber(col(r, headers, "Konveksi")) ?? 0;
    const jasa = toNumber(col(r, headers, "Jasa")) ?? 0;
    const lain = toNumber(col(r, headers, "Lain-Lain")) ?? 0;
    const jumlah = toNumber(col(r, headers, "Jumlah Percontohan Home Industri")) ?? 0;
    insertRun(
      "INSERT INTO home_industri (kecamatan,pangan,sandang,konveksi,jasa,lain,jumlah,tahun) VALUES (?,?,?,?,?,?,?,?)",
      [nama, pangan, sandang, konveksi, jasa, lain, jumlah, tahun]
    );
    insertRun("INSERT OR IGNORE INTO kecamatan (nama) VALUES (?)", [nama]);
  }
}

function importRumahMakan(text: string) {
  for (const r of parseCSV(text).rows) {
    if (r[0] === "Kecamatan") continue;
    const nama = normKecamatan(r[0]);
    const tahun = toNumber(r[2]);
    if (!nama || tahun == null) continue;
    const jumlah = toNumber(r[1]) ?? 0;
    insertRun("INSERT INTO rumah_makan (kecamatan,jumlah,tahun) VALUES (?,?,?)", [nama, jumlah, tahun]);
    insertRun("INSERT OR IGNORE INTO kecamatan (nama) VALUES (?)", [nama]);
  }
}

function importDanaDesa(text: string) {
  for (const r of parseCSV(text).rows) {
    if (r[0] === "Kecamatan ") continue;
    const nama = normKecamatan(r[0]);
    const tahun = toNumber(r[2]);
    if (!nama || tahun == null) continue;
    const jumlah = toNumber(r[1]) ?? 0;
    insertRun("INSERT INTO dana_desa (kecamatan,jumlah,tahun) VALUES (?,?,?)", [nama, jumlah, tahun]);
    insertRun("INSERT OR IGNORE INTO kecamatan (nama) VALUES (?)", [nama]);
  }
}

function importSarana(text: string) {
  const { headers, rows } = parseCSV(text);
  for (const r of rows) {
    const jenis = col(r, headers, "Jenis Sarana Perdagangan");
    const jumlah = toNumber(col(r, headers, "Jumlah Sarana Perdagangan"));
    const tahun = toNumber(col(r, headers, "Tahun"));
    if (!jenis || !tahun) continue;
    insertRun("INSERT INTO sarana_perdagangan (jenis,jumlah,tahun) VALUES (?,?,?)", [jenis, jumlah, tahun]);
  }
}

function importMakro(text: string) {
  const { headers, rows } = parseCSV(text);
  for (const r of rows) {
    const sektor = col(r, headers, "Sektor");
    const nilai = toNumber(col(r, headers, "Rp"));
    const kontribusi = toNumber(col(r, headers, "%"));
    const tahun = toNumber(col(r, headers, "Tahun"));
    if (!sektor || !tahun) continue;
    insertRun("INSERT INTO makro (tahun,sektor,nilai,kontribusi) VALUES (?,?,?,?)", [tahun, sektor, nilai, kontribusi]);
  }
}

function importPertumbuhan(text: string) {
  const { headers, rows } = parseCSV(text);
  for (const r of rows) {
    const tahun = toNumber(col(r, headers, "Tahun"));
    const laju = toNumber(col(r, headers, "Laju Pertumbuhan Ekonomi"));
    const wilayah = col(r, headers, "Kabupaten") || col(r, headers, "Wilayah");
    if (!tahun) continue;
    insertRun("INSERT INTO pertumbuhan (tahun,wilayah,laju) VALUES (?,?,?)", [tahun, wilayah, laju]);
  }
}

// ---- Importer Tahap 2: data makro BPS long-form ----
function importPdrb(text: string, jenis: "berlaku" | "konstan") {
  const { headers, rows } = parseCSV(text);
  for (const r of rows) {
    const sektor = col(r, headers, "Sektor");
    const nilai = toNumber(col(r, headers, "Nilai"));
    const kontribusi = toNumber(col(r, headers, "Kontribusi"));
    const tahun = toNumber(col(r, headers, "Tahun"));
    if (!sektor || !tahun) continue;
    insertRun(
      "INSERT INTO pdrb (tahun,sektor,nilai,kontribusi,jenis) VALUES (?,?,?,?,?)",
      [tahun, sektor, nilai, kontribusi, jenis]
    );
    // juga ke tabel makro (untuk getStatCards), hanya harga berlaku
    if (jenis === "berlaku") {
      insertRun(
        "INSERT INTO makro (tahun,sektor,nilai,kontribusi) VALUES (?,?,?,?)",
        [tahun, sektor, nilai, kontribusi]
      );
    }
  }
}

function importTahunNilai(text: string, table: string, nilaiCol: string, jumlahCol?: string) {
  const { headers, rows } = parseCSV(text);
  for (const r of rows) {
    const tahun = toNumber(col(r, headers, "Tahun"));
    const nilai = toNumber(col(r, headers, nilaiCol));
    if (!tahun) continue;
    if (jumlahCol) {
      const jumlah = toNumber(col(r, headers, jumlahCol)) ?? 0;
      insertRun(`INSERT INTO ${table} (tahun,jumlah,proporsi) VALUES (?,?,?)`, [tahun, jumlah, nilai]);
    } else {
      insertRun(`INSERT INTO ${table} (tahun,nilai) VALUES (?,?)`, [tahun, nilai]);
    }
  }
}

/** Tahap 4 — long-form tahun+wilayah+nilai untuk inflasi & pengeluaran per kapita. Nilai "-" jadi NULL (Banjarnegara tidak punya data inflasi). */
function importTahunWilayahNilai(text: string, table: string, nilaiCol: string) {
  const { headers, rows } = parseCSV(text);
  const nilaiIdx = headers.findIndex((h) => h.trim().toLowerCase() === nilaiCol.toLowerCase());
  for (const r of rows) {
    const tahun = toNumber(r[0]);
    if (!tahun) continue;
    insertRun(`INSERT INTO ${table} (tahun,wilayah,nilai) VALUES (?,?,?)`, [tahun, r[1] ?? "", toNumber(r[nilaiIdx])]);
  }
}

/**
 * Long-format BPS "perbandingan" (baris = 1 wilayah × 1 tahun).
 * Kolom ditemukan dari NAMA header (bukan posisi): "Tahun" → tahun, nilaiCol → nilai,
 * sisanya (Pembanding / Kabupaten / Wilayah) → wilayah.
 */
function importPerbandingan(text: string, table: string, nilaiCol: string) {
  const { headers, rows } = parseCSV(text);
  const low = headers.map((h) => h.trim().toLowerCase());
  const tahunIdx = low.findIndex((h) => h === "tahun");
  const nilIdx = low.findIndex((h) => h === nilaiCol.toLowerCase());
  if (tahunIdx < 0 || nilIdx < 0) throw new Error(`header Tahun/${nilaiCol} tidak ada`);
  let wilIdx = low.findIndex((h) => h === "pembanding" || h === "kabupaten" || h === "wilayah");
  if (wilIdx < 0) wilIdx = tahunIdx === 0 ? 2 : 0;
  for (const r of rows) {
    const tahun = toNumber(r[tahunIdx]);
    if (!tahun) continue;
    insertRun(`INSERT INTO ${table} (tahun,wilayah,nilai) VALUES (?,?,?)`, [
      tahun,
      (r[wilIdx] ?? "").trim(),
      toNumber(r[nilIdx]),
    ]);
  }
}


export async function initDB(): Promise<Database> {
  if (db) return db;
  if (!SQL) {
    SQL = await loadSqlJs();
  }
  db = new SQL.Database();
  db.run(SCHEMA);

  const files = [
    { path: "/data/koperasi_aktif.csv", fn: importKoperasiAktif },
    { path: "/data/koperasi_detail.csv", fn: importKoperasiDetail },
    { path: "/data/industri.csv", fn: importIndustri },
    { path: "/data/pasar.csv", fn: importPasar },
    { path: "/data/home_industri.csv", fn: importHomeIndustri },
    { path: "/data/rumah_makan.csv", fn: importRumahMakan },
    { path: "/data/dana_desa.csv", fn: importDanaDesa },
    { path: "/data/sarana_perdagangan.csv", fn: importSarana },
    { path: "/data/laju_pertumbuhan.csv", fn: importPertumbuhan },
    { path: "/data/pdrb_berlaku.csv", fn: (t: string) => importPdrb(t, "berlaku") },
    { path: "/data/pdrb_konstan.csv", fn: (t: string) => importPdrb(t, "konstan") },
    { path: "/data/ipm.csv", fn: (t: string) => importTahunNilai(t, "ipm", "Nilai") },
    { path: "/data/gini.csv", fn: (t: string) => importTahunNilai(t, "gini", "Nilai") },
    { path: "/data/garis_kemiskinan.csv", fn: (t: string) => importTahunNilai(t, "garis_kemiskinan", "GarisKemiskinan") },
    { path: "/data/pop_miskin.csv", fn: (t: string) => importTahunNilai(t, "pop_miskin", "ProsentasePendudukMiskin", "JumlahPendudukMiskin") },
    { path: "/data/indeks_kedalaman.csv", fn: (t: string) => importTahunNilai(t, "indeks_kedalaman", "IndeksKedalaman") },
    { path: "/data/indeks_keparahan.csv", fn: (t: string) => importTahunNilai(t, "indeks_keparahan", "IndeksKeparahan") },
    { path: "/data/inflasi.csv", fn: (t: string) => importPerbandingan(t, "inflasi", "Inflasi") },
    { path: "/data/pengeluaran_perkapita.csv", fn: (t: string) => importPerbandingan(t, "pengeluaran_perkapita", "Pengeluaran Perkapita (Rp)") },
  ] as const;

  for (const f of files) {
    try {
      f.fn(await fetchText(f.path));
    } catch (e) {
      console.warn("Gagal impor", f.path, e);
    }
  }
  return db;
}

export function getDB(): Database {
  if (!db) throw new Error("DB belum diinisialisasi. Panggil initDB() dulu.");
  return db;
}

/** Jalankan SELECT dan kembalikan array of objek. */
export function query<T = Record<string, unknown>>(sql: string, params: (string | number | null)[] = []): T[] {
  const d = getDB();
  const stmt = d.prepare(sql);
  stmt.bind(params);
  const out: T[] = [];
  while (stmt.step()) {
    out.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return out;
}

// === Query siap pakai untuk dashboard ===

export function getStatCards() {
  const koperasi = query<{ jml: number }>(
    "SELECT COALESCE(SUM(jumlah),0) jml FROM koperasi_aktif WHERE tahun=(SELECT MAX(tahun) FROM koperasi_aktif)"
  )[0]?.jml ?? 0;
  const industri = query<{ jml: number; tk: number }>(
    "SELECT COALESCE(SUM(jumlah_perusahaan),0) jml, COALESCE(SUM(tenaga_kerja),0) tk FROM industri WHERE tahun=(SELECT MAX(tahun) FROM industri)"
  )[0];
  const tahunMakro = query<{ t: number }>("SELECT MAX(tahun) t FROM makro")[0]?.t;
  const kontribusi = tahunMakro
    ? query<{ k: number }>("SELECT kontribusi k FROM makro WHERE tahun=? AND sektor LIKE '%Perdagangan%' ORDER BY kontribusi DESC LIMIT 1", [tahunMakro])[0]?.k
    : null;
  return {
    tahunKoperasi: query<{ t: number }>("SELECT MAX(tahun) t FROM koperasi_aktif")[0]?.t,
    koperasiAktif: koperasi,
    tahunIndustri: query<{ t: number }>("SELECT MAX(tahun) t FROM industri")[0]?.t,
    industriUnit: industri?.jml ?? 0,
    tenagaKerja: industri?.tk ?? 0,
    kontribusiPerdagangan: kontribusi,
  };
}

export function getKoperasiTren() {
  return query<{ kecamatan: string; tahun: number; jumlah: number }>(
    "SELECT kecamatan, tahun, jumlah FROM koperasi_aktif ORDER BY tahun, kecamatan"
  );
}

export function getTopIndustri(tahun: number, limit = 10, by: "tenaga_kerja" | "nilai_investasi" | "produksi" = "tenaga_kerja") {
  return query<{ jenis_normalized: string; total: number }>(
    `SELECT jenis_normalized, SUM(${by}) total FROM industri WHERE tahun=? GROUP BY jenis_normalized ORDER BY total DESC LIMIT ?`,
    [tahun, limit]
  );
}

export function getIndustriTahunList() {
  return query<{ t: number }>("SELECT DISTINCT tahun t FROM industri ORDER BY t").map((r) => r.t);
}

export function getIndustriList(tahun: number | "all" = "all") {
  if (tahun === "all") {
    return query<{ jenis_normalized: string; jml: number; tk: number; inv: number; prod: number }>(
      "SELECT jenis_normalized, SUM(jumlah_perusahaan) jml, SUM(tenaga_kerja) tk, SUM(nilai_investasi) inv, SUM(produksi) prod FROM industri GROUP BY jenis_normalized ORDER BY tk DESC"
    );
  }
  return query<{ jenis_normalized: string; jml: number; tk: number; inv: number; prod: number }>(
    "SELECT jenis_normalized, SUM(jumlah_perusahaan) jml, SUM(tenaga_kerja) tk, SUM(nilai_investasi) inv, SUM(produksi) prod FROM industri WHERE tahun=? GROUP BY jenis_normalized ORDER BY tk DESC",
    [tahun]
  );
}

export interface KlasterRow {
  kecamatan: string;
  koperasi: number;
  homeIndustri: number;
  pangan: number;
  sandang: number;
  konveksi: number;
  jasa: number;
}

export function getKlasterDataset(): KlasterRow[] {
  const tahunKop = query<{ t: number }>("SELECT MAX(tahun) t FROM koperasi_aktif")[0]?.t;
  const tahunHi = query<{ t: number }>("SELECT MAX(tahun) t FROM home_industri")[0]?.t;
  const kop = query<{ kecamatan: string; jumlah: number }>(
    "SELECT kecamatan, jumlah FROM koperasi_aktif WHERE tahun=?",
    [tahunKop]
  );
  const hi = query<{ kecamatan: string; jumlah: number; pangan: number; sandang: number; konveksi: number; jasa: number }>(
    "SELECT kecamatan, jumlah, pangan, sandang, konveksi, jasa FROM home_industri WHERE tahun=?",
    [tahunHi]
  );
  const hiMap = new Map(hi.map((h) => [h.kecamatan, h]));
  return kop.map((k) => {
    const h = hiMap.get(k.kecamatan);
    return {
      kecamatan: k.kecamatan,
      koperasi: k.jumlah,
      homeIndustri: h?.jumlah ?? 0,
      pangan: h?.pangan ?? 0,
      sandang: h?.sandang ?? 0,
      konveksi: h?.konveksi ?? 0,
      jasa: h?.jasa ?? 0,
    };
  });
}

export function getHomeIndustriTren() {
  return query<{ tahun: number; total: number; pangan: number; sandang: number; konveksi: number; jasa: number }>(
    "SELECT tahun, SUM(jumlah) total, SUM(pangan) pangan, SUM(sandang) sandang, SUM(konveksi) konveksi, SUM(jasa) jasa FROM home_industri GROUP BY tahun ORDER BY tahun"
  );
}

export function getPertumbuhan() {
  return query<{ tahun: number; wilayah: string; laju: number }>(
    "SELECT tahun, wilayah, laju FROM pertumbuhan ORDER BY tahun, wilayah"
  );
}

export function getPasarTren() {
  return query<{ tahun: number; jenis: string; jumlah: number }>(
    "SELECT tahun, jenis, jumlah FROM pasar ORDER BY tahun, jenis"
  );
}

export function getPasarTahunList() {
  return query<{ t: number }>("SELECT DISTINCT tahun t FROM pasar ORDER BY t").map((r) => r.t);
}

export function getSaranaTren() {
  return query<{ tahun: number; jenis: string; jumlah: number }>(
    "SELECT tahun, jenis, jumlah FROM sarana_perdagangan ORDER BY tahun, jenis"
  );
}

// Agregat industri per sub-jenis (untuk matriks unit × tenaga kerja × nilai produksi).
export function getIndustriAgregat() {
  return query<{ tahun: number; jenis: string; unit: number; tkerja: number; nilai: number }>(
    "SELECT tahun, jenis_normalized jenis, jumlah_perusahaan unit, tenaga_kerja, produksi nilai FROM industri ORDER BY tahun, jenis_normalized"
  );
}

// Home industri per kecamatan (untuk peta spasial industri rumahan).
export function getHomeIndustriKecamatan() {
  return query<{ tahun: number; kecamatan: string; jumlah: number }>(
    "SELECT tahun, kecamatan, jumlah FROM home_industri ORDER BY tahun, kecamatan"
  );
}

// ================= Tahap 2: Dashboard Makro BPS =================

export interface MakroSeri {
  tahun: number;
  nilai: number;
}

function seriSQL(table: string, col: string): MakroSeri[] {
  return query<MakroSeri>(`SELECT tahun, ${col} nilai FROM ${table} ORDER BY tahun`);
}

export function getIpmTren(): MakroSeri[] { return seriSQL("ipm", "nilai"); }
export function getGiniTren(): MakroSeri[] { return seriSQL("gini", "nilai"); }
export function getPertumbuhanTren(): MakroSeri[] {
  return query<MakroSeri>(
    "SELECT tahun, laju nilai FROM pertumbuhan WHERE wilayah='Banjarnegara' ORDER BY tahun"
  );
}
export function getGarisKemiskinanTren(): MakroSeri[] { return seriSQL("garis_kemiskinan", "nilai"); }
export function getKedalamanTren(): MakroSeri[] { return seriSQL("indeks_kedalaman", "nilai"); }
export function getKeparahanTren(): MakroSeri[] { return seriSQL("indeks_keparahan", "nilai"); }

export interface PopMiskinRow { tahun: number; jumlah: number; proporsi: number; }
export function getPopMiskin(): PopMiskinRow[] {
  return query<PopMiskinRow>("SELECT tahun, jumlah, proporsi FROM pop_miskin ORDER BY tahun");
}

export interface PdrbRow { tahun: number; sektor: string; nilai: number; kontribusi: number; }
export function getPdrbTahunList(jenis: "berlaku" | "konstan" = "berlaku"): number[] {
  return query<{ t: number }>("SELECT DISTINCT tahun t FROM pdrb WHERE jenis=? ORDER BY t", [jenis]).map((r) => r.t);
}
export function getPdrbSektorList(jenis: "berlaku" | "konstan" = "berlaku"): string[] {
  return query<{ s: string }>("SELECT DISTINCT sektor s FROM pdrb WHERE jenis=? ORDER BY s", [jenis]).map((r) => r.s);
}
/** PDRB per sektor untuk satu tahun (bar chart). */
export function getPdrbTahun(tahun: number, jenis: "berlaku" | "konstan" = "berlaku"): PdrbRow[] {
  return query<PdrbRow>(
    "SELECT tahun, sektor, nilai, kontribusi FROM pdrb WHERE tahun=? AND jenis=? ORDER BY nilai DESC",
    [tahun, jenis]
  );
}
/** PDRB per sektor lintas tahun (line chart, multi-seri). */
export function getPdrbTrenSektor(jenis: "berlaku" | "konstan" = "berlaku"): PdrbRow[] {
  return query<PdrbRow>(
    "SELECT tahun, sektor, nilai, kontribusi FROM pdrb WHERE jenis=? ORDER BY tahun, sektor",
    [jenis]
  );
}

// ================= Tahap 3: Korelasi Koperasi ↔ Industri + Prediksi =================

export interface KecPairRow {
  kecamatan: string;
  koperasi: number;
  homeIndustri: number;
  pangan: number;
  sandang: number;
  konveksi: number;
  jasa: number;
}

export function getKecPair(tahun: number): KecPairRow[] {
  return query<KecPairRow>(
    `SELECT k.kecamatan, k.jumlah koperasi, h.jumlah homeIndustri,
            COALESCE(h.pangan,0) pangan, COALESCE(h.sandang,0) sandang,
            COALESCE(h.konveksi,0) konveksi, COALESCE(h.jasa,0) jasa
     FROM koperasi_aktif k
     JOIN home_industri h ON h.kecamatan = k.kecamatan AND h.tahun = k.tahun
     WHERE k.tahun = ? ORDER BY k.kecamatan`,
    [tahun]
  );
}

export interface TahunPair { tahun: number; koperasi: number; homeIndustri: number; }
export function getTahunPairTren(): TahunPair[] {
  return query<TahunPair>(
    `SELECT a.tahun, a.koperasi, i.homeIndustri
     FROM (SELECT tahun, SUM(jumlah) koperasi FROM koperasi_aktif GROUP BY tahun) a
     JOIN (SELECT tahun, SUM(jumlah) homeIndustri FROM home_industri GROUP BY tahun) i
     ON i.tahun = a.tahun ORDER BY a.tahun`
  );
}

export function getKorelasiTahunList(): number[] {
  return query<{ t: number }>(
    `SELECT a.tahun t FROM (SELECT DISTINCT tahun FROM koperasi_aktif) a
     JOIN (SELECT DISTINCT tahun FROM home_industri) b ON b.tahun = a.tahun ORDER by t`
  ).map((r) => r.t);
}

/** Pair (koperasi, nilai) per kecamatan utk tahun tertentu; nilai dari tabel variabel B apa pun. */
export function getKecPairGeneric(
  tahun: number,
  table: "home_industri" | "rumah_makan" | "dana_desa"
): { kecamatan: string; koperasi: number; nilai: number }[] {
  const q = `
    SELECT k.kecamatan,
           COALESCE(k.jumlah, 0) AS koperasi,
           COALESCE(b.jumlah, 0) AS nilai
    FROM koperasi_aktif k
    LEFT JOIN ${table} b ON b.kecamatan = k.kecamatan AND b.tahun = k.tahun
    WHERE k.tahun = ?
    ORDER BY k.kecamatan
  `;
  return query<{ kecamatan: string; koperasi: number; nilai: number }>(q, [tahun]);
}

export function getKecamatanList(): string[] {
  return query<{ n: string }>(
    `SELECT k.kecamatan n FROM (SELECT DISTINCT kecamatan FROM koperasi_aktif) k
     JOIN (SELECT DISTINCT kecamatan FROM home_industri) h ON h.kecamatan = k.kecamatan
     ORDER BY n`
  ).map((r) => r.n);
}

export function getKoperasiKecamatanTren(kecamatan: string) {
  return query<{ tahun: number; jumlah: number }>(
    "SELECT tahun, jumlah FROM koperasi_aktif WHERE kecamatan=? ORDER BY tahun",
    [kecamatan]
  );
}

export function getHomeIndustriKecamatanTren(kecamatan: string) {
  return query<{ tahun: number; jumlah: number }>(
    "SELECT tahun, jumlah FROM home_industri WHERE kecamatan=? ORDER BY tahun",
    [kecamatan]
  );
}

export function getRumahMakanTahunList(): number[] {
  return query<{ t: number }>("SELECT DISTINCT tahun t FROM rumah_makan ORDER BY t").map((r) => r.t);
}
export function getDanaDesaTahunList(): number[] {
  return query<{ t: number }>("SELECT DISTINCT tahun t FROM dana_desa ORDER BY t").map((r) => r.t);
}

// ================= Tahap 4: Inflasi & Daya Beli (pengeluaran per kapita) =================

export interface InflasiRow { tahun: number; wilayah: string; nilai: number | null }
export interface PengeluaranRow { tahun: number; wilayah: string; nilai: number | null }

/** Daftar wilayah yang ada di tabel inflasi (untuk filter/saksi). */
export function getInflasiWilayahList(): string[] {
  return query<{ w: string }>("SELECT DISTINCT wilayah w FROM inflasi ORDER BY w").map((r) => r.w);
}
/** Inflasi per wilayah lintas tahun (multi-seri line). NULL = wilayah tidak punya data di tahun tsb (mis. Banjarnegara). */
export function getInflasiTren(): InflasiRow[] {
  return query<InflasiRow>("SELECT tahun, wilayah, nilai FROM inflasi ORDER BY tahun, wilayah");
}
/** Inflasi per wilayah untuk satu tahun (bar). */
export function getInflasiTahun(tahun: number): InflasiRow[] {
  return query<InflasiRow>("SELECT tahun, wilayah, nilai FROM inflasi WHERE tahun=? ORDER BY tahun, wilayah", [tahun]);
}
export function getInflasiTahunList(): number[] {
  return query<{ t: number }>("SELECT DISTINCT tahun t FROM inflasi ORDER BY t").map((r) => r.t);
}

/** Pengeluaran per kapita per wilayah lintas tahun (multi-seri line). */
export function getPengeluaranTren(): PengeluaranRow[] {
  return query<PengeluaranRow>("SELECT tahun, wilayah, nilai FROM pengeluaran_perkapita ORDER BY tahun, wilayah");
}
/** Pengeluaran per kapita per wilayah untuk satu tahun (bar). */
export function getPengeluaranTahun(tahun: number): PengeluaranRow[] {
  return query<PengeluaranRow>("SELECT tahun, wilayah, nilai FROM pengeluaran_perkapita WHERE tahun=? ORDER BY tahun, wilayah", [tahun]);
}
export function getPengeluaranTahunList(): number[] {
  return query<{ t: number }>("SELECT DISTINCT tahun t FROM pengeluaran_perkapita ORDER BY t").map((r) => r.t);
}
