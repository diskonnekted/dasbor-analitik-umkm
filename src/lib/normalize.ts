// src/lib/normalize.ts
// Normalisasi data CSV DISPERINDAGKOP UKM & BPS: angka, nama komoditas, nama kecamatan.

/** Parse angka dari string CSV kotor. Mengembalikan null untuk nilai kosong / "-". */
export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  let s = String(value).trim();
  if (s === "" || s === "-" || s === "—" || s.toLowerCase() === "n/a") return null;
  // buang spasi dalam angka (termasuk spasi non-breaking)
  s = s.replace(/\s+/g, "");
  if (s === "") return null;

  const hasDot = s.includes(".");
  const hasComma = s.includes(",");

  if (hasDot && hasComma) {
    // Asumsi: ',' = pemisah ribuan, '.' = desimal (gaya Eropa/Indonesia)
    s = s.replace(/,/g, "");
  } else if (hasComma) {
    const parts = s.split(",");
    // jika setiap segmen setelah yang pertama tepat 3 digit -> pemisah ribuan
    const allThousand = parts.slice(1).every((p) => p.length === 3);
    if (allThousand && parts.length > 1) {
      s = s.replace(/,/g, "");
    } else {
      // desimal koma -> titik
      s = s.replace(/,/g, ".");
    }
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Normalisasi nama kecamatan ke key lowercase tanpa spasi (match GeoJSON). */
export function normKecamatan(name: unknown): string {
  let s = String(name ?? "").trim().toLowerCase();
  s = s.replace(/\s+/g, "");
  // alias typo umum
  const alias: Record<string, string> = {
    purworejaklampok: "purwarejaklampok",
    purworejklampok: "purwarejaklampok",
    purwonegoro: "purwanegara",
    puwonegoro: "purwanegara",
  };
  return alias[s] ?? s;
}

const KOMODITAS_ALIAS: Record<string, string> = {
  TAHA: "TAHU",
  "TAHU": "TAHU",
  GYBSUM: "GYPSUM",
  "GIPSUM": "GYPSUM",
  GYPSUM: "GYPSUM",
  EMPINGMLINJO: "EMPING MELINJO",
  EMPINGMELINJO: "EMPING MELINJO",
  ALUMUNIUM: "ALUMINIUM",
  ALUMINIUM: "ALUMINIUM",
  MEUBELAIR: "MEBELAIR",
  MEBELAIR: "MEBELAIR",
  "MEBELAIRPERABOT": "MEBELAIR",
  "MEUBELAIRPERABOT": "MEBELAIR",
  "KERAJINAN BAMBU": "KERAJINAN BAMBU/KAYU",
  "KERAJINAN BAMBUKAYU": "KERAJINAN BAMBU/KAYU",
  "PENGGILINGAN PADI": "PENGGILINGAN PADI/TEPUNG",
  "PENGGILINGAN PADITEPUNG": "PENGGILINGAN PADI/TEPUNG",
  "PENGGILINGAN PADITEPUNG ": "PENGGILINGAN PADI/TEPUNG",
  "BATU BATA": "BATU BATA",
  BATUBATA: "BATU BATA",
  "MINYAK NILAMATSIRI": "MINYAK NILAM/ATSIRI",
  "MINYAK NILAM ATSIRI": "MINYAK NILAM/ATSIRI",
  "KOLANG KALING": "KOLANG KALING",
  KOLANGKALING: "KOLANG KALING",
  "TAPEPEYEM": "TAPE/PEYEM",
  "TAPE PEYEM": "TAPE/PEYEM",
  "OLAHAN SALAK": "OLAHAN SALAK",
  "OLAHAN KENTANG": "OLAHAN KENTANG",
  "TEPUNG TAPIOKA": "TEPUNG TAPIOKA",
  "PENGOLAHAN KAYU": "PENGOLAHAN KAYU",
  "BULU MATA": "BULU MATA",
  ASSESORIES: "ASSESORIES",
};

/** Normalisasi nama komoditas industri ke key kanonik (UPPERCASE, "/" dipertahankan). */
export function normKomoditas(name: unknown): string {
  let s = String(name ?? "").trim().toUpperCase();
  s = s.replace(/\s+/g, " ").trim();
  // key tanpa spasi untuk alias lookup
  const keyNoSpace = s.replace(/\s+/g, "");
  if (KOMODITAS_ALIAS[keyNoSpace]) return KOMODITAS_ALIAS[keyNoSpace];
  if (KOMODITAS_ALIAS[s]) return KOMODITAS_ALIAS[s];
  return s;
}

/** Title-case sederhana untuk label tampilan. */
export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/([ /])/)
    .map((w) => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join("");
}

/** Parse baris CSV sederhana (mendukung quote & koma di dalam quote). */
export function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === ",") {
        out.push(cur);
        cur = "";
      } else if (c === '"') {
        inQ = true;
      } else {
        cur += c;
      }
    }
  }
  out.push(cur);
  return out;
}

export interface ParsedCSV {
  headers: string[];
  rows: string[][];
}

/** Parse seluruh CSV. Deteksi delimiter ; atau , di header. */
export function parseCSV(text: string): ParsedCSV {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim() !== "");
  if (lines.length === 0) return { headers: [], rows: [] };
  // deteksi delimiter dari baris pertama
  const delim = lines[0].split(";").length > lines[0].split(",").length ? ";" : ",";
  const headers = lines[0].split(delim).map((h) => h.trim());
  const rows = lines.slice(1).map((l) => {
    if (delim === ";") return l.split(";").map((c) => c.trim());
    return parseCSVLine(l);
  });
  return { headers, rows };
}

/** Helper ambil nilai kolom case-insensitive. */
export function col(row: string[], headers: string[], name: string): string {
  const idx = headers.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
  return idx >= 0 ? (row[idx] ?? "").trim() : "";
}
