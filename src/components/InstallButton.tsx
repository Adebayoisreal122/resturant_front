"use client";

import { Download, Share, SquarePlus, X } from "lucide-react";
import { usePWA } from "@/context/PWAContext";
import { cn } from "@/lib/format";

type Variant = "hero" | "solid" | "compact";

const styles: Record<Variant, string> = {
  hero: "bg-white text-primary-700 hover:bg-primary-50 px-6 py-3.5 text-base shadow-lg shadow-primary-900/20",
  solid: "bg-primary-600 text-white hover:bg-primary-700 px-6 py-3.5 text-base shadow-lg shadow-primary-600/30",
  compact: "bg-primary-50 text-primary-700 hover:bg-primary-100 px-3 py-2 text-sm",
};

/** "Download App" button. Shows only where the app can really be installed. */
export default function InstallButton({ variant = "solid", className }: { variant?: Variant; className?: string }) {
  const { ready, canInstall, needsIOSSteps, promptInstall, setIosHelpOpen } = usePWA();
  if (!ready || (!canInstall && !needsIOSSteps)) return null;

  return (
    <button
      type="button"
      onClick={() => (canInstall ? promptInstall() : setIosHelpOpen(true))}
      className={cn("inline-flex items-center justify-center gap-2 rounded-full font-semibold transition active:scale-95", styles[variant], className)}
    >
      <Download size={variant === "compact" ? 16 : 20} aria-hidden />
      Download App
    </button>
  );
}

/** iPhones can't show an install prompt, so we explain the two taps. */
export function IOSInstallSheet() {
  const { iosHelpOpen, setIosHelpOpen } = usePWA();
  if (!iosHelpOpen) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 animate-fade-in sm:items-center" onClick={() => setIosHelpOpen(false)}>
      <div
        role="dialog"
        aria-label="Install on iPhone"
        className="animate-slide-up w-full max-w-md rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-bold">Install on your iPhone</h2>
          <button onClick={() => setIosHelpOpen(false)} aria-label="Close" className="rounded-full p-1 text-stone-500 hover:bg-stone-100">
            <X size={20} />
          </button>
        </div>
        <ol className="mt-4 space-y-4 text-stone-700">
          <li className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-100 text-secondary-700"><Share size={20} /></span>
            <span>Tap the <b>Share</b> button at the bottom of Safari.</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-100 text-success-700"><SquarePlus size={20} /></span>
            <span>Scroll down and tap <b>Add to Home Screen</b>.</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-700"><Download size={20} /></span>
            <span>Tap <b>Add</b>. The app now sits on your home screen.</span>
          </li>
        </ol>
        <p className="mt-4 text-xs text-stone-500">This works in Safari only. If you opened the site from another app, copy the link into Safari first.</p>
      </div>
    </div>
  );
}
