"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/format";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-stone-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const tones = {
  primary: "bg-primary-100 text-primary-700",
  secondary: "bg-secondary-100 text-secondary-700",
  accent: "bg-accent-100 text-accent-700",
  success: "bg-success-100 text-success-700",
};

export function StatCard({ label, value, hint, icon, tone }: { label: string; value: string; hint?: string; icon: ReactNode; tone: keyof typeof tones }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-stone-600">{label}</p>
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", tones[tone])}>{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-extrabold sm:text-3xl">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

export function Card({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-stone-200 bg-white p-5 shadow-sm", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-bold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center bg-black/50 animate-fade-in sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}
        className={cn("animate-slide-up flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white sm:rounded-3xl", wide ? "max-w-2xl" : "max-w-lg")}>
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-stone-500 hover:bg-stone-100"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-stone-200 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
      className={cn("relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-40", checked ? "bg-success-600" : "bg-stone-300")}>
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (id: T) => void }) {
  return (
    <div className="mb-5 inline-flex rounded-full bg-stone-100 p-1" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={cn("rounded-full px-5 py-2 text-sm font-semibold transition", value === t.id ? "bg-white text-primary-700 shadow-sm" : "text-stone-600")}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export const selectClass = "w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none focus:border-secondary-500 focus:ring-4 focus:ring-secondary-100";
