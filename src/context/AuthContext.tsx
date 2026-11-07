"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, tokens } from "@/lib/api";
import { closeSocket } from "@/lib/socket";
import type { User } from "@/lib/types";

interface AuthState {
  user: User | null;
  loading: boolean; // true until we know whether someone is logged in
  login: (phone: string, password: string) => Promise<User>;
  register: (b: { name: string; phone: string; email?: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!tokens.get()) {
      setLoading(false);
    } else {
      api.auth
        .me()
        .then((r) => alive && setUser(r.user))
        .catch(() => alive && setUser(null))
        .finally(() => alive && setLoading(false));
    }
    const onLogout = () => setUser(null);
    window.addEventListener("auth:logout", onLogout);
    return () => {
      alive = false;
      window.removeEventListener("auth:logout", onLogout);
    };
  }, []);

  const login = useCallback(async (phone: string, password: string) => {
    const r = await api.auth.login({ phone, password });
    tokens.set({ accessToken: r.accessToken, refreshToken: r.refreshToken });
    setUser(r.user);
    return r.user;
  }, []);

  const register = useCallback(async (b: { name: string; phone: string; email?: string; password: string }) => {
    const r = await api.auth.register(b);
    tokens.set({ accessToken: r.accessToken, refreshToken: r.refreshToken });
    setUser(r.user);
    return r.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.auth.logout(); } catch { /* already logged out or offline */ }
    tokens.clear();
    closeSocket();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
