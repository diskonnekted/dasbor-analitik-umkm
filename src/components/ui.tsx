// src/components/ui.tsx
// Primitif UI gaya neo-brutalist (sesuai style_guide.md).

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-white p-5 border-hd shadow-hd space-y-3",
        hover && "transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hd-lg",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionHead({ tag, children }: { tag: string; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="font-mono font-extrabold text-[11px] uppercase tracking-[0.16em] bg-[#141414] text-white px-3 py-1.5">
        {tag}
      </span>
      <div className="flex-1 h-[2px] bg-[#141414]" />
      {children}
    </div>
  );
}

type BadgeTone = "active" | "plan" | "prio" | "neutral";
const TONES: Record<BadgeTone, string> = {
  active: "text-green-700 bg-green-50 border-green-600",
  plan: "text-amber-800 bg-amber-100 border-amber-500",
  prio: "text-red-700 bg-red-50 border-red-600",
  neutral: "text-[#141414] bg-white border-[#141414]",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "text-[9px] font-mono font-extrabold uppercase tracking-[0.14em] px-2 py-0.5 border",
        TONES[tone]
      )}
    >
      {children}
    </span>
  );
}

export function StatCard({
  value,
  label,
  tone = "default",
  suffix,
}: {
  value: ReactNode;
  label: string;
  tone?: "default" | "blue" | "amber";
  suffix?: string;
}) {
  const color =
    tone === "blue" ? "text-blue-600" : tone === "amber" ? "text-amber-700" : "text-[#141414]";
  return (
    <div className="p-4 bg-white border-hd-subtle last:border-r-0">
      <div className={cn("font-mono font-extrabold text-3xl tracking-tight", color)}>
        {value}
        {suffix && <span className="text-base ml-1 text-[#747474]">{suffix}</span>}
      </div>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#747474]">
        {label}
      </div>
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "font-mono font-bold text-[11px] uppercase tracking-[0.1em] px-4 py-2 border-hd transition",
        variant === "primary"
          ? "bg-[#141414] hover:bg-slate-800 text-white shadow-hd"
          : "bg-[#f1f1ef] hover:bg-slate-200 text-[#141414]",
        className
      )}
    >
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-mono font-extrabold text-[#747474] uppercase tracking-wide block">
        {label}
      </span>
      {children}
    </label>
  );
}

export function MonoLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "font-mono font-extrabold uppercase tracking-[0.1em] text-[11px] text-[#949494]",
        className
      )}
    >
      {children}
    </span>
  );
}

export function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "-";
  return new Intl.NumberFormat("id-ID").format(n);
}
