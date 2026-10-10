import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell, ReferenceLine,
} from "recharts";
import { useDB } from "@/hooks/useDB";
import {
  getInflasiTren, getInflasiTahun, getInflasiTahunList,
  getPengeluaranTren, getPengeluaranTahun, getPengeluaranTahunList,
} from "@/lib/db";
import { MonoLabel, Panel, SectionHead, StatCard } from "@/components/ui";

function Skeleton() {
  return (
    <div className="flex flex-col items-center justify-center py-32 font-mono text-sm text-[#888]">
      <div className="h-4 w-4 animate-pulse bg-[#141414]" />
      <p className="mt-4">memuat data inflasi…</p>
    </div>
  );
}
function ErrorState({ msg }: { msg: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 font-mono text-sm text-[#141414]">
      <p className="font-semibold">Gagal memuat data: {msg}</p>
    </div>
  );
}

const INK = "#141414";
const MUTED = "#888";

const ACCENT = "#ff7d2d";
const GREEN = "#1e7a46";
const RED = "#c0392b";
const SLATE = "#5b6b8a";

// Wilayah pembanding yang konsisten ada di kedua dataset (perlu data di kedua sisi untuk korelasi).
const REGION_SERIES = [
  { name: "Cilacap", color: ACCENT },
  { name: "Banyumas", color: GREEN },
  { name: "Wonosobo", color: SLATE },
  { name: "Jawa Tengah", color: "#2a2a2a" },
  { name: "Nasional", color: "#999" },
];
const BAJAR = "Banjarnegara";

const REGIONS_ALL = [BAJAR, ...REGION_SERIES.map((r) => r.name)];

function colorFor(region: string): string {
  const hit = REGION_SERIES.find((r) => r.name === region);
  if (hit) return hit.color;
  return "#cfcfca"; // wilayah tanpa seri (mis. Banjarnegara)
}

interface SeriesPoint { tahun: number; [k: string]: number | string }

/** Susun multi-seri (satu objek per tahun, satu kunci per wilayah) dari baris long-form. */
function toSeries(rows: { tahun: number; wilayah: string; nilai: number | null }[]): SeriesPoint[] {
  const map = new Map<number, SeriesPoint>();
  for (const r of rows) {
    const p = map.get(r.tahun) ?? { tahun: r.tahun };
    if (r.nilai != null) p[r.wilayah] = r.nilai;
    map.set(r.tahun, p);
  }
  return [...map.values()].sort((a, b) => a.tahun - b.tahun);
}

function fmtNilai(n: number, rupiah = false): string {
  if (rupiah) return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
  return `${n.toLocaleString("id-ID")} %`;
}

// ---------- Korelasi sederhana (Pearson) ----------
function linreg(xs: number[], ys: number[]): { r: number; r2: number; slope: number; intercept: number } | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { const a = xs[i] - mx, b = ys[i] - my; num += a * b; dx += a * a; dy += b * b; }
  const r = dx && dy ? num / Math.sqrt(dx * dy) : 0;
  const slope = dx ? num / dx : 0;
  return { r, r2: r * r, slope, intercept: my - slope * mx };
}

function CAGR(rows: { tahun: number; wilayah: string; nilai: number | null }[], wilayah: string, rupiah = false): string | null {
  const pts = rows.filter((r) => r.wilayah === wilayah && r.nilai != null).sort((a, b) => a.tahun - b.tahun);
  if (pts.length < 2) return null;
  const first = pts[0].nilai as number, last = pts[pts.length - 1].nilai as number;
  if (first <= 0) return null;
  const yrs = pts[pts.length - 1].tahun - pts[0].tahun;
  if (yrs <= 0) return null;
  return rupiah ? `${(((last / first) ** (1 / yrs) - 1) * 100).toFixed(1)}%/th` : null;
}

function TooltipBox(props: any) {
  const { active, payload, label, rupiah } = props;
  if (!active || !payload?.length) return null;
  return (
    <div className="border-2 border-[#141414] bg-white px-3 py-2 font-mono text-[11px] shadow-hd">
      <div className="text-[#141414] font-semibold mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 inline-block" style={{ background: p.color ?? p.stroke }} />
          <span className="text-[#666]">{p.name}:</span>
          <span className="text-[#141414] font-semibold">{p.value == null ? "—" : fmtNilai(p.value, rupiah)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Inflasi() {
  const { status, error } = useDB();
  const [tahun, setTahun] = useState<number | null>(null);

  const data = useMemo(() => {
    if (status !== "ready") return null;
    const infTren = getInflasiTren();
    const penTren = getPengeluaranTren();
    const infYears = getInflasiTahunList();
    const penYears = getPengeluaranTahunList();
    const allYears = [...new Set([...infYears, ...penYears])].sort((a, b) => a - b);
    const tahunAktif = tahun ?? allYears[allYears.length - 1] ?? 0;
    return {
      infTren, penTren, allYears, tahunAktif,
      infBar: getInflasiTahun(tahunAktif),
      penBar: getPengeluaranTahun(tahunAktif),
    };
  }, [status, tahun]);

  if (status === "loading" || !data) return <Skeleton />;
  if (status === "error" || error) return <ErrorState msg={error ?? "error"} />;

  const { infTren, penTren, allYears, tahunAktif, infBar, penBar } = data;
  const infSeries = toSeries(infTren);
  const penSeries = toSeries(penTren);

  const cagrPen = CAGR(penTren, BAJAR, true);
  const cagrInf = CAGR(infTren, BAJAR); // null → Banjarnegara tak punya data inflasi
  const penBajar = penTren.filter((r) => r.wilayah === BAJAR).sort((a, b) => a.tahun - b.tahun);
  const penLast = penBajar[penBajar.length - 1];
  const penFirst = penBajar[0];
  const gapFirst = gapPct(penTren, penFirst?.tahun ?? 0);
  const gapLast = gapPct(penTren, penLast?.tahun ?? 0);

  return (
    <div className="max-w-[1200px] mx-auto px-5 py-8 space-y-5">
      {/* Header */}
      <div>
        <MonoLabel>Tahap 4 · Inflasi & Daya Beli</MonoLabel>
        <h1 className="font-serif italic text-4xl md:text-5xl font-semibold leading-[1.02] tracking-tight mt-1">
          Inflasi & Daya Beli <span className="text-[#888]">Konsumtif</span>
        </h1>
        <p className="font-mono text-[11px] text-[#666] mt-3 max-w-3xl leading-relaxed">
          Laju inflasi (IHK) dan pengeluaran per kapita konsumsi per wilayah, 2018–2024. Pengeluaran per kapita
          adalah proksi daya beli rumah tangga — membandingkan kemampuan belanja penduduk Banjarnegara terhadap
          pembanding kabupaten/kota Jawa Tengah.
        </p>
      </div>

      {/* Kontrol */}
      <div className="flex items-center gap-3">
        <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#666]">Tahun</label>
        <select
          value={tahunAktif}
          onChange={(e) => setTahun(Number(e.target.value))}
          className="border-2 border-[#141414] bg-white px-3 py-1.5 font-mono text-sm cursor-pointer shadow-hd focus:outline-none"
        >
          {allYears.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Callout ketiadaan data inflasi Banjarnegara */}
      <div className="border-2 border-dashed border-[#141414] bg-[#fafaf8] px-5 py-4">
        <p className="font-mono text-[12px] leading-relaxed text-[#141414]">
          <span className="font-semibold">Banjarnegara tidak memiliki seri inflasi</span> dalam dataset BPS ini
          (nilai <span className="text-[#c0392b] font-semibold">—</span> untuk seluruh tahun). Inflasi ditampilkan
          untuk wilayah pembanding saja; <b>pengeluaran per kapita</b> tetap tersedia untuk Banjarnegara dan menjadi
          tolok ukur daya beli utama halaman ini.
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Pengeluaran/Kapita Banja" value={penLast ? `Rp ${((penLast.nilai as number) / 1000).toFixed(1)} rb` : "—"} sub={`Tahun ${penLast?.tahun ?? "—"}`} />
        <Kpi label="Pertumbuhan / th (CAGR)" value={cagrPen ?? "—"} sub="Pengeluaran per kapita, 2018→24" accent />
        <Kpi label="Inflasi Banja" value={cagrInf ?? "—"} sub="Tidak tersedia di dataset" />
        <Kpi label="Posisi di Pembanding" value={penLast ? `${rankPen(penTren, tahunAktif)}/${REGIONS_ALL.length}` : "—"} sub={`Terendah = daya beli lemah, ${tahunAktif}`} />
      </div>

      {/* Chart 1: Inflasi line multi-wilayah */}
      <Panel>
        <SectionHead tag="Laju Inflasi (IHK) · %" >
          <span className="font-mono text-[10px] text-[#999] uppercase tracking-[0.16em]">Banjarnegara: — (tidak ada data)</span>
        </SectionHead>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={infSeries} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid stroke="#e5e5e0" strokeDasharray="3 3" />
              <XAxis dataKey="tahun" tick={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace" }} stroke="#999" />
              <YAxis tick={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace" }} stroke="#999" width={48}
                tickFormatter={(v: number) => `${v.toLocaleString("id-ID")}%`} />
              <Tooltip content={<TooltipBox rupiah={false} />} />
              <ReferenceLine y={0} stroke="#141414" strokeWidth={1.5} />
              <Legend formatter={(v: string) => <span className="font-mono text-[11px] text-[#666]">{v}</span>} />
              {REGION_SERIES.map((r) => (
                <Line key={r.name} type="monotone" dataKey={r.name} name={r.name}
                  stroke={r.color} strokeWidth={r.name === "Jawa Tengah" ? 2.5 : 1.8} dot={false}
                  strokeDasharray={r.name === "Nasional" ? "6 3" : undefined} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* Chart 2: Pengeluaran per kapita line multi-wilayah (daya beli) */}
      <Panel>
        <SectionHead tag="Pengeluaran per Kapita · Daya Beli">
          <span className="font-mono text-[10px] text-[#999] uppercase tracking-[0.16em]">Rp / tahun</span>
        </SectionHead>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={penSeries} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid stroke="#e5e5e0" strokeDasharray="3 3" />
              <XAxis dataKey="tahun" tick={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace" }} stroke="#999" />
              <YAxis tick={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace" }} stroke="#999" width={70}
                tickFormatter={(v: number) => `Rp ${Math.round(v / 1000)} rb`} />
              <Tooltip content={<TooltipBox rupiah={true} />} />
              <Legend formatter={(v: string) => <span className="font-mono text-[11px] text-[#666]">{v}</span>} />
              {REGION_SERIES.map((r) => (
                <Line key={r.name} type="monotone" dataKey={r.name} name={r.name}
                  stroke={r.color} strokeWidth={r.name === "Jawa Tengah" ? 2.5 : 1.8} dot={false}
                  strokeDasharray={r.name === "Nasional" ? "6 3" : undefined} connectNulls />
              ))}
              <Line type="monotone" dataKey={BAJAR} name={BAJAR} stroke={INK} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* Chart 3: Bar per wilayah untuk tahun terpilih — dua panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarPanel title={`Inflasi · ${tahunAktif}`} rows={infBar} rupiah={false} hasBajar={false} />
        <BarPanel title={`Pengeluaran/Kapita · ${tahunAktif}`} rows={penBar} rupiah={true} hasBajar={true} />
      </div>

      {/* Tabel daya beli */}
      <Panel>
        <SectionHead tag="Pengeluaran per Kapita · Ringkasan Wilayah">
          <span className="font-mono text-[10px] text-[#999] uppercase tracking-[0.16em]">2018 → 2024</span>
        </SectionHead>
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-[12px]">
            <thead>
              <tr className="border-b-2 border-[#141414] text-left">
                <th className="py-2 pr-3 font-semibold text-[#141414]">Wilayah</th>
                <th className="py-2 pr-3 font-semibold text-[#141414] text-right">2018</th>
                <th className="py-2 pr-3 font-semibold text-[#141414] text-right">2024</th>
                <th className="py-2 font-semibold text-[#141414] text-right">CAGR / th</th>
              </tr>
            </thead>
            <tbody>
              {REGIONS_ALL.map((name) => {
                const isBajar = name === BAJAR;
                const f = penTren.find((r) => r.wilayah === name && r.tahun === 2018)?.nilai;
                const l = penTren.find((r) => r.wilayah === name && r.tahun === 2024)?.nilai;
                const cagr = CAGR(penTren, name, true);
                return (
                  <tr key={name} className={`border-b border-[#e5e5e0] ${isBajar ? "bg-[#fff4ec]" : ""}`}>
                    <td className={`py-2 pr-3 ${isBajar ? "font-bold" : "text-[#666]"}`}>{name}</td>
                    <td className="py-2 pr-3 text-right">{f != null ? `Rp ${Math.round(f / 1000)} rb` : "—"}</td>
                    <td className="py-2 pr-3 text-right">{l != null ? `Rp ${Math.round(l / 1000)} rb` : "—"}</td>
                    <td className="py-2 text-right text-[#141414] font-semibold">{cagr ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Temuan */}
      <Panel>
        <SectionHead tag="Temuan Kunci" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <Finding n="1" title="Banjarnegara terbelakang dalam daya beli">
            {penFirst && penLast ? (
              <>Pengeluaran per kapita <b>Banjar</b> naik dari <b>Rp {Math.round((penFirst.nilai as number) / 1000)} rb</b> ({penFirst.tahun}) ke <b>Rp {Math.round((penLast.nilai as number) / 1000)} rb</b> ({penLast.tahun}) — CAGR {cagrPen}. Namun tetap <b>terendah di antara semua pembanding</b>, termasuk kabupaten tetangga (Cilacap, Banyumas, Wonosobo) dan rata-rata Jawa Tengah.</>
            ) : "Data pengeluaran per kapita belum tersedia."}
          </Finding>
          <Finding n="2" title="Celah daya beli melebar">
            Kesenjangan terhadap Jawa Tengah melebar dari <b>±{gapFirst.toFixed(0)}%</b> ({penFirst?.tahun ?? "—"}) menjadi <b>±{gapLast.toFixed(0)}%</b> ({penLast?.tahun ?? "—"}) lebih rendah. Daya beli rumah tangga tumbuh lebih lambat dari pembanding.
          </Finding>
          <Finding n="3" title="Inflasi: data tidak tersedia, gunakan pembanding">
            Laju inflasi Banjarnegara tidak ada dalam dataset (—). Untuk konteks harga, lihat seri pembanding di atas: Jawa Tengah dan Nasional berkisar 2–7%/th. <b>Interpretasi:</b> tekanan harga yang dialami konsumen Banjarnegara dapat diproksi dari inflasi Jawa Tengah, namun ini perlu validasi dengan data harga komoditas lokal di tahap selanjutnya.
          </Finding>
          <Finding n="4" title="Implikasi bagi UMKM">
            Daya beli rendah + celah yang melebar berarti <b>konsumen lokal sensitif terhadap harga</b>. Strategi UMKM (bahkan untuk produk premium seperti kopi/garut) sebaiknya menekankan nilai, porsi hemat, atau varian ekonomis. Ini memperkuat temuan "pasar tidak matang" di Tahap 2: pasar lokal belum mampu menyerap produk bernilai tambah tinggi dalam volume besar.
          </Finding>
        </div>
      </Panel>

      {/* Catatan kaki sumber */}
      <div className="border-t border-[#e5e5e0] pt-4">
        <p className="font-mono text-[10px] text-[#999] leading-relaxed">
          Sumber: BPS Kabupaten Banjarnegara — Perbandingan Laju Inflasi (2018–2024) & Perbandingan Pengeluaran Per Kapita
          Konsumsi (2018–2024). Nilai "—" = wilayah tidak memiliki data pada tahun tersebut. Halaman memakai proksi
          daya beli (pengeluaran per kapita); korelasi kuantitatif inflasi↔daya beli untuk Banjarnegara ditunda
          hingga data inflasi lokal tersedia.
        </p>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`border-2 border-[#141414] p-4 shadow-hd ${accent ? "bg-[#fff4ec]" : "bg-white"}`}>
      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#666] leading-tight">{label}</div>
      <div className={`font-mono text-2xl font-bold mt-2 ${accent ? "text-[#c2541a]" : "text-[#141414]"}`}>{value}</div>
      {sub && <div className="font-mono text-[10px] text-[#888] mt-1 leading-tight">{sub}</div>}
    </div>
  );
}

function BarPanel({ title, rows, rupiah, hasBajar }: {
  title: string; rows: { tahun: number; wilayah: string; nilai: number | null }[]; rupiah: boolean; hasBajar: boolean;
}) {
  const sorted = [...REGIONS_ALL].map((name) => {
    const r = rows.find((x) => x.wilayah === name);
    return { name, nilai: r?.nilai ?? null, missing: r?.nilai == null };
  }).sort((a, b) => (b.nilai ?? -1) - (a.nilai ?? -1));
  return (
    <Panel>
      <SectionHead tag={title} />
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sorted} margin={{ top: 12, right: 8, left: 8, bottom: 4 }} layout="vertical">
            <CartesianGrid stroke="#e5e5e0" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace" }} stroke="#999"
              tickFormatter={(v: number) => rupiah ? `Rp${Math.round(v / 1000)}rb` : `${v}%`} />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace" }} stroke="#666" />
            <Tooltip content={<TooltipBox rupiah={rupiah} />} />
            <Bar dataKey="nilai" name="Nilai" barSize={16} radius={[0, 2, 2, 0]}>
              {sorted.map((d) => (
                <Cell key={d.name} fill={d.nilai == null ? "#e5e5e0" : colorFor(d.name)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {!hasBajar && (
        <p className="font-mono text-[10px] text-[#999] mt-2">Banjarnegara tidak termasuk (tidak ada data inflasi).</p>
      )}
    </Panel>
  );
}

function Finding({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="shrink-0 w-7 h-7 border-2 border-[#141414] bg-[#fff4ec] flex items-center justify-center font-mono text-[12px] font-bold text-[#141414]">{n}</span>
      <div>
        <div className="font-mono text-[12px] font-bold text-[#141414] uppercase tracking-[0.08em]">{title}</div>
        <p className="font-mono text-[11px] text-[#666] leading-relaxed mt-1">{children}</p>
      </div>
    </div>
  );
}

/** Peringkat Banjarnegara (1=tertinggi) berdasarkan nilai pengeluaran per kapita pada tahun tertentu. */
function rankPen(rows: { tahun: number; wilayah: string; nilai: number | null }[], tahun: number): number {
  const vals = REGIONS_ALL.map((n) => rows.find((r) => r.wilayah === n && r.tahun === tahun)?.nilai).filter((v): v is number => v != null).sort((a, b) => b - a);
  const b = rows.find((r) => r.wilayah === BAJAR && r.tahun === tahun)?.nilai;
  if (b == null) return 0;
  return vals.indexOf(b) + 1;
}

/** Persen selah pengeluaran/kapita Banjarnegara vs Jawa Tengah pada tahun tertentu. */
function gapPct(rows: { tahun: number; wilayah: string; nilai: number | null }[], tahun: number): number {
  const b = rows.find((r) => r.wilayah === BAJAR && r.tahun === tahun)?.nilai;
  const j = rows.find((r) => r.wilayah === "Jawa Tengah" && r.tahun === tahun)?.nilai;
  if (b == null || j == null || j <= 0) return 0;
  return ((j - b) / j) * 100;
}
