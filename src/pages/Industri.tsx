// src/pages/Industri.tsx
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDB } from "@/hooks/useDB";
import { getIndustriList, getIndustriTahunList } from "@/lib/db";
import { prettyLabel } from "@/lib/normalize";
import { Badge, Field, fmtNum, MonoLabel, Panel, SectionHead } from "@/components/ui";

export default function Industri() {
  const { status } = useDB();
  const [tahun, setTahun] = useState<number | "all">("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"tk" | "jml" | "inv" | "prod">("tk");

  const tahunList = useMemo(() => (status === "ready" ? getIndustriTahunList() : []), [status]);

  const rows = useMemo(() => {
    if (status !== "ready") return [];
    const data = getIndustriList(tahun).map((d) => ({ ...d, label: prettyLabel(d.jenis_normalized) }));
    const filtered = q.trim()
      ? data.filter((d) => d.label.toLowerCase().includes(q.toLowerCase()))
      : data;
    return filtered.sort((a, b) => (b[sort] as number) - (a[sort] as number));
  }, [status, tahun, q, sort]);

  const top10 = rows.slice(0, 10);

  if (status !== "ready") {
    return <div className="max-w-[1200px] mx-auto px-5 py-20"><Panel><MonoLabel>Memuat...</MonoLabel></Panel></div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto px-5 pb-16">
      <section className="pt-10">
        <span className="inline-block font-mono text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#747474] border-hd px-2.5 py-1 bg-white">
          Eksplorasi Data
        </span>
        <h2 className="font-serif italic font-semibold text-4xl md:text-5xl leading-[1.05] mt-4 tracking-tight">
          Direktori industri &amp; komoditas.
        </h2>
        <p className="max-w-[640px] text-[15px] leading-relaxed text-[#333] mt-3">
          Daftar jenis industri rumah tangga &amp; kecil Kabupaten Banjarnegara beserta tenaga kerja, nilai
          investasi, dan produksi. Saring per tahun atau cari komoditas.
        </p>
      </section>

      <div className="mt-8">
        <SectionHead tag="Filter" />
        <Panel className="grid sm:grid-cols-3 gap-4">
          <Field label="Tahun">
            <select
              value={String(tahun)}
              onChange={(e) => setTahun(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="w-full border-hd p-2 text-xs font-mono font-medium outline-none focus:border-black bg-white"
            >
              <option value="all">Semua Tahun (gabungan)</option>
              {tahunList.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cari Komoditas">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="cth: tempe, batik, genteng"
              className="w-full border-hd p-2 text-xs font-mono font-medium outline-none focus:border-black bg-white"
            />
          </Field>
          <Field label="Urutkan">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="w-full border-hd p-2 text-xs font-mono font-medium outline-none focus:border-black bg-white"
            >
              <option value="tk">Tenaga Kerja</option>
              <option value="jml">Jumlah Perusahaan</option>
              <option value="inv">Nilai Investasi</option>
              <option value="prod">Produksi</option>
            </select>
          </Field>
        </Panel>
      </div>

      <div className="grid md:grid-cols-[1fr_1.4fr] gap-5 mt-6">
        <div>
          <SectionHead tag="Top 10" />
          <Panel>
            <MonoLabel>Berdasarkan {sort.toUpperCase()}</MonoLabel>
            <div style={{ width: "100%", height: 380 }}>
              <ResponsiveContainer>
                <BarChart
                  data={top10.map((r) => ({ nama: r.label, nilai: r[sort] as number }))}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
                >
                  <CartesianGrid stroke="#141414" strokeOpacity={0.1} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "#747474", fontSize: 10, fontFamily: "JetBrains Mono" }}
                    axisLine={{ stroke: "#141414" }}
                    tickLine={{ stroke: "#141414" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="nama"
                    width={170}
                    tick={{ fill: "#141414", fontSize: 10, fontFamily: "JetBrains Mono" }}
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
                  <Bar dataKey="nilai" fill="#141414" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <div>
          <SectionHead tag="Tabel">
            <Badge tone="neutral">{rows.length} jenis</Badge>
          </SectionHead>
          <Panel className="!p-0 overflow-hidden">
            <div className="max-h-[460px] overflow-auto">
              <table className="w-full text-left">
                <thead className="bg-[#141414] text-white font-mono text-[10px] uppercase tracking-wide sticky top-0">
                  <tr>
                    <th className="p-3 font-bold">Komoditas</th>
                    <th className="p-3 font-bold text-right">Unit</th>
                    <th className="p-3 font-bold text-right">Tenaga Kerja</th>
                    <th className="p-3 font-bold text-right">Investasi (jt)</th>
                    <th className="p-3 font-bold text-right">Produksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.jenis_normalized} className="border-t border-hd-subtle font-mono text-xs">
                      <td className="p-3 font-medium tracking-wide">{r.label}</td>
                      <td className="p-3 text-right">{fmtNum(r.jml)}</td>
                      <td className="p-3 text-right font-bold">{fmtNum(r.tk)}</td>
                      <td className="p-3 text-right">{fmtNum(r.inv)}</td>
                      <td className="p-3 text-right">{fmtNum(r.prod)}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center font-mono text-xs text-[#747474] uppercase">
                        Tidak ada hasil
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
