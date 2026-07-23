// src/pages/Klaster.tsx
import { useMemo, useState } from "react";
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { useDB } from "@/hooks/useDB";
import { getKlasterDataset, type KlasterRow } from "@/lib/db";
import { kmeans, priorityLabels } from "@/lib/kmeans";
import { titleCase } from "@/lib/normalize";
import { Badge, Button, Field, fmtNum, MonoLabel, Panel, SectionHead } from "@/components/ui";

type Dimensi = "koperasi" | "homeIndustri" | "total";

function getVal(d: KlasterRow, dim: Dimensi): number {
  if (dim === "koperasi") return d.koperasi;
  if (dim === "homeIndustri") return d.homeIndustri;
  return d.koperasi + d.homeIndustri;
}

export default function Klaster() {
  const { status } = useDB();
  const [k, setK] = useState(3);
  const [dim, setDim] = useState<Dimensi>("total");

  const result = useMemo(() => {
    if (status !== "ready") return null;
    const ds = getKlasterDataset();
    const points = ds.map((d) => ({ label: d.kecamatan, values: [getVal(d, dim)] }));
    const res = kmeans(points, k);
    const labels = priorityLabels(res);
    const colors: Record<string, string> = {};
    ds.forEach((d, i) => {
      const c = res.clusters[i];
      const lab = labels.find((l) => l.idx === c);
      colors[d.kecamatan] = lab?.color ?? "#e5e7eb";
    });
    const scatterData = labels.map((l) => ({
      name: l.label,
      color: l.color,
      data: ds
        .map((d, i) => ({
          x: getVal(d, dim),
          y: getVal(d, dim),
          z: 6,
          kec: titleCase(d.kecamatan),
        }))
        .filter((_, i) => res.clusters[i] === l.idx),
    }));
    return { res, labels, colors, scatterData, ds };
  }, [status, k, dim]);

  if (status !== "ready" || !result) {
    return <div className="max-w-[1200px] mx-auto px-5 py-20"><Panel><MonoLabel>Memuat...</MonoLabel></Panel></div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto px-5 pb-16">
      <section className="pt-10">
        <span className="inline-block font-mono text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#747474] border-hd px-2.5 py-1 bg-white">
          Unsupervised Learning
        </span>
        <h2 className="font-serif italic font-semibold text-4xl md:text-5xl leading-[1.05] mt-4 tracking-tight">
          Klaster kecamatan berbasis potensi.
        </h2>
        <p className="max-w-[640px] text-[15px] leading-relaxed text-[#333] mt-3">
          K-Means mengelompokkan 20 kecamatan berdasarkan jumlah koperasi aktif. Atur jumlah klaster (k) lalu
          jalankan ulang.
        </p>
      </section>

      <div className="mt-8">
        <SectionHead tag="Kontrol" />
        <Panel className="flex flex-wrap items-end gap-4">
          <Field label="Jumlah Klaster (k)">
            <select
              value={k}
              onChange={(e) => setK(Number(e.target.value))}
              className="border-hd p-2 text-xs font-mono font-medium outline-none focus:border-black bg-white"
            >
              {[2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  k = {n}
                </option>
              ))}
            </select>
          </Field>
          <Button onClick={() => setK(k)}>Jalankan Ulang</Button>
          <Field label="Dimensi">
            <select
              value={dim}
              onChange={(e) => setDim(e.target.value as Dimensi)}
              className="border-hd p-2 text-xs font-mono font-medium outline-none focus:border-black bg-white"
            >
              <option value="total">Total (Koperasi + Home Industri)</option>
              <option value="koperasi">Koperasi Aktif</option>
              <option value="homeIndustri">Home Industri</option>
            </select>
          </Field>
          <div className="ml-auto font-mono text-[11px] text-[#747474] uppercase tracking-wide">
            Iterasi: {result.res.iterations} · Titik: {result.ds.length}
          </div>
        </Panel>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mt-6">
        <div>
          <SectionHead tag="Scatter Plot" />
          <Panel>
            <MonoLabel>Sebaran klaster (x: {dim === "koperasi" ? "koperasi" : dim === "homeIndustri" ? "home industri" : "total UMKM"})</MonoLabel>
            <div style={{ width: "100%", height: 380 }}>
              <ResponsiveContainer>
                <ScatterChart margin={{ top: 20, right: 20, left: -10, bottom: 10 }}>
                  <CartesianGrid stroke="#141414" strokeOpacity={0.1} />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name={dim === "koperasi" ? "Koperasi" : dim === "homeIndustri" ? "Home Industri" : "Total"}
                    tick={{ fill: "#747474", fontSize: 10, fontFamily: "JetBrains Mono" }}
                    axisLine={{ stroke: "#141414" }}
                    tickLine={{ stroke: "#141414" }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name={dim === "koperasi" ? "Koperasi" : dim === "homeIndustri" ? "Home Industri" : "Total"}
                    tick={{ fill: "#747474", fontSize: 10, fontFamily: "JetBrains Mono" }}
                    axisLine={{ stroke: "#141414" }}
                    tickLine={{ stroke: "#141414" }}
                  />
                  <ZAxis type="number" dataKey="z" range={[60, 60]} />
                  <Tooltip
                    contentStyle={{
                      border: "1px solid #141414",
                      borderRadius: 0,
                      fontFamily: "JetBrains Mono",
                      fontSize: 12,
                      boxShadow: "4px 4px 0 0 #141414",
                    }}
                    cursor={{ strokeDasharray: "3 3" }}
                  />
                  {result.scatterData.map((s) => (
                    <Scatter key={s.name} name={s.name} data={s.data} fill={s.color} stroke="#141414" />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <div>
          <SectionHead tag="Keanggotaan" />
          <Panel className="!p-0 overflow-hidden">
            <div className="max-h-[460px] overflow-auto">
              <table className="w-full text-left">
                <thead className="bg-[#141414] text-white font-mono text-[10px] uppercase tracking-wide sticky top-0">
                  <tr>
                    <th className="p-3 font-bold">Kecamatan</th>
                    <th className="p-3 font-bold text-right">Koperasi</th>
                    <th className="p-3 font-bold text-right">Home Industri</th>
                    <th className="p-3 font-bold text-right">Total</th>
                    <th className="p-3 font-bold">Klaster</th>
                  </tr>
                </thead>
                <tbody>
                  {result.ds.map((d, i) => {
                    const c = result.res.clusters[i];
                    const lab = result.labels.find((l) => l.idx === c);
                    return (
                      <tr key={d.kecamatan} className="border-t border-hd-subtle font-mono text-xs">
                        <td className="p-3 uppercase tracking-wide">{titleCase(d.kecamatan)}</td>
                        <td className="p-3 text-right">{fmtNum(d.koperasi)}</td>
                        <td className="p-3 text-right">{fmtNum(d.homeIndustri)}</td>
                        <td className="p-3 text-right font-bold">{fmtNum(getVal(d, dim))}</td>
                        <td className="p-3">
                          <span
                            className="inline-block w-4 h-4 border-hd align-middle mr-2"
                          style={{ background: lab?.color }}
                        />
                        <span className="uppercase tracking-wide">{lab?.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-6">
        <SectionHead tag="Ringkasan Klaster" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-0 border-hd-2 bg-white">
          {result.labels.map((l) => {
            const count = result.res.clusters.filter((c) => c === l.idx).length;
            return (
              <div key={l.idx} className="p-4 border-r border-hd-subtle last:border-r-0">
                <span className="inline-block w-5 h-5 border-hd mb-2" style={{ background: l.color }} />
                <div className="font-mono font-extrabold text-2xl">{count}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#747474] mt-1">
                  {l.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <Badge tone="neutral">Catatan</Badge>
        <p className="font-mono text-[11px] text-[#747474] uppercase tracking-wide">
          Dimensi: koperasi aktif &amp; home industri (pangan/sandang/konveksi/jasa) per kecamatan. Sumber:
          DISPERINDAGKOP UKM &amp; Dispermades PKK.
        </p>
      </div>
    </div>
  );
}
