"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { cn } from "@/lib/format";

type Tone = "success" | "error";
interface ToastItem { id: number; message: string; tone: Tone }

const ToastContext = createContext<{ toast: (message: string, tone?: Tone) => void }>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, tone: Tone = "success") => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, message, tone }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 3200);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "animate-slide-up pointer-events-auto flex max-w-sm items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg",
              t.tone === "success" ? "bg-success-600" : "bg-primary-600"
            )}
          >
            {t.tone === "success" ? <CircleCheck size={18} /> : <CircleAlert size={18} />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
