import { useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  getIpmTren, getGiniTren, getPertumbuhanTren,
  getGarisKemiskinanTren, getKedalamanTren, getKeparahanTren,
  getPopMiskin,
  getPdrbTahunList, getPdrbTahun,
} from "@/lib/db";
import { useDB } from "@/hooks/useDB";
import { Panel, SectionHead, fmtNum } from "@/components/ui";

const ACCENT = "#ff7d2d";
const INK = "#141414";
const OR = "#ff7d2d";
const TEAL = "#0e7c7b";
const GREEN = "#1e7a46";
const PURPLE = "#7b5cbf";

const last = (a: { tahun: number; nilai: number }[]) => a[a.length - 1];
const prev = (a: { tahun: number; nilai: number }[]) => a[a.length - 2];
const delta = (a: { tahun: number; nilai: number }[]) =>
  a.length >= 2 ? last(a).nilai - prev(a).nilai : 0;

function Skeleton() {
  return (
    <div className="flex flex-col items-center justify-center py-32 animate-pulse">
      <div className="h-8 w-8 border-2 border-hd-subtle animate-spin" />
      <p className="mt-3 font-mono text-xs uppercase tracking-widest text-[#888]">Memuat Data…</p>
    </div>
  );
}

function ErrorState({ msg }: { msg?: string }) {
  return (
    <div className="py-32 text-center">
      <p className="font-mono text-sm font-bold text-[#c0392b]">Gagal memuat data.</p>
      {msg && <p className="mt-2 font-mono text-xs text-[#999]">{msg}</p>}
    </div>
  );
}

export default function Makro() {
  const { status, error } = useDB();

  const ipm = useMemo(() => getIpmTren(), []);
  const gini = useMemo(() => getGiniTren(), []);
  const laju = useMemo(() => getPertumbuhanTren(), []);
  const gk = useMemo(() => getGarisKemiskinanTren(), []);
  const kedalaman = useMemo(() => getKedalamanTren(), []);
  const keparahan = useMemo(() => getKeparahanTren(), []);
  const popMiskin = useMemo(() => getPopMiskin(), []);
  const pdrbTahunList = useMemo(() => getPdrbTahunList("berlaku"), []);

  const [pdrbJenis, setPdrbJenis] = useState<"berlaku" | "konstan">("berlaku");
  const [pdrbTahun, setPdrbTahun] = useState<number | null>(null);
  const tahunAktif = pdrbTahun ?? pdrbTahunList[pdrbTahunList.length - 1] ?? 2024;
  const pdrbData = useMemo(() => getPdrbTahun(tahunAktif, pdrbJenis), [tahunAktif, pdrbJenis]);
  const totalPdrb = pdrbData.reduce((s, r) => s + r.nilai, 0);
  const topPdrb = pdrbData
    .filter((r) => r.nilai > 0)
    .sort((a, b) => b.nilai - a.nilai)
    .slice(0, 8);

  if (status === "loading") return <Skeleton />;
  if (status === "error") return <ErrorState msg={error} />;

  const ipmLast = last(ipm);
  const giniLast = last(gini);
  const pmLast = popMiskin[popMiskin.length - 1];
  const gkLast = last(gk);

  const kmisMap = new Map<number, Record<string, unknown>>();
  const setK = (d: { tahun: number; nilai: number }[], k: string) =>
    d.forEach((r) => {
      if (!kmisMap.has(r.tahun)) kmisMap.set(r.tahun, { tahun: r.tahun });
      kmisMap.get(r.tahun)![k] = r.nilai;
    });
  setK(gk, "garis");
  setK(kedalaman, "kedalaman");
  setK(keparahan, "keparahan");
  popMiskin.forEach((r) => {
    if (!kmisMap.has(r.tahun)) kmisMap.set(r.tahun, { tahun: r.tahun });
    kmisMap.get(r.tahun)!.proporsi = r.proporsi;
  });
  const kmisData = [...kmisMap.values()].sort((a, b) => (a.tahun as number) - (b.tahun as number));

  const pdrbChart = topPdrb.map((r) => ({
    name: r.sektor.length > 28 ? r.sektor.slice(0, 28) + "…" : r.sektor,
    nilai: r.nilai,
    kontribusi: r.kontribusi,
  }));

  const pdrbMax = Math.max(...pdrbChart.map((d) => d.nilai), 1);

  return (
    <div className="max-w-[1200px] mx-auto px-5 flex flex-col gap-5">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-[#888]">
              Kabupaten Banjarnegara · BPS
            </p>
            <h1 className="font-serif italic text-3xl md:text-4xl font-semibold text-[#141414]">
              Dashboard Makro
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPdrbJenis("berlaku")}
              className={`px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider border-hd cursor-pointer transition-transform ${
                pdrbJenis === "berlaku" ? "bg-[#141414] text-white" : "bg-white hover:-translate-y-0.5"
              }`}
            >
              Harga Berlaku
            </button>
            <button
              onClick={() => setPdrbJenis("konstan")}
              className={`px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider border-hd cursor-pointer transition-transform ${
                pdrbJenis === "konstan" ? "bg-[#141414] text-white" : "bg-white hover:-translate-y-0.5"
              }`}
            >
              Konstan 2010
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-[#666] max-w-2xl leading-relaxed">
          PDRB per sektor, pertumbuhan ekonomi, kemiskinan, IPM, dan Indeks Gini — sumber BPS Kab. Banjarnegara.
        </p>
      </div>

      {/* 6 Stat Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {[
          {
            label: "Laju Pertumbuhan",
            value: laju.length ? `${(last(laju)!.nilai >= 0 ? "+" : "") + last(laju)!.nilai.toFixed(2)}` : "—",
            suffix: "%",
            sub: laju.length >= 2 ? `Δ ${(delta(laju) >= 0 ? "+" : "") + delta(laju).toFixed(2)} p.p. vs ${prev(laju)!.tahun}` : "",
            accent: ACCENT,
          },
          {
            label: "PDRB",
            value: totalPdrb > 0 ? (totalPdrb / 1_000_000).toFixed(1) : "—",
            suffix: "T juta Rp",
            sub: `${pdrbData.length} sektor · ${tahunAktif}`,
            accent: INK,
          },
          {
            label: "IPM",
            value: ipmLast ? ipmLast.nilai.toFixed(2) : "—",
            suffix: "",
            sub: ipm.length >= 2 ? `Δ ${(delta(ipm) >= 0 ? "+" : "") + delta(ipm).toFixed(2)} vs ${prev(ipm)!.tahun}` : "",
            accent: TEAL,
          },
          {
            label: "Indeks Gini",
            value: giniLast ? giniLast.nilai.toFixed(3) : "—",
            suffix: "",
            sub: gini.length >= 2 ? `Δ ${(delta(gini) >= 0 ? "+" : "") + delta(gini).toFixed(3)} vs ${prev(gini)!.tahun}` : "",
            accent: delta(gini) <= 0 ? GREEN : ACCENT,
          },
          {
            label: "Miskinan",
            value: pmLast ? pmLast.proporsi.toFixed(2) : "—",
            suffix: "%",
            sub: pmLast ? `${fmtNum(pmLast.jumlah)} jiwa` : "",
            accent: ACCENT,
          },
          {
            label: "Garis Miskin",
            value: gkLast ? fmtNum(Math.round(gkLast.nilai)) : "—",
            suffix: "Rp/hr",
            sub: gk.length >= 2 ? `Δ +${fmtNum(Math.round(Math.abs(delta(gk))))} vs ${prev(gk)!.tahun}` : "",
            accent: PURPLE,
          },
        ].map((c, i) => (
          <div key={i} className="bg-white border-hd p-4 shadow-hd">
            <div className="flex items-baseline gap-1">
              <span className="font-mono font-extrabold text-2xl tracking-tight" style={{ color: c.accent }}>
                {c.value}
              </span>
              {c.suffix && <span className="font-mono text-xs font-bold text-[#747474]">{c.suffix}</span>}
            </div>
            <div className="mt-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#747474]">
              {c.label}
            </div>
            {c.sub && (
              <div className="mt-1 font-mono text-[9px] text-[#999]">{c.sub}</div>
            )}
          </div>
        ))}
      </div>

      {/* PDRB Bar Chart */}
      <Panel>
        <div className="flex items-center justify-between mb-4">
          <SectionHead tag={`PDRB per Sektor · ${pdrbJenis === "berlaku" ? "Harga Berlaku" : "Harga Konstan 2010"}`} />
          <select
            value={tahunAktif}
            onChange={(e) => setPdrbTahun(Number(e.target.value))}
            className="font-mono text-[10px] font-bold uppercase tracking-wider border border-hd bg-white px-2 py-1 cursor-pointer"
          >
            {[...pdrbTahunList].reverse().map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div style={{ height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pdrbChart} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e5e5" />
              <XAxis type="number" tick={{ fontSize: 9, fontFamily: "monospace" }} tickFormatter={(v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}T` : v >= 1000 ? `${(v / 1000).toFixed(0)}B` : String(v)} />
              <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10, fontFamily: "monospace" }} />
              <Tooltip
                formatter={(value) => [`${fmtNum(Number(value))} juta Rp`, "Nilai"]}
                labelStyle={{ fontFamily: "monospace", fontWeight: 700, color: INK }}
                contentStyle={{ border: `1px solid ${INK}`, background: "#fff", fontFamily: "monospace", fontSize: 11, boxShadow: `3px 3px 0 ${INK}` }}
              />
              <Bar dataKey="nilai" radius={[0, 2, 2, 0]}>
                {pdrbChart.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? ACCENT : INK} fillOpacity={i === 0 ? 1 : 0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* Row: Pertumbuhan + IPM */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel>
          <SectionHead tag="Laju Pertumbuhan PDRB (%)" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={laju} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradLaju" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={ACCENT} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                <XAxis dataKey="tahun" tick={{ fontSize: 10, fontFamily: "monospace" }} />
                <YAxis tick={{ fontSize: 10, fontFamily: "monospace" }} domain={["dataMin - 1", "dataMax + 1"]} />
                <Tooltip
                  formatter={(value) => [`${value}%`, "Laju"]}
                  contentStyle={{ border: `1px solid ${INK}`, background: "#fff", fontFamily: "monospace", fontSize: 11, boxShadow: `3px 3px 0 ${INK}` }}
                />
                <Area type="monotone" dataKey="nilai" stroke={ACCENT} strokeWidth={2.5} fill="url(#gradLaju)" dot={{ r: 3, fill: ACCENT, stroke: INK, strokeWidth: 1 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <SectionHead tag="Indeks Pembangunan Manusia (IPM)" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ipm} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradIpm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={TEAL} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={TEAL} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                <XAxis dataKey="tahun" tick={{ fontSize: 10, fontFamily: "monospace" }} />
                <YAxis tick={{ fontSize: 10, fontFamily: "monospace" }} domain={["dataMin - 2", "dataMax + 2"]} />
                <Tooltip
                  formatter={(value) => [value, "IPM"]}
                  contentStyle={{ border: `1px solid ${INK}`, background: "#fff", fontFamily: "monospace", fontSize: 11, boxShadow: `3px 3px 0 ${INK}` }}
                />
                <Area type="monotone" dataKey="nilai" stroke={TEAL} strokeWidth={2.5} fill="url(#gradIpm)" dot={{ r: 3, fill: TEAL, stroke: INK, strokeWidth: 1 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* Row: Kemiskinan + Gini */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel>
          <SectionHead tag="Indikator Kemiskinan · Garis (Rp/hr) & Proporsi (%)" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={kmisData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                <XAxis dataKey="tahun" tick={{ fontSize: 10, fontFamily: "monospace" }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fontFamily: "monospace" }} label={{ value: "Rp/hr", angle: -90, position: "insideLeft", fontSize: 9, fontFamily: "monospace" }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fontFamily: "monospace" }} label={{ value: "%", angle: 90, position: "insideRight", fontSize: 9, fontFamily: "monospace" }} />
                <Tooltip
                  contentStyle={{ border: `1px solid ${INK}`, background: "#fff", fontFamily: "monospace", fontSize: 11, boxShadow: `3px 3px 0 ${INK}` }}
                />
                <Line yAxisId="left" type="monotone" dataKey="garis" name="Garis Miskin" stroke={PURPLE} strokeWidth={2.5} dot={{ r: 2.5 }} />
                <Line yAxisId="right" type="monotone" dataKey="proporsi" name="Proporsi Miskin" stroke={ACCENT} strokeWidth={2.5} dot={{ r: 2.5 }} />
                <Line yAxisId="right" type="monotone" dataKey="kedalaman" name="Kedalaman" stroke={TEAL} strokeWidth={2} strokeDasharray="5 3" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="keparahan" name="Keparahan" stroke={INK} strokeWidth={2} strokeDasharray="3 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <SectionHead tag="Indeks Gini · Kesenjangan Pendapatan" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={gini} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                <XAxis dataKey="tahun" tick={{ fontSize: 10, fontFamily: "monospace" }} />
                <YAxis tick={{ fontSize: 10, fontFamily: "monospace" }} domain={["dataMin - 0.01", "dataMax + 0.01"]} />
                <Tooltip
                  formatter={(value) => [value, "Gini"]}
                  contentStyle={{ border: `1px solid ${INK}`, background: "#fff", fontFamily: "monospace", fontSize: 11, boxShadow: `3px 3px 0 ${INK}` }}
                />
                <Line type="monotone" dataKey="nilai" stroke={ACCENT} strokeWidth={2.5} dot={{ r: 4, fill: ACCENT, stroke: INK, strokeWidth: 1.5 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap gap-4 items-center justify-between border-hd bg-white px-4 py-3 shadow-hd">
        <p className="text-[11px] text-[#666] max-w-xl leading-relaxed">
          Sumber: BPS Kab. Banjarnegara. Inflasi & PDRB per kapita tidak tersedia di master data.
          Nilai PDRB dalam juta rupiah.
        </p>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] border border-hd px-3 py-1 text-[#141414]">
          Data · 2016–2024
        </span>
      </div>
    </div>
  );
}
