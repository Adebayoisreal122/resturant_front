"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { lagosToday } from "@/lib/dates";
import { chime, enableSound } from "@/lib/sound";
import { getSocket } from "@/lib/socket";
import { staffApi } from "@/lib/staffApi";
import { FINAL } from "@/lib/posLogic";
import type { Branch, Order, Shift, ShiftLive } from "@/lib/types";
import Receipt from "@/components/pos/Receipt";
import { useAuth } from "./AuthContext";

interface PosState {
  branchId: string | null;
  branch: Branch | null;
  orders: Order[]; // everything still in progress, oldest first
  loading: boolean;
  error: string | null;
  connected: boolean;
  refresh: (silent?: boolean) => Promise<void>;
  upsert: (o: Order) => void;
  pendingCount: number;
  soundOn: boolean;
  setSoundOn: (v: boolean) => void;
  shift: Shift | null;
  live: ShiftLive | null;
  shiftLoading: boolean;
  refreshShift: () => Promise<void>;
  printReceipt: (o: Order, opts?: { tendered?: number; change?: number }) => void;
  doneToday: () => Promise<Order[]>;
}

const PosContext = createContext<PosState | null>(null);
export function usePos() {
  const c = useContext(PosContext);
  if (!c) throw new Error("usePos must be used inside PosProvider");
  return c;
}

const byAge = (a: Order, b: Order) => +new Date(a.createdAt) - +new Date(b.createdAt);

export function PosProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const branchId = user ? (typeof user.branch === "object" && user.branch ? user.branch._id : (user.branch as string | undefined) ?? null) : null;
  const needsShift = !!user && user.role !== "super_admin" && !(user.role === "worker" && user.workerType === "kitchen");

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [soundOn, setSoundOnState] = useState(false);
  const [shift, setShift] = useState<Shift | null>(null);
  const [live, setLive] = useState<ShiftLive | null>(null);
  const [shiftLoading, setShiftLoading] = useState(needsShift);
  const [receipt, setReceipt] = useState<{ order: Order; tendered?: number; change?: number; nonce: number } | null>(null);

  const ordersRef = useRef<Order[]>([]);
  ordersRef.current = orders;
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;
  const meRef = useRef(user?._id);
  meRef.current = user?._id;

  /* ---- sound preference ---- */
  useEffect(() => {
    const saved = localStorage.getItem("pos:sound") === "1";
    setSoundOnState(saved);
    if (saved) {
      // Browsers need a tap before they allow sound: wait for the first one
      const arm = () => enableSound();
      document.addEventListener("pointerdown", arm, { once: true });
      return () => document.removeEventListener("pointerdown", arm);
    }
  }, []);
  const setSoundOn = useCallback((v: boolean) => {
    setSoundOnState(v);
    localStorage.setItem("pos:sound", v ? "1" : "0");
    if (v) { enableSound(); chime(); }
  }, []);

  /* ---- orders ---- */
  const upsert = useCallback((o: Order) => {
    setOrders((prev) => {
      const rest = prev.filter((x) => x._id !== o._id);
      return FINAL.includes(o.status) ? rest : [...rest, o].sort(byAge);
    });
  }, []);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const r = await staffApi.orders.active();
      setOrders(r.orders.sort(byAge));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load orders");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    refresh();
    const timer = setInterval(() => refresh(true), 25000); // safety net if the live connection drops
    return () => clearInterval(timer);
  }, [user, refresh]);

  useEffect(() => {
    if (!branchId) return;
    staffApi.branch(branchId).then((r) => setBranch(r.branch)).catch(() => {});
  }, [branchId]);

  /* ---- live updates ---- */
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;

    const handle = (o: Order, isNew: boolean) => {
      const prev = ordersRef.current.find((x) => x._id === o._id);
      const enteredKitchen = o.status === "confirmed" && prev?.status !== "confirmed";
      const incomingOnline = isNew && o.source === "online" && o.status === "pending";
      const mine = o.createdBy && o.createdBy === meRef.current;
      upsert(o);
      if (soundRef.current && !mine && (incomingOnline || enteredKitchen)) chime();
    };
    const onNew = (o: Order) => handle(o, true);
    const onUpdate = (o: Order) => handle(o, false);
    const onConnect = () => { setConnected(true); refresh(true); };
    const onDisconnect = () => setConnected(false);
    // An expired token is refreshed by any API call, then we reconnect
    const onError = async () => {
      setConnected(false);
      try { await api.auth.me(); } catch { /* logged out */ }
      setTimeout(() => socket.connect(), 2000);
    };

    socket.on("order:new", onNew);
    socket.on("order:updated", onUpdate);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onError);
    setConnected(socket.connected);
    return () => {
      socket.off("order:new", onNew);
      socket.off("order:updated", onUpdate);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onError);
    };
  }, [user, upsert, refresh]);

  /* ---- shift ---- */
  const refreshShift = useCallback(async () => {
    if (!needsShift) { setShiftLoading(false); return; }
    try {
      const r = await staffApi.shifts.current();
      setShift(r.shift);
      setLive(r.live ?? null);
    } catch { /* keep the last known state */ }
    setShiftLoading(false);
  }, [needsShift]);
  useEffect(() => { if (user) refreshShift(); }, [user, refreshShift]);

  const printReceipt = useCallback((order: Order, opts?: { tendered?: number; change?: number }) => {
    setReceipt((r) => ({ order, ...opts, nonce: (r?.nonce ?? 0) + 1 }));
  }, []);
  useEffect(() => {
    if (!receipt) return;
    const t = setTimeout(() => window.print(), 80); // let the receipt render first
    return () => clearTimeout(t);
  }, [receipt?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const doneToday = useCallback(async () => (await staffApi.orders.doneToday(lagosToday())).orders, []);

  const value = useMemo<PosState>(
    () => ({
      branchId, branch, orders, loading, error, connected, refresh, upsert,
      pendingCount: orders.filter((o) => o.status === "pending").length,
      soundOn, setSoundOn, shift, live, shiftLoading, refreshShift, printReceipt, doneToday,
    }),
    [branchId, branch, orders, loading, error, connected, refresh, upsert, soundOn, setSoundOn, shift, live, shiftLoading, refreshShift, printReceipt, doneToday]
  );

  return (
    <PosContext.Provider value={value}>
      {children}
      {receipt && <Receipt order={receipt.order} branch={branch} tendered={receipt.tendered} change={receipt.change} />}
    </PosContext.Provider>
  );
}
