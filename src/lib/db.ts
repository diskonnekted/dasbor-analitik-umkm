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
CREATE TABLE IF NOT EXISTS sarana_perdagangan (id INTEGER PRIMARY KEY AUTOINCREMENT, jenis TEXT, jumlah INTEGER, tahun INTEGER);
CREATE TABLE IF NOT EXISTS makro (
  id INTEGER PRIMARY KEY AUTOINCREMENT, tahun INTEGER, sektor TEXT, nilai REAL, kontribusi REAL
);
CREATE TABLE IF NOT EXISTS pertumbuhan (
  id INTEGER PRIMARY KEY AUTOINCREMENT, tahun INTEGER, wilayah TEXT, laju REAL
);
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
    { path: "/data/sarana_perdagangan.csv", fn: importSarana },
    { path: "/data/pdrb_berlaku.csv", fn: importMakro },
    { path: "/data/laju_pertumbuhan.csv", fn: importPertumbuhan },
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
