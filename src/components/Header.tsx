// src/components/Header.tsx
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dasbor", end: true },
  { to: "/klaster", label: "Klaster" },
  { to: "/industri", label: "Industri" },
  { to: "/pasar", label: "Pasar" },
  { to: "/spasial", label: "Spasial" },
  { to: "/makro", label: "Makro" },
  { to: "/korelasi", label: "Korelasi" },
  { to: "/rekomendasi", label: "Rekomendasi" },
  { to: "/inflasi", label: "Inflasi" },
  { to: "/terpadu", label: "Terpadu" },
];

function Clock() {
  const [t, setT] = useState("--:--:--");
  useEffect(() => {
    const p = (n: number) => String(n).padStart(2, "0");
    const tick = () => {
      const d = new Date();
      setT(`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] border-hd px-3 py-1.5 bg-[#f1f1ef]">
      {t}
    </span>
  );
}

export default function Header() {
  return (
    <header className="bg-white border-b-2 border-[#141414] sticky top-0 z-40">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#141414] text-white grid place-items-center font-mono font-extrabold text-base shadow-[3px_3px_0_0_rgba(20,20,20,0.25)]">
            UM
          </div>
          <div>
            <h1 className="font-mono font-extrabold text-[15px] uppercase tracking-[0.12em] leading-tight m-0">
              Analitik UMKM
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#747474] mt-0.5 m-0">
              Ekonomi Lokal Banjarnegara
            </p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-0 border-hd">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  "font-mono font-bold text-[11px] uppercase tracking-[0.12em] px-3 py-2 border-r border-[#141414] last:border-r-0 transition",
                  isActive ? "bg-[#141414] text-white" : "bg-white text-[#141414] hover:bg-slate-100"
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <Clock />
      </div>
    </header>
  );
}
