// src/pages/Pasar.tsx
// Pasar & Sarana Perdagangan: tren jumlah pasar per jenis, sarana perdagangan, peta titik pasar.

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDB } from "@/hooks/useDB";
import { getPasarTahunList, getPasarTren, getSaranaTren } from "@/lib/db";
import { fmtNum } from "@/components/ui";
import PetaKlaster from "@/components/PetaPasar";
import { Panel, SectionHead, Badge, MonoLabel } from "@/components/ui";

const JENIS_WARNA: Record<string, string> = {
  umum: "#141414",
  hewan: "#f59e0b",
  buah: "#16a34a",
  ikan: "#2563eb",
};

// Sarana: warna per jenis
const SARANA_WARNA: Record<string, string> = {
  Pasar: "#141414",
  Kios: "#ff7d2d",
  "Lain-lain": "#747474",
};

export default function Pasar() {
  const { status } = useDB();
  const [tahun, setTahun] = useState<number | "latest">("latest");

  const tahunList = useMemo(() => (status === "ready" ? getPasarTahunList() : []), [status]);
  const tahunTerbaru = tahunList.length ? tahunList[tahunList.length - 1] : 0;
  const effTahun: number = tahun === "latest" ? tahunTerbaru : tahun;
  const tren = useMemo(() => (status === "ready" ? getPasarTren() : []), [status]);
  const sarana = useMemo(
    () => (status === "ready" ? getSaranaTren().filter((r) => r.jenis !== "total") : []),
    [status]
  );

  const jenisList = useMemo(
    () => Array.from(new Set(tren.map((r) => r.jenis.toLowerCase()))).filter((j) => j !== "total"),
    [tren]
  );

  const chartData = useMemo(
    () =>
      tahunList.map((t) => {
        const row: Record<string, number | string> = { tahun: t };
        for (const j of jenisList) {
          const hit = tren.find((r) => r.tahun === t && r.jenis.toLowerCase() === j);
          row[j] = hit?.jumlah ?? 0;
        }
        return row;
      }),
    [tahunList, jenisList, tren]
  );

  const totalTahun = useMemo(() => {
    return jenisList.reduce((s, j) => {
      const hit = tren.find((r) => r.tahun === effTahun && r.jenis.toLowerCase() === j);
      return s + (hit?.jumlah ?? 0);
    }, 0);
  }, [effTahun, jenisList, tren]);

  const saranaTahunList = useMemo(
    () => Array.from(new Set(sarana.map((r) => r.tahun))).sort((a, b) => a - b),
    [sarana]
  );
  const saranaJenisList = useMemo(
    () => Array.from(new Set(sarana.map((r) => r.jenis))),
    [sarana]
  );
  const saranaChart = useMemo(
    () =>
      saranaTahunList.map((t) => {
        const row: Record<string, number | string> = { tahun: t };
        for (const j of saranaJenisList) {
          const hit = sarana.find((r) => r.tahun === t && r.jenis === j);
          row[j] = hit?.jumlah ?? 0;
        }
        return row;
      }),
    [saranaTahunList, saranaJenisList, sarana]
  );

  // Gap analisis: pasar (tradisional) vs kios (modern)
  const gap = useMemo(() => {
    if (sarana.length === 0) return null;
    const first = saranaTahunList[0];
    const last = saranaTahunList[saranaTahunList.length - 1];
    const get = (jenis: string, tahun: number) =>
      sarana.find((r) => r.jenis === jenis && r.tahun === tahun)?.jumlah ?? 0;
    const pasarF = get("Pasar", first), pasarL = get("Pasar", last);
    const kiosF = get("Kios", first), kiosL = get("Kios", last);
    const rPasar = pasarF > 0 ? ((pasarL - pasarF) / pasarF) * 100 : 0;
    const rKios = kiosF > 0 ? ((kiosL - kiosF) / kiosF) * 100 : 0;
    const gapKios = kiosL - pasarL; // surplus kios vs pasar
    return { first, last, pasarF, pasarL, kiosF, kiosL, rPasar, rKios, gapKios };
  }, [sarana, saranaTahunList]);

  if (status !== "ready") {
    return (
      <div className="max-w-[1200px] mx-auto px-5 py-20">
        <Panel>
          <MonoLabel>Memuat...</MonoLabel>
        </Panel>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-5 pb-16">
      <section className="pt-10">
        <span className="inline-block font-mono text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#747474] border-hd px-2.5 py-1 bg-white">
          Pasar & Sarana Perdagangan
        </span>
        <h2 className="font-serif italic font-semibold text-4xl md:text-5xl leading-[1.05] mt-4 tracking-tight">
          Titik-titik perdagangan.
        </h2>
        <p className="max-w-[640px] text-[15px] leading-relaxed text-[#333] mt-3">
          Perkembangan jumlah pasar (umum, hewan, buah, ikan) dan sarana perdagangan di Kabupaten
          Banjarnegara tahun ke tahun. Sumber:{" "}
          <a
            href="https://banjarnegara.bps.go.id/id/static-table/21/3349/01/tabel.php"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-[#747474] underline-offset-2 hover:text-black"
          >
            BPS Banjarnegara
          </a>
          .
        </p>
      </section>

      <div className="grid md:grid-cols-3 gap-5 mt-8">
        <Panel>
          <MonoLabel>Total Pasar ({effTahun})</MonoLabel>
          <div className="font-mono font-extrabold text-4xl">
            {fmtNum(totalTahun)}
            <span className="text-sm text-[#747474] ml-1">unit</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {jenisList.map((j) => {
              const hit = tren.find(
                (r) => r.tahun === effTahun && r.jenis.toLowerCase() === j
              );
              return (
                <Badge key={j} tone="neutral">
                  {j}: {fmtNum(hit?.jumlah ?? 0)}
                </Badge>
              );
            })}
          </div>
        </Panel>
        <Panel className="md:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <MonoLabel>Pilih Tahun</MonoLabel>
            <select
              value={String(tahun)}
              onChange={(e) => setTahun(e.target.value === "latest" ? ("latest" as const) : Number(e.target.value))}
              className="border-hd p-2 text-xs font-mono font-medium outline-none focus:border-black bg-white"
            >
              <option value="latest">Terbaru ({tahunTerbaru})</option>
              {tahunList
                .slice(0, -1)
                .map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
            </select>
          </div>
          <div className="font-serif italic text-xl leading-snug">
            Pasar adalah pusat perputaran ekonomi lokal — tempat petani, pedagang, dan industri rumah
            tangga bertemu.
          </div>
        </Panel>
      </div>

      <div className="mt-8">
        <SectionHead tag="Tren Jumlah Pasar">
          <Badge tone="neutral">{tahunList[0]}–{tahunTerbaru}</Badge>
        </SectionHead>
        <Panel>
          <div style={{ width: "100%", height: 340 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid stroke="#141414" strokeOpacity={0.1} />
                <XAxis
                  dataKey="tahun"
                  tick={{ fill: "#747474", fontSize: 10, fontFamily: "JetBrains Mono" }}
                  axisLine={{ stroke: "#141414" }}
                  tickLine={{ stroke: "#141414" }}
                />
                <YAxis
                  tick={{ fill: "#747474", fontSize: 10, fontFamily: "JetBrains Mono" }}
                  axisLine={{ stroke: "#141414" }}
                  tickLine={{ stroke: "#141414" }}
                />
                <Tooltip
                  contentStyle={{
                    border: "1px solid #141414",
                    borderRadius: 0,
                    fontFamily: "JetBrains Mono",
                    fontSize: 12,
                    boxShadow: "4px 4px 0 0 #141414",
                  }}
                />
                {jenisList.map((j) => (
                  <Line
                    key={j}
                    type="monotone"
                    dataKey={j}
                    stroke={JENIS_WARNA[j] ?? "#6b7280"}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    name={j}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mt-6">
        <div>
          <SectionHead tag="Sarana Perdagangan" />
          <Panel>
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={saranaChart} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid stroke="#141414" strokeOpacity={0.1} horizontal={false} />
                  <XAxis
                    dataKey="tahun"
                    tick={{ fill: "#747474", fontSize: 10, fontFamily: "JetBrains Mono" }}
                    axisLine={{ stroke: "#141414" }}
                    tickLine={{ stroke: "#141414" }}
                  />
                  <YAxis
                    tick={{ fill: "#747474", fontSize: 10, fontFamily: "JetBrains Mono" }}
                    axisLine={{ stroke: "#141414" }}
                    tickLine={{ stroke: "#141414" }}
                  />
                  <Tooltip
                    contentStyle={{
                      border: "1px solid #141414",
                      borderRadius: 0,
                      fontFamily: "JetBrains Mono",
                      fontSize: 12,
                      boxShadow: "4px 4px 0 0 #141414",
                    }}
                  />
                  {saranaJenisList.map((j) => (
                    <Bar key={j} dataKey={j} fill={SARANA_WARNA[j] ?? "#a3a3a3"} name={j} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <div>
          <SectionHead tag="Peta Titik Pasar">
            <Badge tone="plan">Koordinat Riil</Badge>
          </SectionHead>
          <Panel className="!p-0 overflow-hidden">
            <PetaKlaster height={400} />
            <div className="p-3 border-t border-hd-subtle">
              <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                {[
                  { label: "Tradisional", warna: "#ff7d2d" },
                  { label: "Ikan", warna: "#2563eb" },
                  { label: "Hewan", warna: "#7c3aed" },
                  { label: "Buah", warna: "#16a34a" },
                  { label: "Unggas", warna: "#db2777" },
                ].map(({ label, warna }) => (
                  <span key={label} className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em]">
                    <span className="inline-block h-2.5 w-2.5 rounded-full border border-white" style={{ background: warna }} />
                    {label}
                  </span>
                ))}
              </div>
              <p className="font-mono text-[10px] text-[#747474] leading-relaxed">
                36 titik pasar nyata dengan koordinat presisi. Klik titik untuk detail.
              </p>
            </div>
          </Panel>
        </div>
      </div>

      {gap && (
        <div className="mt-6">
          <SectionHead tag="Gap Analisis — Modern vs Tradisional">
            <Badge tone="plan">{gap.first}–{gap.last}</Badge>
          </SectionHead>
          <div className="grid md:grid-cols-3 gap-5">
            <Panel>
              <MonoLabel>Pasar Tradisional</MonoLabel>
              <div className="font-mono font-extrabold text-3xl text-[#141414]">
                {fmtNum(gap.pasarL)}
              </div>
              <div className="font-mono text-xs text-[#747474] mt-1">
                {gap.first}: {fmtNum(gap.pasarF)} → {gap.last}: {fmtNum(gap.pasarL)}
              </div>
              <div
                className={`inline-block font-mono text-xs font-bold px-2 py-1 mt-3 border-hd ${
                  gap.rPasar >= 0 ? "bg-[#f0fdf4] text-[#16a34a]" : "bg-[#fef2f2] text-[#dc2626]"
                }`}
              >
                {gap.rPasar >= 0 ? "+" : ""}
                {gap.rPasar.toFixed(1)}%
              </div>
            </Panel>
            <Panel>
              <MonoLabel>Kios (Modern)</MonoLabel>
              <div className="font-mono font-extrabold text-3xl text-[#ff7d2d]">
                {fmtNum(gap.kiosL)}
              </div>
              <div className="font-mono text-xs text-[#747474] mt-1">
                {gap.first}: {fmtNum(gap.kiosF)} → {gap.last}: {fmtNum(gap.kiosL)}
              </div>
              <div
                className={`inline-block font-mono text-xs font-bold px-2 py-1 mt-3 border-hd ${
                  gap.rKios >= 0 ? "bg-[#f0fdf4] text-[#16a34a]" : "bg-[#fef2f2] text-[#dc2626]"
                }`}
              >
                {gap.rKios >= 0 ? "+" : ""}
                {gap.rKios.toFixed(1)}%
              </div>
            </Panel>
            <Panel className="border-2 border-[#ff7d2d]">
              <MonoLabel>Gap Kios − Pasar</MonoLabel>
              <div className="font-mono font-extrabold text-3xl text-[#ff7d2d]">
                +{fmtNum(gap.gapKios)}
              </div>
              <p className="text-xs leading-relaxed text-[#333] mt-3">
                Jumlah kios (sarana modern) melampaui jumlah pasar (tradisional) sebesar{" "}
                <strong>{fmtNum(gap.gapKios)} unit</strong>. Kios tumbuh{" "}
                <strong>{(gap.rKios - gap.rPasar).toFixed(1)} poin</strong> lebih cepat daripada
                pasar, mengindikasikan pergeseran pola perdagangan ke arah skala mikro dan
                ritel modern.
              </p>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
