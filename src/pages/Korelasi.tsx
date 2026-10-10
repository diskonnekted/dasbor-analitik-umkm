// src/pages/Korelasi.tsx — Tahap 3: Korelasi Koperasi ↔ Industri Rumahan + Prediksi.
// Scatter + Pearson r per tahun, tren agregat, regresi linear sederhana + proyeksi 1–2 th.

import { useMemo, useState } from "react";
import {
  CartesianGrid, Cell, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from "recharts";
import { fmtNum, MonoLabel, Panel, SectionHead } from "@/components/ui";
import {
  getDanaDesaTahunList, getHomeIndustriKecamatanTren, getKecPair, getKecPairGeneric, getKecamatanList,
  getKorelasiTahunList, getKoperasiKecamatanTren, getRumahMakanTahunList, getTahunPairTren,
} from "@/lib/db";
import { useDB } from "@/hooks/useDB";

const ACCENT = "#ff7d2d";
const INK = "#141414";
const MUTED = "#888";
const GREEN = "#1e7a46";

// ===== Statistik (stdlib murni) =====
interface Fit { slope: number; intercept: number; r: number; r2: number; }
/** Regresi linear y = slope*x + intercept + koefisien korelasi Pearson. */
function linreg(xs: number[], ys: number[]): Fit | null {
  const n = xs.length;
  if (n < 2) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return null;
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx, r: sxy / Math.sqrt(sxx * syy), r2: (sxy * sxy) / (sxx * syy) };
}
function kekuatan(r: number): string {
  const a = Math.abs(r);
  if (a >= 0.7) return "kuat";
  if (a >= 0.4) return "sedang";
  if (a >= 0.2) return "lemah";
  return "sangat lemah";
}
const dirLabel = (r: number) => (r > 0 ? "positif" : "negatif");

const CATS: { key: "pangan" | "sandang" | "konveksi" | "jasa"; label: string }[] = [
  { key: "pangan", label: "Pangan" },
  { key: "sandang", label: "Sandang" },
  { key: "konveksi", label: "Konveksi" },
  { key: "jasa", label: "Jasa" },
];

function Skeleton() {
  return (
    <div className="flex flex-col items-center justify-center py-32 font-mono text-sm text-[#888]">
      <div className="h-4 w-4 animate-pulse bg-[#141414]" />
      <p className="mt-4">memuat data korelasi…</p>
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

/** Serangkaian titik aktual untuk satu metrik; proyeksi digambar terpisah sebagai segmen putus-putus. */
function regresiSeries(data: { tahun: number; jumlah: number }[], fit: Fit | null, horizon: number) {
  const lastYear = data.length ? data[data.length - 1].tahun : 0;
  const real = data.map((d) => ({ tahun: d.tahun, nilai: d.jumlah }));
  if (!fit) return { real, proj: [] as { tahun: number; nilai: number }[] };
  const proj = [
    { tahun: lastYear, nilai: Math.round(fit.slope * lastYear + fit.intercept) },
    ...Array.from({ length: horizon }, (_, i) => ({
      tahun: lastYear + i + 1,
      nilai: Math.max(0, Math.round(fit.slope * (lastYear + i + 1) + fit.intercept)),
    })),
  ];
  return { real, proj };
}

export default function Korelasi() {
  const { status, error } = useDB();
  const [varA, setVarA] = useState<"home_industri" | "rumah_makan" | "dana_desa">("home_industri");
  const [tahun, setTahun] = useState(0);
  const [kec, setKec] = useState<string>("semua");
  const [horizon, setHorizon] = useState(2);

  const data = useMemo(() => {
    if (status !== "ready") return null;
    // Tahun tersedia per variabel A (dipakai utk filter tahun agar tidak insufficient data).
    const tlA =
      varA === "rumah_makan" ? getRumahMakanTahunList()
      : varA === "dana_desa" ? getDanaDesaTahunList()
      : getKorelasiTahunList();
    const kl = getKecamatanList();
    const pairs = getKecPairGeneric(tahun, varA);
    const pairsCat = getKecPair(tahun); // utk panel per kategori (hanya home_industri)
    const trenAgg = getTahunPairTren();

    const fitKec = linreg(pairs.map((p) => p.koperasi), pairs.map((p) => p.nilai));
    const fitTahun = linreg(trenAgg.map((t) => t.tahun), trenAgg.map((t) => t.homeIndustri));
    const fitKopKec = linreg(trenAgg.map((t) => t.tahun), trenAgg.map((t) => t.koperasi));

    const kecTrenKop = kec === "semua" ? [] : getKoperasiKecamatanTren(kec);
    const kecTrenHI = kec === "semua" ? [] : getHomeIndustriKecamatanTren(kec);
    const fitKopKecTren = linreg(kecTrenKop.map((d) => d.tahun), kecTrenKop.map((d) => d.jumlah));
    const fitHIKecTren = linreg(kecTrenHI.map((d) => d.tahun), kecTrenHI.map((d) => d.jumlah));
    const kopReg = regresiSeries(kecTrenKop, fitKopKecTren, horizon);
    const hiReg = regresiSeries(kecTrenHI, fitHIKecTren, horizon);

    return { tlA, kl, pairs, pairsCat, trenAgg, fitKec, fitTahun, fitKopKec, kecTrenKop, kecTrenHI, fitKopKecTren, fitHIKecTren, kopReg, hiReg };
  }, [status, tahun, kec, horizon, varA]);

  if (status === "loading") return <Skeleton />;
  if (status === "error" || error) return <ErrorState msg={error ?? "error"} />;
  if (!data) return <Skeleton />;

  const { tlA: tahunList, kl: kecList, pairs, pairsCat, trenAgg, fitKec, fitTahun, kecTrenKop, kecTrenHI, fitKopKecTren, fitHIKecTren, kopReg, hiReg } = data;

  const varBLabel =
    varA === "rumah_makan" ? "Rumah Makan/Restoran"
    : varA === "dana_desa" ? "Dana Desa"
    : "Industri Rumahan";
  const scatter = pairs.map((p) => ({ x: p.koperasi, y: p.nilai, nama: p.kecamatan, z: p.nilai }));

  return (
    <div className="max-w-[1200px] mx-auto px-5 flex flex-col gap-6">
      {/* Header + filter */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[11px] font-semibold tracking-widest text-[#888]">TAHAP 3 · KORELASI</p>
          <h1 className="font-serif italic text-3xl font-semibold text-[#141414] md:text-4xl">
            Korelasi Koperasi ↔ Industri
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[#666]">
            Hubungan jumlah koperasi aktif dengan industri rumahan per kecamatan, plus proyeksi
            1–{horizon} tahun berbasis regresi linear sederhana.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={varA}
            onChange={(e) => setVarA(e.target.value as typeof varA)}
            className="border-hd bg-white px-3 py-2 font-mono text-xs text-[#141414] shadow-hd outline-none"
            title="Variabel B (sumbu Y / hasil)"
          >
            <option value="home_industri">Variabel B: Home Industri</option>
            <option value="rumah_makan">Variabel B: Rumah Makan/Restoran</option>
            <option value="dana_desa">Variabel B: Dana Desa (Rp jt)</option>
          </select>
          <select
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
            className="border-hd bg-white px-3 py-2 font-mono text-xs text-[#141414] shadow-hd outline-none"
          >
            {tahunList.map((t) => (
              <option key={t} value={t}>Tahun {t}</option>
            ))}
          </select>
          <select
            value={kec}
            onChange={(e) => setKec(e.target.value)}
            className="max-w-[220px] border-hd bg-white px-3 py-2 font-mono text-xs text-[#141414] shadow-hd outline-none"
          >
            <option value="semua">Semua kecamatan</option>
            {kecList.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <select
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            className="border-hd bg-white px-3 py-2 font-mono text-xs text-[#141414] shadow-hd outline-none"
          >
            <option value={1}>Proyeksi 1 th</option>
            <option value={2}>Proyeksi 2 th</option>
          </select>
        </div>
      </div>

      {/* Baris statistik korelasi */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          value={fitKec ? fitKec.r.toFixed(2) : "—"}
          label={`r Pearson · ${tahun}`}
          sub={fitKec ? `korelasi ${dirLabel(fitKec.r)} ${kekuatan(fitKec.r)}` : "insufficient data"}
          accent={fitKec ? (Math.abs(fitKec.r) >= 0.5 ? ACCENT : INK) : MUTED}
        />
        <StatTile
          value={fitKec ? fitKec.r2.toFixed(2) : "—"}
          label="R² (variance explained)"
          sub={fitKec ? `${Math.round(fitKec.r2 * 100)}% varians ${varBLabel.toLowerCase()} dijelaskan koperasi` : ""}
        />
        <StatTile
          value={fitKec ? fitKec.slope.toFixed(2) : "—"}
          label={`slope (${varBLabel.toLowerCase()}/koperasi)`}
          sub={`setiap +1 koperasi ≈ +${fitKec ? fitKec.slope.toFixed(2) : "X"} unit ${varBLabel.toLowerCase()}`}
        />
        <StatTile
          value={fmtNum(pairs.length)}
          label="kecamatan berpasangan"
          sub={`data tahun ${tahun}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Scatter per kecamatan */}
        <Panel className="flex flex-col gap-3 p-4">
          <SectionHead tag="SCATTER · KECAMATAN">Koperasi vs {varBLabel} · {tahun}</SectionHead>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                <CartesianGrid stroke="#e6e6e6" strokeDasharray="2 2" />
                <XAxis
                  type="number" dataKey="x" name="Koperasi"
                  tick={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
                  tickLine={false} axisLine={{ stroke: "#ccc" }}
                  label={{ value: "Koperasi aktif", position: "insideBottom", offset: -5, fontSize: 11, fill: "#666" }}
                />
                <YAxis
                  type="number" dataKey="y" name="Variabel B"
                  tick={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
                  tickLine={false} axisLine={{ stroke: "#ccc" }}
                  label={{ value: varBLabel, angle: -90, position: "insideLeft", fontSize: 11, fill: "#666" }}
                />
                <ZAxis range={[40, 40]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3", stroke: "#999" }}
                  contentStyle={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, border: "2px solid #141414" }}
                  formatter={(v: number | string, name: string) => [fmtNum(Number(v)), name]}
                  labelFormatter={() => ""}
                />
                <Scatter data={scatter}>
                  {scatter.map((d, i) => (
                    <Cell key={i} fill={d.nama === kec ? ACCENT : INK} fillOpacity={0.8} />
                  ))}
                </Scatter>
                {fitKec && (
                  <ReferenceLine
                    segment={[
                      { x: scatter[0]?.x ?? 0, y: Math.round(fitKec.slope * (scatter[0]?.x ?? 0) + fitKec.intercept) },
                      { x: scatter[scatter.length - 1]?.x ?? 0, y: Math.round(fitKec.slope * (scatter[scatter.length - 1]?.x ?? 0) + fitKec.intercept) },
                    ]}
                    stroke={ACCENT} strokeWidth={2}
                  />
                )}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          {fitKec && (
            <p className="font-mono text-[11px] leading-relaxed text-[#666]">
              Garis: {varBLabel.toLowerCase()} ≈ <b className="text-[#141414]">{fitKec.slope.toFixed(2)}</b> × koperasi
              + <b className="text-[#141414]">{Math.round(fitKec.intercept)}</b>. r = {fitKec.r.toFixed(2)}
              {" "}({kekuatan(fitKec.r)} {dirLabel(fitKec.r)}).
            </p>
          )}
        </Panel>

        {/* Agregat lintas tahun + regresi */}
        <Panel className="flex flex-col gap-3 p-4">
          <SectionHead tag="TREN AGREGAT">Koperasi & Industri · Lintas Tahun</SectionHead>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trenAgg} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                <CartesianGrid stroke="#e6e6e6" strokeDasharray="2 2" />
                <XAxis
                  dataKey="tahun"
                  tick={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
                  tickLine={false} axisLine={{ stroke: "#ccc" }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
                  tickLine={false} axisLine={{ stroke: "#ccc" }}
                />
                <YAxis
                  yAxisId="right" orientation="right"
                  tick={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
                  tickLine={false} axisLine={{ stroke: "#ccc" }}
                />
                <Tooltip contentStyle={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, border: "2px solid #141414" }}
                  formatter={(v: number | string) => fmtNum(Number(v))} />
                <Line yAxisId="left" type="linear" dataKey="koperasi" name="Koperasi" stroke={GREEN} strokeWidth={2} dot={{ r: 3, fill: GREEN }} />
                <Line yAxisId="right" type="linear" dataKey="homeIndustri" name="Industri" stroke={INK} strokeWidth={2} dot={{ r: 3, fill: INK }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {fitTahun && trenAgg.length > 1 && (
            <p className="font-mono text-[11px] leading-relaxed text-[#666]">
              Industri: CAGR {((Math.pow(trenAgg[trenAgg.length - 1].homeIndustri / trenAgg[0].homeIndustri, 1 / (trenAgg.length - 1)) - 1) * 100).toFixed(1)}%/th
              {" "}· proyeksi {trenAgg[trenAgg.length - 1].tahun + horizon} ≈{" "}
              <b className="text-[#141414]">{fmtNum(Math.round(fitTahun.slope * (trenAgg[trenAgg.length - 1].tahun + horizon) + fitTahun.intercept))}</b> unit.
            </p>
          )}
        </Panel>
      </div>

      {/* Korelasi per kategori (hanya utk home_industri — data per komponen kue/kriya/lain) */}
      {varA === "home_industri" && (
        <Panel className="flex flex-col gap-3 p-4">
          <SectionHead tag="PER KATEGORI">Korelasi Koperasi vs Komponen Industri · {tahun}</SectionHead>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {CATS.map((c) => {
              const fit = linreg(pairsCat.map((p) => p.koperasi), pairsCat.map((p) => p[c.key]));
              return (
                <div key={c.key} className="border-hd bg-white p-3 shadow-hd">
                  <p className="font-mono text-[10px] font-semibold tracking-widest text-[#888]">{c.label.toUpperCase()}</p>
                  <p className="mt-1 font-serif italic text-2xl font-semibold text-[#141414]">
                    {fit ? fit.r.toFixed(2) : "—"}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-[#666]">
                    {fit ? `${kekuatan(fit.r)} ${dirLabel(fit.r)} · R² ${fit.r2.toFixed(2)}` : "insufficient data"}
                  </p>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* Filter kecamatan: tren + regresi per kecamatan */}
      {kec !== "semua" && kecTrenKop.length > 0 && (
        <Panel className="flex flex-col gap-3 p-4">
          <SectionHead tag="Fokus Kecamatan">{kec} · Proyeksi {horizon} Tahun</SectionHead>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                <CartesianGrid stroke="#e6e6e6" strokeDasharray="2 2" />
                <XAxis dataKey="tahun" tick={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace" }} tickLine={false} axisLine={{ stroke: "#ccc" }} />
                <YAxis tick={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace" }} tickLine={false} axisLine={{ stroke: "#ccc" }}
                  domain={["dataMin - 20", "dataMax + 20"]} />
                <Tooltip contentStyle={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, border: "2px solid #141414" }}
                  formatter={(v: number | string) => fmtNum(Number(v))} />
                {kopReg.real.length > 0 && (
                  <Line type="linear" data={kopReg.real} dataKey="nilai" name="Koperasi" stroke={GREEN} strokeWidth={2} dot={{ r: 3, fill: GREEN }} />
                )}
                {hiReg.real.length > 0 && (
                  <Line type="linear" data={hiReg.real} dataKey="nilai" name="Industri" stroke={INK} strokeWidth={2} dot={{ r: 3, fill: INK }} />
                )}
                {kopReg.proj.length > 1 && (
                  <Line type="linear" data={kopReg.proj} dataKey="nilai" name="Koperasi (proyeksi)" stroke={GREEN} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                )}
                {hiReg.proj.length > 1 && (
                  <Line type="linear" data={hiReg.proj} dataKey="nilai" name="Industri (proyeksi)" stroke={INK} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[[kecTrenKop, fitKopKecTren, "Koperasi"], [kecTrenHI, fitHIKecTren, "Industri rumahan"]].map(([data, fit, label]) => {
              const d = data as { tahun: number; jumlah: number }[];
              const f = fit as Fit | null;
              const last = d[d.length - 1];
              const proj = f && last ? Math.max(0, Math.round(f.slope * (last.tahun + horizon) + f.intercept)) : null;
              return (
                <div key={label as string} className="border-hd bg-[#fafaf8] p-3">
                  <p className="font-mono text-[10px] font-semibold tracking-widest text-[#888]">{(label as string).toUpperCase()}</p>
                  <p className="mt-1 font-mono text-xs text-[#141414]">
                    {last.tahun}: <b>{fmtNum(last.jumlah)}</b> → {last.tahun + horizon}: <b>{proj ? fmtNum(proj) : "—"}</b>
                  </p>
                  {f && (
                    <p className="mt-1 font-mono text-[10px] text-[#666]">
                      r = {f.r.toFixed(2)} ({kekuatan(f.r)} {dirLabel(f.r)}) · tren {f.slope >= 0 ? "naik" : "turun"}{" "}
                      {Math.abs(f.slope).toFixed(1)}/th
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      <footer className="border-hd bg-white px-4 py-3 font-mono text-[11px] text-[#666] shadow-hd">
        Sumber: koperasi_aktif.csv + {varA === "rumah_makan" ? "rumah_makan.csv" : varA === "dana_desa" ? "dana_desa.csv" : "home_industri.csv"} (Open Data Banjarnegara, {tahunList[0]}–{tahunList[tahunList.length - 1]}).
        Korelasi Pearson & regresi linear dihitung di browser (sql.js). Data agregat per kecamatan, bukan koordinat titik.
      </footer>
    </div>
  );
}

function StatTile({ value, label, sub, accent }: { value: string; label: string; sub?: string; accent?: string }) {
  return (
    <div className="border-hd bg-white p-4 shadow-hd">
      <p className="font-mono text-[10px] font-semibold tracking-widest text-[#888]">{label.toUpperCase()}</p>
      <p className="mt-1 font-serif italic text-3xl font-semibold" style={{ color: accent ?? INK }}>{value}</p>
      {sub && <p className="mt-1 font-mono text-[10px] leading-snug text-[#666]">{sub}</p>}
    </div>
  );
}
