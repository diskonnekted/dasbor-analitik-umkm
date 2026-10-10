// src/pages/Dasbor.tsx
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDB } from "@/hooks/useDB";
import { getKlasterDataset, getKoperasiTren, getPertumbuhan, getStatCards, getTopIndustri, query } from "@/lib/db";
import { kmeans, priorityLabels } from "@/lib/kmeans";
import { Badge, fmtNum, MonoLabel, Panel, SectionHead, StatCard } from "@/components/ui";
import PetaKlaster from "@/components/PetaKlaster";
import { titleCase } from "@/lib/normalize";

const CLUSTER_COLORS = ["#DC2626", "#F59E0B", "#10B981", "#2563EB", "#7C3AED"];

const KLASTER_KETERANGAN: Record<string, string> = {
  "Prioritas Tinggi": "Potensi ekonomi tinggi — konsentrasi koperasi & industri terbesar. Fokus intervensi utama.",
  "Prioritas Menengah": "Potensi sedang — layak dipacu dengan pendampingan & akses permodalan.",
  "Prioritas Rendah": "Potensi masih kecil — perlu pembangunan kapasitas dasar UMKM.",
};

export default function Dasbor() {
  const { status, error } = useDB();

  const data = useMemo(() => {
    if (status !== "ready") return null;
    const stat = getStatCards();
    const tren = getKoperasiTren();
    const tahunIndustri = stat.tahunIndustri ?? 2024;
    const topIndustri = getTopIndustri(tahunIndustri, 10, "tenaga_kerja");
    const ds = getKlasterDataset();
    const points = ds.map((d) => ({ label: d.kecamatan, values: [d.koperasi + d.homeIndustri] }));
    const res = kmeans(points, 3);
    const labels = priorityLabels(res);
    const colors: Record<string, string> = {};
    ds.forEach((d, i) => {
      const c = res.clusters[i];
      const lab = labels.find((l) => l.idx === c);
      colors[d.kecamatan] = lab?.color ?? "#e5e7eb";
    });

    // tren per tahun untuk chart line (total koperasi)
    const tahunUniq = [...new Set(tren.map((t) => t.tahun))].sort();
    const lineData = tahunUniq.map((t) => {
      const row: Record<string, number | string> = { tahun: String(t) };
      tren.filter((x) => x.tahun === t).forEach((x) => (row[titleCase(x.kecamatan)] = x.jumlah));
      return row;
    });
    const kecList = [...new Set(tren.map((t) => titleCase(t.kecamatan)))];

    // pertumbuhan ekonomi Banjarnegara
    const ptbh = getPertumbuhan();
    const ptbhBanjar = ptbh.filter((p) => p.wilayah === "Banjarnegara");
    const ptbhLine = ptbhBanjar.map((p) => ({ tahun: String(p.tahun), laju: p.laju }));

    // sarana perdagangan: tahun terbaru yang punya data, semua jenis (unik per jenis)
    const sarana = query<{ jenis: string; jumlah: number; tahun: number }>(
      "SELECT jenis, SUM(jumlah) jumlah, tahun FROM sarana_perdagangan WHERE jumlah IS NOT NULL AND tahun=(SELECT MAX(tahun) FROM sarana_perdagangan WHERE jumlah IS NOT NULL) GROUP BY jenis, tahun ORDER BY jumlah DESC"
    );
    const saranaTahun = sarana.length ? String(sarana[0].tahun) : "-";

    return { stat, topIndustri, lineData, kecList, ptbhLine, colors, labels, res, sarana, saranaTahun, tahunIndustri };
  }, [status]);

  if (status === "loading" || status === "idle")
    return <Skeleton text="Memuat data ke SQLite (sql.js)..." />;
  if (status === "error") return <ErrorState msg={error} />;
  if (!data) return null;

  return (
    <div className="max-w-[1200px] mx-auto px-5 pb-16">
      {/* Hero */}
      <section className="pt-10">
        <span className="inline-block font-mono text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#747474] border-hd px-2.5 py-1 bg-white">
          Data Driven Governance
        </span>
        <h2 className="font-serif italic font-semibold text-4xl md:text-5xl leading-[1.05] mt-4 tracking-tight">
          Peta potensi ekonomi lokal, satu dasbor.
        </h2>
        <p className="max-w-[640px] text-[15px] leading-relaxed text-[#333] mt-3">
          Ringkasan koperasi, industri, dan sarana perdagangan Kabupaten Banjarnegara dari data
          Dinas DISPERINDAGKOP UKM &amp; BPS. Semua diolah langsung di peramban via SQLite.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 mt-6 border-hd-2 bg-white">
          <StatCard
            value={fmtNum(data.stat.koperasiAktif)}
            label={`Koperasi Aktif ${data.stat.tahunKoperasi ?? ""}`}
          />
          <StatCard
            value={fmtNum(data.stat.industriUnit)}
            label={`Unit Industri ${data.stat.tahunIndustri ?? ""}`}
          />
          <StatCard value={fmtNum(data.stat.tenagaKerja)} label="Tenaga Kerja UMKM" tone="blue" />
          <StatCard
            value={
              data.stat.kontribusiPerdagangan != null
                ? data.stat.kontribusiPerdagangan.toFixed(2)
                : "-"
            }
            suffix="%"
            label="Kontribusi Perdagangan PDRB"
            tone="amber"
          />
        </div>
      </section>

      <div className="mt-10">
        <SectionHead tag="Tren Koperasi Aktif">
          <Badge tone="active">2022–2024</Badge>
        </SectionHead>
        <Panel>
          <MonoLabel>Jumlah koperasi aktif per kecamatan</MonoLabel>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={data.lineData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#141414" strokeOpacity={0.1} />
                <XAxis
                  dataKey="tahun"
                  tick={{ fill: "#747474", fontSize: 11, fontFamily: "JetBrains Mono" }}
                  axisLine={{ stroke: "#141414" }}
                  tickLine={{ stroke: "#141414" }}
                />
                <YAxis
                  tick={{ fill: "#747474", fontSize: 11, fontFamily: "JetBrains Mono" }}
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
                <Legend wrapperStyle={{ fontFamily: "JetBrains Mono", fontSize: 10 }} />
                {data.kecList.map((k, i) => (
                  <Line
                    key={k}
                    type="monotone"
                    dataKey={k}
                    stroke={CLUSTER_COLORS[i % CLUSTER_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#141414" }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mt-6">
        <div>
          <SectionHead tag="Top Industri" />
          <Panel>
            <MonoLabel>10 jenis industri teratas — tenaga kerja {data.tahunIndustri}</MonoLabel>
            <div style={{ width: "100%", height: 340 }}>
              <ResponsiveContainer>
                <BarChart
                  data={data.topIndustri.map((d) => ({
                    jenis: d.jenis_normalized,
                    tk: d.total,
                  }))}
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
                    dataKey="jenis"
                    width={140}
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
                  <Bar dataKey="tk" fill="#141414" radius={0}>
                    {data.topIndustri.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? "#DC2626" : "#141414"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <div>
          <SectionHead tag="Pertumbuhan Ekonomi" />
          <Panel>
            <MonoLabel>Laju pertumbuhan — Banjarnegara</MonoLabel>
            <div style={{ width: "100%", height: 340 }}>
              <ResponsiveContainer>
                <LineChart data={data.ptbhLine} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="#141414" strokeOpacity={0.1} />
                  <XAxis
                    dataKey="tahun"
                    tick={{ fill: "#747474", fontSize: 11, fontFamily: "JetBrains Mono" }}
                    axisLine={{ stroke: "#141414" }}
                    tickLine={{ stroke: "#141414" }}
                  />
                  <YAxis
                    tick={{ fill: "#747474", fontSize: 11, fontFamily: "JetBrains Mono" }}
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
                  <Line
                    type="monotone"
                    dataKey="laju"
                    stroke="#2563EB"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#141414" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-6">
        <SectionHead tag="Peta Klaster Potensi">
          <Badge tone="prio">K-Means k=3</Badge>
        </SectionHead>
        <div className="grid md:grid-cols-[1.6fr_1fr] gap-5">
          <PetaKlaster colors={data.colors} />
          <Panel>
            <MonoLabel>Legenda klaster</MonoLabel>
            <ul className="space-y-2.5">
              {data.labels.map((l) => (
                <li key={l.idx} className="flex items-start gap-3">
                  <span
                    className="w-5 h-5 border-hd shrink-0 mt-0.5"
                    style={{ background: l.color }}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block font-mono text-xs font-bold uppercase tracking-wide">
                      {l.label}
                    </span>
                    <span className="block text-[11px] leading-snug text-[#555]">
                      {KLASTER_KETERANGAN[l.label]}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] leading-snug text-[#666] border-l-2 border-[#141414] pl-2.5">
              Klaster dihitung dengan K-Means (k=3) atas jumlah <b>koperasi</b> + <b>industri rumah
              tangga</b> per kecamatan. Nilai lebih besar → prioritas lebih tinggi.
            </p>
            <div className="border-t border-hd-subtle pt-3 mt-3">
              <MonoLabel>Sarana Perdagangan ({data.saranaTahun})</MonoLabel>
              <ul className="mt-2 space-y-1.5">
                {data.sarana.map((s) => (
                  <li key={s.jenis} className="flex items-center justify-between font-mono text-xs">
                    <span className="uppercase tracking-wide">{s.jenis}</span>
                    <span className="font-bold">{fmtNum(s.jumlah)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] leading-snug text-[#666]">
                Total satuan sarana perdagangan se-kabupaten, per jenis, tahun terbaru tersedia.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Skeleton({ text }: { text: string }) {
  return (
    <div className="max-w-[1200px] mx-auto px-5 py-20">
      <div className="border-hd-2 bg-white p-8 shadow-hd-lg animate-pulse">
        <MonoLabel>{text}</MonoLabel>
      </div>
    </div>
  );
}

function ErrorState({ msg }: { msg: string | null }) {
  return (
    <div className="max-w-[1200px] mx-auto px-5 py-20">
      <div className="border-2 border-red-600 bg-red-50 p-8 shadow-hd-lg">
        <Badge tone="prio">Error</Badge>
        <p className="font-mono text-sm mt-3 text-red-700">{msg ?? "Gagal memuat data"}</p>
      </div>
    </div>
  );
}
