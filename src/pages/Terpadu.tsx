// src/pages/Terpadu.tsx
import { useMemo, useState } from "react";
import { useDB } from "@/hooks/useDB";
import { getIndustriList, getIndustriTahunList, query } from "@/lib/db";
import { Badge, fmtNum, MonoLabel, Panel, SectionHead, StatCard } from "@/components/ui";

interface HomeIndRow {
  kecamatan: string;
  pangan: number;
  sandang: number;
  konveksi: number;
  jasa: number;
  lain: number;
  jumlah: number;
  tahun: number;
}

interface MakroRow {
  tahun: number;
  sektor: string;
  nilai: number;
  kontribusi: number;
}

interface KoperasiDetailRow {
  jenis: string;
  jumlah_unit: number;
  tenaga_kerja: number;
  shu: number;
  tahun: number;
}

export default function Terpadu() {
  const { status, error } = useDB();
  const [tahunSelect, setTahunSelect] = useState<number | "all">(2024);
  const [search, setSearch] = useState("");
  const [subTab, setSubTab] = useState<"industri" | "home" | "koperasi" | "pdrb">("industri");

  const data = useMemo(() => {
    if (status !== "ready") return null;

    const tahunList = getIndustriTahunList();
    const industri = getIndustriList(tahunSelect);

    const targetTahun = tahunSelect === "all" ? 2024 : tahunSelect;

    const homeIndustri = query<HomeIndRow>(
      "SELECT kecamatan, pangan, sandang, konveksi, jasa, lain, jumlah, tahun FROM home_industri WHERE tahun=? ORDER BY jumlah DESC",
      [targetTahun]
    );

    const makro = query<MakroRow>(
      "SELECT tahun, sektor, nilai, kontribusi FROM makro WHERE tahun=? ORDER BY nilai DESC",
      [targetTahun]
    );

    const koperasiDetail = query<KoperasiDetailRow>(
      "SELECT jenis, jumlah_unit, tenaga_kerja, shu, tahun FROM koperasi_detail WHERE tahun=? ORDER BY jumlah_unit DESC",
      [targetTahun]
    );

    const totalPerusahaan = industri.reduce((sum, r) => sum + (r.jml || 0), 0);
    const totalTK = industri.reduce((sum, r) => sum + (r.tk || 0), 0);
    const totalInvestasi = industri.reduce((sum, r) => sum + (r.inv || 0), 0);
    const totalProduksi = industri.reduce((sum, r) => sum + (r.prod || 0), 0);

    return {
      tahunList,
      industri,
      homeIndustri,
      makro,
      koperasiDetail,
      totalPerusahaan,
      totalTK,
      totalInvestasi,
      totalProduksi,
      targetTahun,
    };
  }, [status, tahunSelect]);

  if (status === "loading" || status === "idle") {
    return (
      <div className="max-w-[1200px] mx-auto px-5 py-20">
        <div className="border-hd-2 bg-white p-8 shadow-hd-lg animate-pulse">
          <MonoLabel>Memuat Analisis Terpadu...</MonoLabel>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="max-w-[1200px] mx-auto px-5 py-20">
        <div className="border-2 border-red-600 bg-red-50 p-8 shadow-hd-lg">
          <Badge tone="prio">Error</Badge>
          <p className="font-mono text-sm mt-3 text-red-700">{error ?? "Gagal memuat data"}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const filteredIndustri = data.industri.filter((i) =>
    i.jenis_normalized.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-[1200px] mx-auto px-5 pb-16 space-y-8">
      {/* Header Page */}
      <section className="pt-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-block font-mono text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#747474] border-hd px-2.5 py-1 bg-white">
              Modul Pelengkap
            </span>
            <h2 className="font-serif italic font-semibold text-4xl md:text-5xl leading-[1.05] mt-3 tracking-tight">
              Analisis Terpadu UMKM &amp; Ekonomi
            </h2>
            <p className="max-w-[680px] text-[15px] leading-relaxed text-[#333] mt-2">
              Laporan terperinci mengenai industri pengolahan, home industri kecamatan, rincian koperasi, serta kontribusi PDRB Kabupaten Banjarnegara.
            </p>
          </div>

          {/* Selector Tahun */}
          <div className="bg-white border-hd-2 p-3 shadow-hd flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#747474]">Tahun:</span>
            <select
              value={tahunSelect}
              onChange={(e) => setTahunSelect(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="font-mono font-bold text-xs bg-[#f1f1ef] border-hd px-3 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Tahun</option>
              {data.tahunList.map((t) => (
                <option key={t} value={t}>
                  Tahun {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 mt-6 border-hd-2 bg-white">
          <StatCard value={fmtNum(data.totalPerusahaan)} label={`Total Unit Usaha (${data.targetTahun})`} />
          <StatCard value={fmtNum(data.totalTK)} label="Tenaga Kerja Terserap" tone="blue" />
          <StatCard
            value={`Rp ${(data.totalInvestasi / 1000).toFixed(1)} M`}
            label="Total Nilai Investasi"
            tone="amber"
          />
          <StatCard value={fmtNum(data.totalProduksi)} label="Nilai Produksi Sektor" />
        </div>
      </section>

      {/* Sub Tabs */}
      <div className="border-b-2 border-[#141414] flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSubTab("industri")}
          className={`font-mono text-xs font-bold uppercase px-4 py-2 border-hd transition ${
            subTab === "industri" ? "bg-[#141414] text-white" : "bg-white text-[#141414] hover:bg-slate-100"
          }`}
        >
          🏭 Sektor Industri ({filteredIndustri.length})
        </button>
        <button
          onClick={() => setSubTab("home")}
          className={`font-mono text-xs font-bold uppercase px-4 py-2 border-hd transition ${
            subTab === "home" ? "bg-[#141414] text-white" : "bg-white text-[#141414] hover:bg-slate-100"
          }`}
        >
          🏘️ Home Industri Kecamatan ({data.homeIndustri.length})
        </button>
        <button
          onClick={() => setSubTab("koperasi")}
          className={`font-mono text-xs font-bold uppercase px-4 py-2 border-hd transition ${
            subTab === "koperasi" ? "bg-[#141414] text-white" : "bg-white text-[#141414] hover:bg-slate-100"
          }`}
        >
          🤝 Koperasi Detail ({data.koperasiDetail.length})
        </button>
        <button
          onClick={() => setSubTab("pdrb")}
          className={`font-mono text-xs font-bold uppercase px-4 py-2 border-hd transition ${
            subTab === "pdrb" ? "bg-[#141414] text-white" : "bg-white text-[#141414] hover:bg-slate-100"
          }`}
        >
          📊 Kontribusi PDRB ({data.makro.length})
        </button>
      </div>

      {/* Sub Tab 1: Industri */}
      {subTab === "industri" && (
        <section className="space-y-4">
          <SectionHead tag="Profil Sektor Industri Pengolahan">
            <Badge tone="active">{data.targetTahun}</Badge>
          </SectionHead>
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <MonoLabel>Data Industri Hasil Olahan &amp; Kerajinan</MonoLabel>
              <input
                type="text"
                placeholder="Cari jenis industri..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-hd font-mono text-xs px-3 py-1.5 w-64 bg-[#f1f1ef] focus:outline-none focus:bg-white"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs border-collapse">
                <thead>
                  <tr className="bg-[#141414] text-white font-mono text-[10px] uppercase">
                    <th className="p-2.5 border-hd">No</th>
                    <th className="p-2.5 border-hd">Jenis Industri</th>
                    <th className="p-2.5 border-hd text-right">Perusahaan</th>
                    <th className="p-2.5 border-hd text-right">Tenaga Kerja</th>
                    <th className="p-2.5 border-hd text-right">Investasi (Juta Rp)</th>
                    <th className="p-2.5 border-hd text-right">Produksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIndustri.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-100 border-b border-slate-200">
                      <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-2.5 font-bold uppercase">{row.jenis_normalized}</td>
                      <td className="p-2.5 font-mono text-right font-bold text-blue-600">
                        {fmtNum(row.jml)}
                      </td>
                      <td className="p-2.5 font-mono text-right">{fmtNum(row.tk)}</td>
                      <td className="p-2.5 font-mono text-right">{fmtNum(row.inv)}</td>
                      <td className="p-2.5 font-mono text-right">{fmtNum(row.prod)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </section>
      )}

      {/* Sub Tab 2: Home Industri */}
      {subTab === "home" && (
        <section className="space-y-4">
          <SectionHead tag="Home Industri Per Kecamatan">
            <Badge tone="plan">Data Dispermades ({data.targetTahun})</Badge>
          </SectionHead>
          <Panel>
            <MonoLabel>Jumlah percontohan usaha mikro berbasis kecamatan</MonoLabel>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left font-sans text-xs border-collapse">
                <thead>
                  <tr className="bg-[#141414] text-white font-mono text-[10px] uppercase">
                    <th className="p-2.5 border-hd">Kecamatan</th>
                    <th className="p-2.5 border-hd text-right">Pangan</th>
                    <th className="p-2.5 border-hd text-right">Sandang</th>
                    <th className="p-2.5 border-hd text-right">Konveksi</th>
                    <th className="p-2.5 border-hd text-right">Jasa</th>
                    <th className="p-2.5 border-hd text-right">Lainnya</th>
                    <th className="p-2.5 border-hd text-right">Total Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {data.homeIndustri.map((h, i) => (
                    <tr key={i} className="hover:bg-slate-100 border-b border-slate-200">
                      <td className="p-2.5 font-bold uppercase">{h.kecamatan}</td>
                      <td className="p-2.5 font-mono text-right">{fmtNum(h.pangan)}</td>
                      <td className="p-2.5 font-mono text-right">{fmtNum(h.sandang)}</td>
                      <td className="p-2.5 font-mono text-right">{fmtNum(h.konveksi)}</td>
                      <td className="p-2.5 font-mono text-right">{fmtNum(h.jasa)}</td>
                      <td className="p-2.5 font-mono text-right">{fmtNum(h.lain)}</td>
                      <td className="p-2.5 font-mono text-right font-bold text-blue-600">{fmtNum(h.jumlah)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </section>
      )}

      {/* Sub Tab 3: Koperasi Detail */}
      {subTab === "koperasi" && (
        <section className="space-y-4">
          <SectionHead tag="Rincian Jenis Koperasi &amp; SHU">
            <Badge tone="active">{data.targetTahun}</Badge>
          </SectionHead>
          <Panel>
            <MonoLabel>Kinerja KUD, KPRI, &amp; Koperasi Simpan Pinjam</MonoLabel>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left font-sans text-xs border-collapse">
                <thead>
                  <tr className="bg-[#141414] text-white font-mono text-[10px] uppercase">
                    <th className="p-2.5 border-hd">Jenis Koperasi</th>
                    <th className="p-2.5 border-hd text-right">Jumlah Unit</th>
                    <th className="p-2.5 border-hd text-right">Tenaga Kerja</th>
                    <th className="p-2.5 border-hd text-right">Sisa Hasil Usaha (SHU)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.koperasiDetail.map((k, i) => (
                    <tr key={i} className="hover:bg-slate-100 border-b border-slate-200">
                      <td className="p-2.5 font-bold">{k.jenis}</td>
                      <td className="p-2.5 font-mono text-right font-bold text-amber-600">{fmtNum(k.jumlah_unit)}</td>
                      <td className="p-2.5 font-mono text-right">{fmtNum(k.tenaga_kerja)}</td>
                      <td className="p-2.5 font-mono text-right font-bold">Rp {fmtNum(k.shu)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </section>
      )}

      {/* Sub Tab 4: PDRB */}
      {subTab === "pdrb" && (
        <section className="space-y-4">
          <SectionHead tag="Sektor PDRB &amp; Makro Ekonomi">
            <Badge tone="active">BPS ({data.targetTahun})</Badge>
          </SectionHead>
          <Panel>
            <MonoLabel>Kontribusi Sektor Ekonomi terhadap PDRB Banjarnegara</MonoLabel>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left font-sans text-xs border-collapse">
                <thead>
                  <tr className="bg-[#141414] text-white font-mono text-[10px] uppercase">
                    <th className="p-2.5 border-hd">Sektor Ekonomi</th>
                    <th className="p-2.5 border-hd text-right">Nilai PDRB (Rp)</th>
                    <th className="p-2.5 border-hd text-right">Kontribusi (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.makro.map((m, i) => (
                    <tr key={i} className="hover:bg-slate-100 border-b border-slate-200">
                      <td className="p-2.5 font-bold">{m.sektor}</td>
                      <td className="p-2.5 font-mono text-right">{fmtNum(m.nilai)}</td>
                      <td className="p-2.5 font-mono text-right font-bold text-blue-600">
                        {m.kontribusi != null ? `${m.kontribusi.toFixed(2)}%` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </section>
      )}
    </div>
  );
}
