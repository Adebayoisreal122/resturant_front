"use client";

import { Volume2, VolumeX, Wifi, WifiOff } from "lucide-react";
import { usePos } from "@/context/PosContext";
import { cn } from "@/lib/format";

export function LiveStatus() {
  const { connected } = usePos();
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold", connected ? "bg-success-100 text-success-700" : "bg-accent-100 text-accent-700")} title={connected ? "Receiving orders instantly" : "Live connection lost, checking every 25 seconds"}>
      {connected ? <Wifi size={14} /> : <WifiOff size={14} />} {connected ? "Live" : "Reconnecting"}
    </span>
  );
}

export function SoundToggle() {
  const { soundOn, setSoundOn } = usePos();
  return (
    <button onClick={() => setSoundOn(!soundOn)} aria-pressed={soundOn} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition", soundOn ? "bg-secondary-100 text-secondary-700" : "bg-stone-100 text-stone-600")}>
      {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />} {soundOn ? "Sound on" : "Sound off"}
    </button>
  );
}
