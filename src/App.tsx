import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "@/components/Header";
import Dasbor from "@/pages/Dasbor";
import Klaster from "@/pages/Klaster";
import Industri from "@/pages/Industri";
import Terpadu from "@/pages/Terpadu";

export default function App() {
  return (
    <Router>
      <div className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Dasbor />} />
            <Route path="/klaster" element={<Klaster />} />
            <Route path="/industri" element={<Industri />} />
            <Route path="/terpadu" element={<Terpadu />} />
            <Route path="*" element={<Dasbor />} />
          </Routes>
        </main>
        <footer className="border-t-2 border-[#141414] bg-[#141414] text-[#949494]">
          <div className="max-w-[1200px] mx-auto px-5 py-5 flex flex-wrap gap-2 items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em]">
            <span>Analitik UMKM · Ekonomi Lokal Banjarnegara © 2026</span>
            <span>Neo-Industrial Design System</span>
          </div>
        </footer>
      </div>
    </Router>
  );
}
