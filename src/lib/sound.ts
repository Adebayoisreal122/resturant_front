// A short two-note chime for new orders. Browsers only allow sound after a tap, so it is enabled from a button.
let ctx: AudioContext | null = null;

export function enableSound() {
  if (typeof window === "undefined") return;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  ctx = ctx ?? new Ctor();
  void ctx.resume();
}

export const soundReady = () => !!ctx && ctx.state === "running";

export function chime() {
  if (!ctx || ctx.state !== "running") return;
  const t0 = ctx.currentTime;
  [880, 1175].forEach((freq, i) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0 + i * 0.18);
    gain.gain.exponentialRampToValueAtTime(0.3, t0 + i * 0.18 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.18 + 0.35);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(t0 + i * 0.18);
    osc.stop(t0 + i * 0.18 + 0.4);
  });
}
