"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { PWAProvider } from "@/context/PWAContext";
import { ToastProvider } from "@/context/ToastContext";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <PWAProvider>
        <AuthProvider>
          <CartProvider>{children}</CartProvider>
        </AuthProvider>
      </PWAProvider>
    </ToastProvider>
  );
}
