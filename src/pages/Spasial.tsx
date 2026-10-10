// src/pages/Spasial.tsx
// Analisis spasial UMKM: (1) peta choropleth per kecamatan (koperasi/home industri),
// (2) matriks industri agregat (unit × tenaga kerja × nilai produksi per sub-jenis).

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { useDB } from "@/hooks/useDB";
import {
  getKoperasiTren,
  getHomeIndustriKecamatan,
  getIndustriAgregat,
  getIndustriTahunList,
} from "@/lib/db";
import { fmtNum, Panel, SectionHead, Badge, MonoLabel } from "@/components/ui";
import PetaSpasial from "@/components/PetaSpasial";

const JENIS_WARNA: Record<string, string> = {
  "makanan & minuman": "#16a34a",
  tekstil: "#2563eb",
  logam: "#141414",
  "barang kayu": "#b45309",
  "kertas & cetak": "#747474",
  "barang dari karet": "#ea580c",
  "batu & tanah liya": "#a3a3a3",
  kimia: "#7c3aed",
  "listrik & elektronik": "#0891b2",
  "mekanik & mesin": "#4b5563",
  "barang dari batu": "#57534e",
  "barang jadi lainnya": "#78716c",
  "barang dari kulit": "#92400e",
  "barang dari bahan": "#6b7280",
  "barang dari ikan": "#0e7490",
  "barang dari kertas": "#a8a29e",
  "barang dari kulit & plastik": "#854d0e",
  "barang dari karet & plastik": "#c2410c",
};

export default function Spasial() {
  const { status } = useDB();
  const [tab, setTab] = useState<"peta" | "matriks">("peta");
  const [metrik, setMetrik] = useState<"koperasi" | "home">("koperasi");

  const kopTren = useMemo(() => (status === "ready" ? getKoperasiTren() : []), [status]);
  const home = useMemo(() => (status === "ready" ? getHomeIndustriKecamatan() : []), [status]);
  const industri = useMemo(() => (status === "ready" ? getIndustriAgregat() : []), [status]);
  const industriTahun = useMemo(() => (status === "ready" ? getIndustriTahunList() : []), [status]);

  const kopTahun = useMemo(
    () => Array.from(new Set(kopTren.map((r) => r.tahun))).sort((a, b) => a - b),
    [kopTren]
  );
  const homeTahun = useMemo(
    () => Array.from(new Set(home.map((r) => r.tahun))).sort((a, b) => a - b),
    [home]
  );
  const tahunList = metrik === "koperasi" ? kopTahun : homeTahun;
  const [tahun, setTahun] = useState<number | "latest">("latest");

  const tahunTerakhir = tahunList.length ? tahunList[tahunList.length - 1] : 0;
  const effTahun = tahun === "latest" ? tahunTerakhir : tahun;

  const petaData = useMemo(() => {
    const src = metrik === "koperasi" ? kopTren : home;
    const m: Record<string, number> = {};
    for (const r of src) {
      if (r.tahun === effTahun) m[r.kecamatan] = (m[r.kecamatan] ?? 0) + r.jumlah;
    }
    return m;
  }, [metrik, kopTren, home, effTahun]);

  // matriks: sub-jenis -> { unit, tkerja, nilai } untuk tahun terpilih
  const matriks = useMemo(() => {
    const t = effTahun;
    const rows = industri
      .filter((r) => r.tahun === t && r.jenis !== "total")
      .map((r) => ({
        jenis: r.jenis,
        unit: r.unit,
        tkerja: r.tkerja,
        nilai: r.nilai,
      }));
    return rows;
  }, [industri, effTahun]);

  if (status !== "ready") {
    return (
      <div className="max-w-[1200px] mx-auto px-5 py-20">
        <Panel>
          <MonoLabel>Memuat data...</MonoLabel>
        </Panel>
      </div>
    );
  }

  const maxNilai = Math.max(...matriks.map((m) => m.nilai), 1);

  return (
    <div className="max-w-[1200px] mx-auto px-5 pb-16">
      <section className="pt-10">
        <span className="inline-block font-mono text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#747474] border-hd px-2.5 py-1 bg-white">
          Analisis Spasial
        </span>
        <h2 className="font-serif italic font-semibold text-4xl md:text-5xl leading-[1.05] mt-4 tracking-tight">
          Sebaran di peta &amp; struktur industri.
        </h2>
        <p className="max-w-[640px] text-[15px] leading-relaxed text-[#333] mt-3">
          Peta choropleth kecamatan (koperasi aktif / home industri) dan matriks sub-jenis industri
          (unit usaha × tenaga kerja × nilai produksi).
        </p>
      </section>

      <div className="mt-8 inline-flex border-hd w-full">
        <button
          onClick={() => setTab("peta")}
          className={`flex-1 px-4 py-2.5 font-mono text-[11px] font-extrabold uppercase tracking-[0.18em] border-r border-hd ${
            tab === "peta" ? "bg-black text-white" : "bg-white text-[#747474] hover:bg-[#f5f5f5]"
          }`}
        >
          Peta Spasial
        </button>
        <button
          onClick={() => setTab("matriks")}
          className={`flex-1 px-4 py-2.5 font-mono text-[11px] font-extrabold uppercase tracking-[0.18em] ${
            tab === "matriks" ? "bg-black text-white" : "bg-white text-[#747474] hover:bg-[#f5f5f5]"
          }`}
        >
          Matriks Industri
        </button>
      </div>

      {tab === "peta" ? (
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="inline-flex border-hd">
              <button
                onClick={() => setMetrik("koperasi")}
                className={`px-3.5 py-2 font-mono text-[10px] font-extrabold uppercase tracking-[0.2em] border-r border-hd ${
                  metrik === "koperasi" ? "bg-black text-white" : "bg-white text-[#747474] hover:bg-[#f5f5f5]"
                }`}
              >
                Koperasi Aktif
              </button>
              <button
                onClick={() => setMetrik("home")}
                className={`px-3.5 py-2 font-mono text-[10px] font-extrabold uppercase tracking-[0.2em] ${
                  metrik === "home" ? "bg-black text-white" : "bg-white text-[#747474] hover:bg-[#f5f5f5]"
                }`}
              >
                Home Industri
              </button>
            </div>
            <select
              value={String(tahun)}
              onChange={(e) => setTahun(e.target.value === "latest" ? "latest" : Number(e.target.value))}
              className="border-hd p-2 text-xs font-mono font-medium outline-none focus:border-black bg-white"
            >
              <option value="latest">
                Terbaru ({tahunTerakhir})
              </option>
              {tahunList
                .slice(0, -1)
                .map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
            </select>
          </div>

          <Panel className="!p-0 overflow-hidden">
            <PetaSpasial
              data={petaData}
              label={metrik === "koperasi" ? "Koperasi aktif" : "Home industri"}
              height={460}
            />
            <div className="p-3 border-t border-hd-subtle flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-[#747474]">Rendah</span>
                <span
                  className="inline-block w-24 h-3 border border-hd"
                  style={{
                    background:
                      "linear-gradient(90deg, rgb(255,255,255), rgb(255,125,45))",
                  }}
                />
                <span className="font-mono text-[10px] text-[#747474]">Tinggi</span>
              </div>
              <Badge tone="neutral">
                {Object.keys(petaData).length} kecamatan · {effTahun}
              </Badge>
            </div>
          </Panel>
        </div>
      ) : (
        <div className="mt-6">
          <div className="flex items-center gap-3 mb-4">
            <select
              value={String(tahun)}
              onChange={(e) => setTahun(e.target.value === "latest" ? "latest" : Number(e.target.value))}
              className="border-hd p-2 text-xs font-mono font-medium outline-none focus:border-black bg-white"
            >
              <option value="latest">
                Terbaru ({industriTahun[industriTahun.length - 1]})
              </option>
              {industriTahun
                .slice(0, -1)
                .map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
            </select>
          </div>

          <div className="grid lg:grid-cols-5 gap-5">
            <Panel className="lg:col-span-3">
              <div style={{ width: "100%", height: 380 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                    <CartesianGrid stroke="#141414" strokeOpacity={0.1} />
                    <XAxis
                      type="number"
                      dataKey="unit"
                      name="Unit"
                      tick={{ fill: "#747474", fontSize: 10, fontFamily: "JetBrains Mono" }}
                      axisLine={{ stroke: "#141414" }}
                      tickLine={{ stroke: "#141414" }}
                      label={{ value: "Unit Usaha", position: "insideBottom", offset: -5, fontSize: 10, fill: "#747474", fontFamily: "JetBrains Mono" }}
                    />
                    <YAxis
                      type="number"
                      dataKey="tkerja"
                      name="Tenaga Kerja"
                      tick={{ fill: "#747474", fontSize: 10, fontFamily: "JetBrains Mono" }}
                      axisLine={{ stroke: "#141414" }}
                      tickLine={{ stroke: "#141414" }}
                      label={{ value: "Tenaga Kerja", angle: -90, position: "insideLeft", fontSize: 10, fill: "#747474", fontFamily: "JetBrains Mono" }}
                    />
                    <ZAxis type="number" dataKey="nilai" range={[60, 600]} name="Nilai Produksi" />
                    <Tooltip
                      contentStyle={{
                        border: "1px solid #141414",
                        borderRadius: 0,
                        fontFamily: "JetBrains Mono",
                        fontSize: 11,
                        boxShadow: "4px 4px 0 0 #141414",
                      }}
                      formatter={(v: number | string, name: string) => [fmtNum(Number(v)), name]}
                    />
                    <Scatter
                      data={matriks}
                      fill="#141414"
                      fillOpacity={0.7}
                      label={{ dataKey: "jenis", position: "right", fontSize: 9, fill: "#141414", fontFamily: "JetBrains Mono" }}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel className="lg:col-span-2">
              <SectionHead tag="Per Sub-Jenis" />
              <div className="max-h-[380px] overflow-auto border border-hd-subtle">
                <table className="w-full text-[11px] font-mono">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-hd text-left">
                      <th className="p-2 font-extrabold uppercase tracking-[0.14em]">Jenis</th>
                      <th className="p-2 font-extrabold uppercase tracking-[0.14em] text-right">Unit</th>
                      <th className="p-2 font-extrabold uppercase tracking-[0.14em] text-right">TK</th>
                      <th className="p-2 font-extrabold uppercase tracking-[0.14em] text-right">Nilai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matriks.map((m) => (
                      <tr key={m.jenis} className="border-b border-hd-subtle hover:bg-[#f5f5f5]">
                        <td className="p-2 truncate max-w-[140px]" title={m.jenis}>
                          {m.jenis}
                        </td>
                        <td className="p-2 text-right">{fmtNum(m.unit)}</td>
                        <td className="p-2 text-right">{fmtNum(m.tkerja)}</td>
                        <td className="p-2 text-right">
                          <span className="inline-block w-14 h-1.5 bg-[#e5e5e5] align-middle mr-1">
                            <span
                              className="block h-full bg-black"
                              style={{ width: `${(m.nilai / maxNilai) * 100}%` }}
                            />
                          </span>
                          {fmtNum(m.nilai)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
          <p className="font-mono text-[10px] text-[#747474] mt-3 leading-relaxed">
            Sumbu X: unit usaha · Sumbu Y: tenaga kerja · Ukuran titik: nilai produksi. Nilai
            produksi dalam rupiah (BPS). Tahun {effTahun}.
          </p>
        </div>
      )}
    </div>
  );
}


