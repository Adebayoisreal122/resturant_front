"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PWAState {
  ready: boolean; // false until the browser has been checked (avoids server/client mismatch)
  canInstall: boolean; // Chrome/Edge/Android: the browser gave us an install prompt
  needsIOSSteps: boolean; // iPhone/iPad Safari: no prompt exists, show manual steps
  isInstalled: boolean;
  promptInstall: () => Promise<void>;
  iosHelpOpen: boolean;
  setIosHelpOpen: (open: boolean) => void;
}

const PWAContext = createContext<PWAState | null>(null);

export function usePWA() {
  const ctx = useContext(PWAContext);
  if (!ctx) throw new Error("usePWA must be used inside PWAProvider");
  return ctx;
}

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function PWAProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [iosHelpOpen, setIosHelpOpen] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(ios);
    setIsInstalled(isStandalone());
    setReady(true);

    // Captured here, at the top of the app, so the event is never missed
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    // The browser only allows one prompt per event
    setDeferred(null);
    if (choice.outcome === "accepted") setIsInstalled(true);
  }, [deferred]);

  const value = useMemo<PWAState>(
    () => ({
      ready,
      canInstall: !!deferred && !isInstalled,
      needsIOSSteps: isIOS && !isInstalled,
      isInstalled,
      promptInstall,
      iosHelpOpen,
      setIosHelpOpen,
    }),
    [ready, deferred, isIOS, isInstalled, promptInstall, iosHelpOpen]
  );

  return <PWAContext.Provider value={value}>{children}</PWAContext.Provider>;
}
