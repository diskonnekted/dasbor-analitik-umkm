import { useMemo } from "react";
import {
  getIpmTren, getGiniTren, getPertumbuhanTren,
  getGarisKemiskinanTren, getPopMiskin,
  getPdrbTahunList, getPdrbTahun, getKlasterDataset,
  getRumahMakanTahunList, getDanaDesaTahunList,
  query,
} from "@/lib/db";
import { useDB } from "@/hooks/useDB";
import { Panel, SectionHead, fmtNum } from "@/components/ui";

const OR = "#ff7d2d";
const GREEN = "#1e7a46";
const RED = "#c0392b";

const last = (a: { tahun: number; nilai: number }[]) => a[a.length - 1];
const cagr = (a: { tahun: number; nilai: number }[]) => {
  if (a.length < 2) return 0;
  const f = a[0], l = a[a.length - 1];
  if (f.nilai <= 0 || l.nilai <= 0) return 0;
  return ((l.nilai / f.nilai) ** (1 / (l.tahun - f.tahun)) - 1) * 100;
};

const toneBg = { good: "bg-[#f0fff4]", warn: "bg-[#fffaf5]", bad: "bg-[#fff5f5]" } as const;
const toneBorder = { good: "border-[#1e7a46]", warn: "border-[#ff7d2d]", bad: "border-[#c0392b]" } as const;
const toneText = { good: "text-[#1e7a46]", warn: "text-[#ff7d2d]", bad: "text-[#c0392b]" } as const;
const toneLabel = { good: "POSITIF", warn: "PERHATIAN", bad: "KRITIS" } as const;

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

interface Finding {
  id: string;
  kategori: string;
  headline: string;
  body: string;
  dataLabel: string;
  dataValue: string;
  tone: "good" | "warn" | "bad";
}

interface Rec {
  no: number;
  judul: string;
  masalah: string;
  langkah: string[];
  target: string;
  kpi: string[];
  findingIds: string[];
}

export default function Rekomendasi() {
  const { status, error } = useDB();

  const data = useMemo(() => {
    if (status !== "ready") return null;
    const ipm = getIpmTren();
    const gini = getGiniTren();
    const laju = getPertumbuhanTren();
    const gk = getGarisKemiskinanTren();
    const popMiskin = getPopMiskin();
    const klaster = getKlasterDataset();
    const pdrbTahunList = getPdrbTahunList("berlaku");
    const tahunAktif = pdrbTahunList[pdrbTahunList.length - 1] ?? 2024;
    const pdrbData = getPdrbTahun(tahunAktif, "berlaku");
    const totalPdrb = pdrbData.reduce((s, r) => s + r.nilai, 0);

    // Home industri
    const hiTahunList = query<{ tahun: number }>(
      "SELECT DISTINCT tahun FROM home_industri ORDER BY tahun"
    ).map((r) => r.tahun);
    const hiTahunAktif = hiTahunList[hiTahunList.length - 1] ?? 2024;
    const hiTotal = query<{ total: number }>(
      "SELECT COALESCE(SUM(jumlah),0) AS total FROM home_industri WHERE tahun = ?", [hiTahunAktif]
    )[0]?.total ?? 0;
    const hiPangan = query<{ total: number }>(
      "SELECT COALESCE(SUM(pangan),0) AS total FROM home_industri WHERE tahun = ?", [hiTahunAktif]
    )[0]?.total ?? 0;
    const hiJasa = query<{ total: number }>(
      "SELECT COALESCE(SUM(jasa),0) AS total FROM home_industri WHERE tahun = ?", [hiTahunAktif]
    )[0]?.total ?? 0;

    // Rumah makan
    const rmTahunList = getRumahMakanTahunList();
    const rmTahunAktif = rmTahunList[rmTahunList.length - 1] ?? 2024;
    const rmTahunAwal = rmTahunList[0] ?? 2015;
    const rmAktif = query<{ total: number }>(
      "SELECT COALESCE(SUM(jumlah),0) AS total FROM rumah_makan WHERE tahun = ?", [rmTahunAktif]
    )[0]?.total ?? 0;
    const rmAwal = query<{ total: number }>(
      "SELECT COALESCE(SUM(jumlah),0) AS total FROM rumah_makan WHERE tahun = ?", [rmTahunAwal]
    )[0]?.total ?? 0;
    const rmCagr = rmTahunAktif > rmTahunAwal && rmAwal > 0 && rmAktif > 0
      ? ((rmAktif / rmAwal) ** (1 / (rmTahunAktif - rmTahunAwal)) - 1) * 100
      : 0;

    // Dana desa
    const ddTahunList = getDanaDesaTahunList();
    const ddTahunAktif = ddTahunList[ddTahunList.length - 1] ?? 2024;
    const ddAktif = query<{ total: number }>(
      "SELECT COALESCE(SUM(jumlah),0) AS total FROM dana_desa WHERE tahun = ?", [ddTahunAktif]
    )[0]?.total ?? 0;
    const ddAwal = query<{ total: number }>(
      "SELECT COALESCE(SUM(jumlah),0) AS total FROM dana_desa WHERE tahun = ?", [ddTahunList[0] ?? 2017]
    )[0]?.total ?? 0;

    // Koperasi
    const kopTotal = klaster.reduce((s, r) => s + (r.koperasi ?? 0), 0);
    const kop22 = query<{ total: number }>(
      "SELECT COALESCE(SUM(jumlah),0) AS total FROM koperasi_aktif WHERE tahun = 2022"
    )[0]?.total ?? 0;

    return {
      ipm, gini, laju, gk, popMiskin, klaster, pdrbTahunList, tahunAktif, pdrbData, totalPdrb,
      hiTahunAktif, hiTotal, hiPangan, hiJasa,
      rmTahunAwal, rmTahunAktif, rmAktif, rmCagr, rmAwal,
      ddTahunList, ddTahunAktif, ddAktif, ddAwal,
      kopTotal, kop22,
    };
  }, [status]);

  if (status === "loading" || !data) return <Skeleton />;
  if (status === "error") return <ErrorState msg={error} />;

  const {
    ipm, gini, laju, gk, popMiskin, klaster, tahunAktif, pdrbData, totalPdrb,
    hiTahunAktif, hiTotal, hiPangan, hiJasa,
    rmTahunAwal, rmTahunAktif, rmAktif, rmCagr, rmAwal,
    ddTahunAktif, ddAktif, ddAwal, ddTahunList,
    kopTotal, kop22,
  } = data;

  // Macro calcs
  const lajuLast = last(laju);
  const lajuFirst = laju[0];
  const ipmLast = last(ipm);
  const ipmFirst = ipm[0];
  const ipmCagr = cagr(ipm);
  const giniLast = last(gini);
  const giniFirst = gini[0];
  const giniDelta = giniLast && giniFirst ? giniLast.nilai - giniFirst.nilai : 0;
  const pmLast = popMiskin[popMiskin.length - 1];
  const pmFirst = popMiskin[0];
  const pmDelta = pmLast && pmFirst ? pmLast.proporsi - pmFirst.proporsi : 0;
  const gkLast = last(gk);
  const gkFirst = gk[0];
  const gkCagr = cagr(gk);

  const pertanianRows = pdrbData.filter((r) =>
    /pertanian|perkebunan|peternakan|perikanan|kehutanan/i.test(r.sektor)
  );
  const pertanianShare = totalPdrb > 0
    ? (pertanianRows.reduce((s, r) => s + r.nilai, 0) / totalPdrb) * 100
    : 0;

  const topSektors = pdrbData
    .filter((r) => r.nilai > 0)
    .sort((a, b) => b.nilai - a.nilai)
    .slice(0, 5)
    .map((r) => ({
      nama: r.sektor.length > 30 ? r.sektor.slice(0, 30) + "…" : r.sektor,
      pct: totalPdrb > 0 ? (r.nilai / totalPdrb) * 100 : 0,
    }));

  const hiJasaPct = hiTotal > 0 ? (hiJasa / hiTotal) * 100 : 0;
  const hiPanganPct = hiTotal > 0 ? (hiPangan / hiTotal) * 100 : 0;
  const kopDelta = kopTotal - kop22;
  const ddCagr = ddTahunList.length >= 2 && ddAwal > 0 && ddAktif > 0
    ? ((ddAktif / ddAwal) ** (1 / (ddTahunAktif - ddTahunList[0])) - 1) * 100
    : 0;

  // ── Findings ──────────────────────────────────────────────
  const findings: Finding[] = [
    {
      id: "pertumbuhan",
      kategori: "Pertumbuhan",
      headline: "Pertumbuhan ekonomi moderat",
      body: lajuLast
        ? `Laju pertumbuhan PDRB ${lajuLast.tahun} tercatat ${(lajuLast.nilai >= 0 ? "+" : "") + lajuLast.nilai.toFixed(2)}%. Pertumbuhan belum konsisten di atas target 6%.`
        : "Data laju pertumbuhan belum tersedia.",
      dataLabel: "Laju pertumbuhan terakhir",
      dataValue: lajuLast ? `${(lajuLast.nilai >= 0 ? "+" : "") + lajuLast.nilai.toFixed(2)}% · ${lajuLast.tahun}` : "—",
      tone: lajuLast && lajuLast.nilai >= 5 ? "good" : "warn",
    },
    {
      id: "ipm",
      kategori: "Kualitas SDM",
      headline: "IPM naik tapi belum setara Jawa Tengah",
      body: ipmLast
        ? `IPM ${ipmLast.tahun} mencapai ${ipmLast.nilai.toFixed(2)}, CAGR +${ipmCagr.toFixed(2)}%/th sejak ${ipmFirst?.tahun}. Masih di bawah rata-rata Jawa Tengah, mengindikasikan gap kualitas SDM.`
        : "Data IPM belum tersedia.",
      dataLabel: "IPM terakhir",
      dataValue: ipmLast ? `${ipmLast.nilai.toFixed(2)} · CAGR +${ipmCagr.toFixed(2)}%` : "—",
      tone: "warn",
    },
    {
      id: "gini",
      kategori: "Kesenjangan",
      headline: "Kesenjangan pendapatan masih tinggi",
      body: giniLast
        ? `Indeks Gini ${giniLast.tahun} di ${giniLast.nilai.toFixed(3)} (${giniDelta >= 0 ? "naik" : "turun"} ${Math.abs(giniDelta).toFixed(3)} sejak ${giniFirst?.tahun}). Distribusi pendapatan belum merata.`
        : "Data Gini belum tersedia.",
      dataLabel: "Indeks Gini terakhir",
      dataValue: giniLast ? giniLast.nilai.toFixed(3) : "—",
      tone: giniLast && giniLast.nilai > 0.33 ? "bad" : "warn",
    },
    {
      id: "kemiskinan",
      kategori: "Kemiskinan",
      headline: "Kemiskinan menurun tapi lambat",
      body: pmLast
        ? `Proporsi miskin ${pmLast.tahun}: ${pmLast.proporsi.toFixed(2)}% (${pmLast.jumlah.toLocaleString("id-ID")} jiwa). Perubahan sejak ${pmFirst?.tahun}: ${(pmDelta >= 0 ? "+" : "") + pmDelta.toFixed(2)} p.p. Garis miskin naik +${gkCagr.toFixed(2)}%/th, menekan daya beli.`
        : "Data kemiskinan belum tersedia.",
      dataLabel: "Proporsi miskin terakhir",
      dataValue: pmLast ? `${pmLast.proporsi.toFixed(2)}% · ${gkLast ? fmtNum(Math.round(gkLast.nilai)) + " Rp/hr" : ""}` : "—",
      tone: "warn",
    },
    {
      id: "sektor",
      kategori: "Struktur Ekonomi",
      headline: "Ekonomi masih ditopang sektor primer",
      body: pertanianShare > 0
        ? `Sektor pertanian & turunannya menyumbang ${pertanianShare.toFixed(1)}% PDRB ${tahunAktif} — struktur ekonomi masih primer. Diversifikasi ke industri pengolahan dan jasa masih lemah.`
        : "Data PDRB per sektor belum tersedia.",
      dataLabel: "Kontribusi sektor primer",
      dataValue: pertanianShare > 0 ? `${pertanianShare.toFixed(1)}% PDRB` : "—",
      tone: "warn",
    },
    {
      id: "rumah_industri",
      kategori: "Industri Rumah",
      headline: "Jasa mendominasi industri rumah",
      body: hiTotal > 0
        ? `Total ${fmtNum(hiTotal)} unit industri rumah ${hiTahunAktif}. Sektor jasa mendominasi ${hiJasaPct.toFixed(1)}% (${fmtNum(hiJasa)} unit), pangan ${hiPanganPct.toFixed(1)}%. Konveksi nihil — hilirisasi garmen belum berkembang.`
        : "Data industri rumah belum tersedia.",
      dataLabel: "Total industri rumah",
      dataValue: hiTotal > 0 ? `${fmtNum(hiTotal)} unit · ${hiTahunAktif}` : "—",
      tone: "warn",
    },
    {
      id: "rumah_makan",
      kategori: "Sektor Kuliner",
      headline: "Rumah makan tumbuh konsisten",
      body: rmAktif > 0
        ? `${fmtNum(rmAktif)} rumah makan/restaurant ${rmTahunAktif}, CAGR +${rmCagr.toFixed(1)}% sejak ${rmTahunAwal} (${fmtNum(rmAwal)} unit). Sektor kuliner menunjukkan daya tarik wisata dan potensi ekonomi lokal.`
        : "Data rumah makan belum tersedia.",
      dataLabel: "Rumah makan aktif",
      dataValue: rmAktif > 0 ? `${fmtNum(rmAktif)} unit · CAGR +${rmCagr.toFixed(1)}%` : "—",
      tone: "good",
    },
    {
      id: "dana_desa",
      kategori: "Fiskal Desa",
      headline: "Alokasi dana desa meningkat",
      body: ddAktif > 0
        ? `Dana desa ${ddTahunAktif}: ${fmtNum(ddAktif)} juta. Tren sejak ${ddTahunList[0]}: CAGR +${ddCagr.toFixed(1)}%. Dana desa menjadi instrumen penting penguatan ekonomi desa.`
        : "Data dana desa belum tersedia.",
      dataLabel: "Dana desa terakhir",
      dataValue: ddAktif > 0 ? `Rp ${fmtNum(ddAktif)} jt · ${ddTahunAktif}` : "—",
      tone: "good",
    },
    {
      id: "koperasi",
      kategori: "Ekosistem UMKM",
      headline: "Koperasi tumbuh tapi belum merata",
      body: kopTotal > 0
        ? `${fmtNum(kopTotal)} koperasi tersebar di ${klaster.length} kecamatan (${kopDelta >= 0 ? "+" : ""}${fmtNum(kopDelta)} sejak 2022). Distribusi belum merata — kecamatan dengan UMKM tinggi belum sepenuhnya terfasilitasi.`
        : "Data klaster koperasi belum tersedia.",
      dataLabel: "Total koperasi",
      dataValue: kopTotal > 0 ? `${fmtNum(kopTotal)} koperasi` : "—",
      tone: "warn",
    },
  ];

  // ── Recommendations ───────────────────────────────────────
  const recs: Rec[] = [
    {
      no: 1,
      judul: "Percepat Pertumbuhan Ekonomi Lewat Industrialisasi UMKM",
      masalah:
        `Pertumbuhan PDRB ${lajuLast ? lajuLast.nilai.toFixed(2) + "%" : "moderat"} dengan struktur ekonomi primer ${pertanianShare.toFixed(1)}%. Nilai tambah lokal belum terekapitalisasi menjadi industri pengolahan menengah. Sektor konveksi nihil — potensi tekstil lokal belum tergarap.`,
      langkah: [
        "Bangun 2–3 sentra pengolahan produk unggulan (keripik, tempe, kopi, teh) di kecamatan dengan klaster UMKM terpadat.",
        "Program kemitraan hilirisasi: petani/peternak → UMKM pengolah → koperasi sebagai offtaker.",
        "Fasilitasi izin PIRT, sertifikasi halal, dan label produk untuk meningkatkan harga jual.",
        "Insentif fiskal daerah: pembebasan retribusi 2 tahun untuk UMKM naik kelas dari mikro ke kecil.",
      ],
      target: "Laju pertumbuhan ≥ 6% dan sektor pengolahan naik 3 p.p. dari PDRB dalam 3 tahun.",
      kpi: ["Laju pertumbuhan PDRB", "PDRB sektor pengolahan", "Jumlah UMKM naik kelas"],
      findingIds: ["pertumbuhan", "sektor"],
    },
    {
      no: 2,
      judul: "Kembangkan Sektor Kuliner sebagai Penggerak Wisata",
      masalah:
        `${fmtNum(rmAktif)} rumah makan ${rmTahunAktif} tumbuh CAGR +${rmCagr.toFixed(1)}% sejak ${rmTahunAwal} — sektor kuliner menunjukkan daya tarik wisata. Namun belum ada branding kuliner terpadu dan standar mutu.`,
      langkah: [
        "Program branding kuliner Banjarnegara: sertifikasi produk unggulan (keripik, nasi kuning, olahan sayur).",
        "Bangun pusat kuliner terpadu di 3 titik strategis (Banjarnegara, Purwokerto, Wonosobo).",
        "Pelatihan standar higiene & sanitasi (HACCP) bagi UMKM kuliner di 15 kecamatan.",
        "Integrasi rumah makan ke platform pemesanan online (GoFood, GrabFood, Shopee Food).",
      ],
      target: "Jumlah rumah makan +20% dalam 2 tahun; 50% UMKM kuliner tersertifikasi dan online.",
      kpi: ["Jumlah rumah makan", "UMKM kuliner online", "Omzet rata-rata"],
      findingIds: ["rumah_makan", "pertumbuhan"],
    },
    {
      no: 3,
      judul: "Optimalkan Dana Desa untuk Penguatan Ekonomi Desa",
      masalah:
        `Dana desa ${ddTahunAktif} mencapai Rp ${fmtNum(ddAktif)} juta (CAGR +${ddCagr.toFixed(1)}%). Sebagian besar masih tersalurkan ke bidang infrastruktur — potensi ekonomi produktif desa belum teroptimalkan.`,
      langkah: [
        "Arahkan minimal 30% dana desa untuk ekonomi produktif (UMKM, BUMDes, pertanian).",
        "Program BUMDes unggulan: 5 desa model per kecamatan dengan model bisnis terukur.",
        "Kemitraan dana desa–koperasi: alokasi untuk modal kerja koperasi di 10 desa per tahun.",
        "Monitoring & evaluasi berkala oleh Bapperida dan Dinas PMD untuk akuntabilitas.",
      ],
      target: "30% dana desa untuk ekonomi produktif; 100 BUMDes aktif dalam 3 tahun.",
      kpi: ["% dana desa produktif", "BUMDes aktif", "PDRB desa"],
      findingIds: ["dana_desa", "kemiskinan"],
    },
    {
      no: 4,
      judul: "Turunkan Kesenjangan Pendapatan Melalui Pemerataan Investasi",
      masalah:
        `Indeks Gini ${giniLast ? giniLast.nilai.toFixed(3) : "masih tinggi"} menunjukkan distribusi pendapatan timpang antar kecamatan. Investasi dan akses modal belum merata ke 20 kecamatan.`,
      langkah: [
        "Arahkan program padat karya dan BLU daerah ke 10 kecamatan dengan Gini/kemiskinan tertinggi.",
        "Buka akses permodalan: kerja sama bank desa dan BPR untuk kredit mikro < 10% p.a.",
        "Distribusikan sentra usaha dan pasar UMKM ke kecamatan pinggiran.",
        "Program pelatihan vokasi berbasis industri lokal untuk lulusan SMK dan pemuda putus sekolah.",
      ],
      target: "Indeks Gini turun ≥ 0.005 per tahun selama 3 tahun.",
      kpi: ["Indeks Gini", "Peminjam mikro aktif", "Penyerapan kerja pemuda"],
      findingIds: ["gini", "kemiskinan"],
    },
    {
      no: 5,
      judul: "Perkuat SDM & Daya Saing UMKM Melalui Pendidikan dan Digitalisasi",
      masalah:
        `IPM ${ipmLast ? ipmLast.nilai.toFixed(2) : "masih rendah"} di bawah rata-rata Jawa Tengah. Mayoritas UMKM masih beroperasi secara manual, belum memanfaatkan digital marketing dan sistem akuntansi sederhana.`,
      langkah: [
        "Program literasi digital UMKM: pelatihan e-commerce (Shopee, Tokopedia, WhatsApp Business) di 15 kecamatan/tahun.",
        "Integrasi kurikulum kewirausahaan di SMA/SMK lokal — minimal 2 jam/minggu.",
        "Bangun platform digital satu pintu: pendaftaran UMKM, akses permodalan, sertifikasi, dan pasar daring.",
        "Beasiswa/magang untuk UMKM yang ingin naik kelas ke industri 4.0 (otomasi, IoT produksi).",
      ],
      target: "IPM naik ≥ 0.5 poin/th; 60% UMKM aktif di platform digital dalam 3 tahun.",
      kpi: ["IPM", "% UMKM digital", "UMKM ber-ekspansi online"],
      findingIds: ["ipm", "koperasi"],
    },
    {
      no: 6,
      judul: "Kurangi Kemiskinan Lewat Penguatan Jaring Pengaman dan Produktivitas",
      masalah:
        `Proporsi miskin ${pmLast ? pmLast.proporsi.toFixed(2) + "%" : "masih tinggi"} dengan indeks kedalaman yang tinggi. Garis kemiskinan naik lebih cepat daripada pendapatan riil, menekan daya beli kelompok bawah.`,
      langkah: [
        "Prioritaskan bantuan sosial untuk keluarga dengan skor kedalaman kemiskinan tertinggi (data BPS).",
        "Program pemberdayaan: arahkan keluarga miskin ke 1 klaster UMKM produktif (bukan bansos konsumtif).",
        "Fasilitasi akses pangan murah melalui pasar tani dan koperasi konsumen di 10 kecamatan.",
        "Perkuat program KIS agar biaya kesehatan tidak menjadi pendorong kemiskinan baru.",
      ],
      target: "Proporsi miskin turun ≥ 0.5 p.p./tahun; indeks kedalaman turun ≥ 0.1 p.p./tahun.",
      kpi: ["Proporsi miskin", "Indeks kedalaman", "Keluarga keluar miskin"],
      findingIds: ["kemiskinan", "koperasi"],
    },
    {
      no: 7,
      judul: "Optimalkan Peran Koperasi sebagai Pusat Ekonomi Lokal",
      masalah:
        `${fmtNum(kopTotal)} koperasi belum sepenuhnya berfungsi sebagai mesin ekonomi: banyak yang pasif, minim pelatihan, dan tidak terhubung dengan rantai pasok UMKM sekitar.`,
      langkah: [
        "Audit & reaktivasi koperasi: pemetaan status aktif/pasif, pendampingan hukum, dan restrukturisasi.",
        "Program penguatan kapasitas: pelatihan manajemen, akuntansi, dan pemasaran untuk pengurus koperasi.",
        "Kemitraan koperasi–UMKM: koperasi sebagai himpun dana, offtaker, dan distributor produk anggota.",
        "Dana bergulir daerah: alokasi APBD untuk modal kerja koperasi yang menjalankan program produktif.",
      ],
      target: "≥ 70% koperasi aktif dalam 3 tahun; ≥ 50% UMKM menjadi anggota koperasi.",
      kpi: ["Koperasi aktif", "% UMKM anggota", "Volume transaksi"],
      findingIds: ["koperasi", "pertumbuhan"],
    },
    {
      no: 8,
      judul: "Bangun Data & Monitoring UMKM yang Terintegrasi",
      masalah:
        "Data UMKM tersebar di berbagai dinas (Dinas Koperasi, DPMPTSP, BPS, Bapperida) dengan format berbeda. Tidak ada dashboard terpadu untuk perencanaan berbasis bukti.",
      langkah: [
        "Bangun Sistem Informasi UMKM Terpadu (SISUMKAM): satu database untuk seluruh UMKM, koperasi, dan industri.",
        "Integrasi data BPS (makro), DPMPTSP (izin usaha), Dinas Koperasi (data keanggotaan), Bapperida (data terpadu).",
        "Dashboard publik seperti aplikasi ini: transparansi data untuk pemerintah, pelaku usaha, dan masyarakat.",
        "Update data minimal tahunan; setiap UMKM memiliki QR code digital (NIB, izin, produk).",
      ],
      target: "100% UMKM terdata dalam SISUMKAM dalam 2 tahun; dashboard publik update real-time.",
      kpi: ["UMKM terdata", "Frekuensi update", "Pengguna dashboard"],
      findingIds: ["pertumbuhan", "ipm"],
    },
  ];

  return (
    <div className="max-w-[1200px] mx-auto px-5 flex flex-col gap-5">
      {/* Header */}
      <div>
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-[#888]">
          Kabupaten Banjarnegara · Data Bapperida & BPS
        </p>
        <h1 className="font-serif italic text-3xl md:text-4xl font-semibold text-[#141414]">
          Rekomendasi Kebijakan
        </h1>
        <p className="mt-2 text-xs text-[#666] max-w-2xl leading-relaxed">
          {recs.length} rekomendasi berbasis data untuk meningkatkan UMKM dan ekonomi lokal Banjarnegara.
          Data makro: BPS Kab. Banjarnegara. Data UMKM, koperasi, industri, rumah makan, dana desa:
          Open Data Kab. Banjarnegara (Dinas Kominfo).
        </p>
      </div>

      {/* Findings */}
      <Panel>
        <div className="mb-4">
          <SectionHead tag={`Temuan Data · ${tahunAktif} · ${klaster.length} kecamatan`} />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {findings.map((f) => (
            <div key={f.id} className={`border-hd-2 p-4 ${toneBg[f.tone]} ${toneBorder[f.tone]}`}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className={`text-[9px] font-mono font-bold uppercase tracking-[0.16em] px-2 py-0.5 text-white ${
                  f.tone === "good" ? "bg-[#1e7a46]" : f.tone === "bad" ? "bg-[#c0392b]" : "bg-[#ff7d2d]"
                }`}>
                  {f.kategori}
                </span>
                <span className={`text-[9px] font-mono font-bold uppercase tracking-widest ${toneText[f.tone]}`}>
                  {toneLabel[f.tone]}
                </span>
              </div>
              <div className="font-mono font-bold text-sm mb-1 text-[#141414]">{f.headline}</div>
              <p className="text-[11px] leading-relaxed mb-2 text-[#555]">{f.body}</p>
              <div className="flex items-baseline justify-between border-t border-hd-subtle pt-2">
                <span className="text-[9px] font-mono uppercase tracking-widest text-[#888]">
                  {f.dataLabel}
                </span>
                <span className={`font-mono font-bold text-sm ${toneText[f.tone]}`}>{f.dataValue}</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Top Sectors */}
      {topSektors.length > 0 && (
        <Panel>
          <div className="mb-4">
            <SectionHead tag={`Top 5 Sektor PDRB · ${tahunAktif} · kontribusi %`} />
          </div>
          <div className="flex flex-wrap gap-3">
            {topSektors.map((s, i) => (
              <div
                key={s.nama}
                className={`flex items-center gap-3 border-hd px-4 py-3 ${i === 0 ? "bg-[#f5f5f3] shadow-hd" : "bg-white"}`}
              >
                <span className={`font-mono font-extrabold text-lg ${i === 0 ? "text-[#ff7d2d]" : "text-[#999]"}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wide text-[#666]">{s.nama}</div>
                  <div className="font-mono font-bold text-sm text-[#141414]">{s.pct.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Recommendations */}
      <div className="grid grid-cols-1 gap-4">
        {recs.map((r) => (
          <Panel key={r.no} className="overflow-hidden">
            <div className="flex items-start gap-4 px-4 py-3 border-b border-hd-subtle bg-[#fafaf8]">
              <div className="w-10 h-10 grid place-items-center font-mono font-extrabold text-base bg-[#141414] text-white shrink-0">
                {String(r.no).padStart(2, "0")}
              </div>
              <div className="min-w-0">
                <h2 className="font-mono font-bold text-sm leading-snug text-[#141414]">{r.judul}</h2>
                <p className="mt-1 text-[11px] leading-relaxed text-[#666]">{r.masalah}</p>
              </div>
            </div>

            <div className="px-4 py-4">
              <div className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] mb-2 text-[#888]">
                Langkah-langkah
              </div>
              <ol className="space-y-2 mb-4">
                {r.langkah.map((lk, i) => (
                  <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-[#444]">
                    <span className="font-mono font-bold text-[10px] shrink-0 mt-0.5 text-[#ff7d2d]">
                      {i + 1}.
                    </span>
                    <span>{lk}</span>
                  </li>
                ))}
              </ol>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border-hd-2 p-3 bg-[#fffaf5] border-[#ff7d2d]">
                  <div className="text-[9px] font-mono font-bold uppercase tracking-widest mb-1 text-[#ff7d2d]">
                    Target
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#444]">{r.target}</p>
                </div>
                <div className="border-hd-2 p-3 bg-[#f5f5f3] border-[#141414]">
                  <div className="text-[9px] font-mono font-bold uppercase tracking-widest mb-1 text-[#141414]">
                    KPI Pemantauan
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {r.kpi.map((k) => (
                      <span key={k} className="text-[10px] font-mono font-bold border border-hd-subtle px-2 py-0.5 text-[#555]">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                <span className="text-[9px] font-mono uppercase tracking-widest text-[#999]">
                  Berbasis temuan:
                </span>
                {r.findingIds.map((fid) => {
                  const f = findings.find((x) => x.id === fid);
                  if (!f) return null;
                  return (
                    <span
                      key={fid}
                      className={`text-[9px] font-mono font-bold uppercase tracking-widest border px-2 py-0.5 ${toneBorder[f.tone]} ${toneText[f.tone]} ${toneBg[f.tone]}`}
                    >
                      {f.kategori}
                    </span>
                  );
                })}
              </div>
            </div>
          </Panel>
        ))}
      </div>

      {/* Footer */}
      <div className="flex flex-wrap gap-4 items-center justify-between border-hd bg-[#141414] px-4 py-3 shadow-hd-lg">
        <div>
          <div className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] mb-1 text-[#999]">
            Sumber Data
          </div>
          <p className="text-[11px] leading-relaxed max-w-xl text-[#ccc]">
            Data makro (IPM, Gini, kemiskinan, PDRB, inflasi): BPS Kab. Banjarnegara 2016–2024.
            Data UMKM, koperasi, industri rumah, rumah makan, dana desa, pasar:
            <a href="https://opendata.banjarnegarakab.go.id/" target="_blank" rel="noopener noreferrer"
              className="underline decoration-[#ff7d2d] underline-offset-2 hover:text-white">
              Open Data Kab. Banjarnegara
            </a> — milik Dinas Komunikasi dan Informatika (Kominfo) Kab. Banjarnegara;
            Bapperida sebagai verifikator data. Rekomendasi bersifat indikatif; perlu divalidasi dengan
            dinas terkait sebelum diadopsi ke RPJMD.
          </p>
        </div>
        <a href="https://clasnet.co.id" target="_blank" rel="noopener noreferrer"
          className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] border border-[#ff7d2d] px-3 py-1 text-[#ff7d2d] hover:text-white hover:border-white transition-colors">
          Built by Clasnet Group
        </a>
      </div>
    </div>
  );
}
