"use client";

import { Smartphone, Zap, WifiOff, Bell } from "lucide-react";
import InstallButton from "./InstallButton";
import { Container } from "./ui";
import { usePWA } from "@/context/PWAContext";
import { APP_NAME } from "@/lib/config";

/** Homepage banner: get the app on your phone */
export default function InstallPromo() {
  const { ready, isInstalled, canInstall, needsIOSSteps } = usePWA();
  if (ready && isInstalled) return null;
  return (
    <section id="get-the-app" className="mt-16">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-secondary-700 via-secondary-600 to-secondary-500 p-8 text-white sm:p-12">
          <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/10" aria-hidden />
          <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold"><Smartphone size={16} /> Free app, no app store</span>
              <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">Get the {APP_NAME} app</h2>
              <p className="mt-2 max-w-xl text-secondary-100">Install it on your phone in two taps. Order faster, track your food live, and keep your favourite meals one tap away.</p>
              <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-3">
                <li className="flex items-center gap-2"><Zap size={16} className="text-accent-200" /> Opens instantly</li>
                <li className="flex items-center gap-2"><WifiOff size={16} className="text-accent-200" /> Works on weak networks</li>
                <li className="flex items-center gap-2"><Bell size={16} className="text-accent-200" /> Live order updates</li>
              </ul>
            </div>
            <div className="flex flex-col items-start gap-2 md:items-end">
              <InstallButton variant="hero" />
              {ready && !canInstall && !needsIOSSteps && (
                <p className="max-w-xs text-sm text-secondary-100 md:text-right">Open this page in Chrome or Safari on your phone, then use the browser menu and choose “Install app” or “Add to Home Screen”.</p>
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
