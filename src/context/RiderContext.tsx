"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { riderApi } from "@/lib/riderApi";
import { chime, enableSound } from "@/lib/sound";
import { getSocket } from "@/lib/socket";
import { FINAL } from "@/lib/posLogic";
import type { CashOwed, Order } from "@/lib/types";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

interface RiderState {
  orders: Order[];
  loading: boolean;
  error: string | null;
  online: boolean;
  toggleOnline: () => Promise<void>;
  togglingOnline: boolean;
  refresh: (silent?: boolean) => Promise<void>;
  upsert: (o: Order) => void;
  cash: CashOwed | null;
  refreshCash: () => Promise<void>;
  connected: boolean;
}

const RiderContext = createContext<RiderState | null>(null);
export function useRider() {
  const c = useContext(RiderContext);
  if (!c) throw new Error("useRider must be used inside RiderProvider");
  return c;
}

const byAge = (a: Order, b: Order) => +new Date(a.createdAt) - +new Date(b.createdAt);

export function RiderProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(!!user?.rider?.isOnline);
  const [togglingOnline, setToggling] = useState(false);
  const [cash, setCash] = useState<CashOwed | null>(null);
  const [connected, setConnected] = useState(false);
  const meRef = useRef(user?._id);
  meRef.current = user?._id;

  useEffect(() => { setOnline(!!user?.rider?.isOnline); }, [user?.rider?.isOnline]);

  const upsert = useCallback((o: Order) => {
    setOrders((prev) => {
      const rest = prev.filter((x) => x._id !== o._id);
      return FINAL.includes(o.status) ? rest : [...rest, o].sort(byAge);
    });
  }, []);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setOrders((await riderApi.active()).orders.sort(byAge));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load deliveries");
    }
    setLoading(false);
  }, []);

  const refreshCash = useCallback(async () => {
    try { setCash(await riderApi.cash()); } catch { /* keep the last figure */ }
  }, []);

  useEffect(() => {
    if (!user) return;
    refresh();
    refreshCash();
    const t = setInterval(() => { refresh(true); refreshCash(); }, 20000);
    return () => clearInterval(t);
  }, [user, refresh, refreshCash]);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;
    const mine = (o: Order) => String(o.delivery?.rider && typeof o.delivery.rider === "object" ? o.delivery.rider._id : o.delivery?.rider) === meRef.current;
    const onAssigned = (o: Order) => {
      upsert(o);
      chime();
      if ("vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
      toast(`New delivery: ${o.orderNumber}`);
    };
    const onUpdate = (o: Order) => { if (mine(o)) upsert(o); };
    const onConnect = () => { setConnected(true); refresh(true); };
    const onDisconnect = () => setConnected(false);
    const onError = async () => {
      setConnected(false);
      try { await api.auth.me(); } catch { /* logged out */ }
      setTimeout(() => socket.connect(), 2000);
    };
    socket.on("delivery:assigned", onAssigned);
    socket.on("order:updated", onUpdate);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onError);
    setConnected(socket.connected);
    return () => {
      socket.off("delivery:assigned", onAssigned);
      socket.off("order:updated", onUpdate);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onError);
    };
  }, [user, upsert, refresh, toast]);

  const toggleOnline = useCallback(async () => {
    setToggling(true);
    try {
      const next = !online;
      if (next) enableSound(); // going online is a tap, so sound can be unlocked for new-delivery alerts
      const r = await riderApi.setOnline(next);
      setOnline(r.isOnline);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't change your status", "error");
    }
    setToggling(false);
  }, [online, toast]);

  const value = useMemo<RiderState>(
    () => ({ orders, loading, error, online, toggleOnline, togglingOnline, refresh, upsert, cash, refreshCash, connected }),
    [orders, loading, error, online, toggleOnline, togglingOnline, refresh, upsert, cash, refreshCash, connected]
  );
  return <RiderContext.Provider value={value}>{children}</RiderContext.Provider>;
}
