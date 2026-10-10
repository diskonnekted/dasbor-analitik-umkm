import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "@/components/Header";
import Dasbor from "@/pages/Dasbor";
import Klaster from "@/pages/Klaster";
import Industri from "@/pages/Industri";
import Pasar from "@/pages/Pasar";
import Spasial from "@/pages/Spasial";
import Makro from "@/pages/Makro";
import Korelasi from "@/pages/Korelasi";
import Rekomendasi from "@/pages/Rekomendasi";
import Terpadu from "@/pages/Terpadu";
import Inflasi from "@/pages/Inflasi";

function DisclaimerModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
    >
      <div
        className="absolute inset-0 bg-[#141414]/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-lg bg-white border-2 border-[#141414] shadow-[8px_8px_0_#141414]">
        <div className="bg-[#141414] px-5 py-3">
          <h2
            id="disclaimer-title"
            className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-white"
          >
            Keterangan Aplikasi
          </h2>
        </div>
        <div className="px-5 py-4 space-y-3 text-sm leading-relaxed text-[#141414]">
          <p>
            Aplikasi ini merupakan <strong>prototipe aplikasi analitik</strong> untuk
            perkembangan UMKM di wilayah Kabupaten Banjarnegara. Saat ini progres
            pembangunan aplikasi telah mencapai <strong>70%</strong>.
          </p>
          <p>
            Seluruh data yang digunakan berasal dari{" "}
            <strong>data terbuka Kabupaten Banjarnegara</strong> yang disediakan melalui
            portal Open Data Kabupaten Banjarnegara serta data yang dipublikasikan pada
            situs BPS Kabupaten Banjarnegara.
          </p>
          <p>
            Aplikasi ini <strong>hanya mengolah data yang tersedia</strong> dan tidak
            melakukan perubahan apa pun terhadap data yang ditampilkan. Seluruh pengolahan
            bersifat indikatif berdasarkan data yang ada.
          </p>
          <p className="border-2 border-[#ff7d2d] bg-[#fff4ec] px-3 py-2 font-mono text-xs">
            <strong>Disarankan</strong> untuk melakukan verifikasi ulang terhadap hasil
            analisis yang ditampilkan sebelum digunakan sebagai dasar pengambilan keputusan.
          </p>
        </div>
        <div className="border-t-2 border-[#141414] px-5 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="font-mono text-xs font-bold uppercase tracking-[0.16em] bg-[#ff7d2d] text-white border-2 border-[#141414] px-5 py-2 hover:bg-[#141414] transition-colors cursor-pointer"
          >
            Saya Pahami
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [showDisclaimer, setShowDisclaimer] = useState(
    () => !sessionStorage.getItem("umkm_disclaimer_seen")
  );
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowDisclaimer(false);
        sessionStorage.setItem("umkm_disclaimer_seen", "1");
      }
    };
    if (showDisclaimer) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showDisclaimer]);
  const close = () => {
    setShowDisclaimer(false);
    sessionStorage.setItem("umkm_disclaimer_seen", "1");
  };
  return (
    <Router>
      <div className="min-h-full flex flex-col">
        {showDisclaimer && <DisclaimerModal onClose={close} />}
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Dasbor />} />
            <Route path="/klaster" element={<Klaster />} />
            <Route path="/industri" element={<Industri />} />
            <Route path="/pasar" element={<Pasar />} />
            <Route path="/spasial" element={<Spasial />} />
            <Route path="/makro" element={<Makro />} />
            <Route path="/korelasi" element={<Korelasi />} />
            <Route path="/rekomendasi" element={<Rekomendasi />} />
            <Route path="/terpadu" element={<Terpadu />} />
            <Route path="/inflasi" element={<Inflasi />} />
            <Route path="*" element={<Dasbor />} />
          </Routes>
        </main>
        <footer className="border-t-2 border-[#141414] bg-[#141414] text-[#949494]">
          <div className="max-w-[1200px] mx-auto px-5 py-5 flex flex-wrap gap-2 items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em]">
            <span>Analitik UMKM · Ekonomi Lokal Banjarnegara © 2026</span>
            <span>Data berasal dari Open Data Kabupaten Banjarnegara</span>
            <a
              href="https://clasnet.co.id"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] border border-[#ff7d2d] px-3 py-1 text-[#ff7d2d] hover:text-white hover:border-white transition-colors"
            >
              Built by Clasnet Group
            </a>
          </div>
        </footer>
      </div>
    </Router>
  );
}
