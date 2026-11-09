"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Bike, History, LogOut, Wallet } from "lucide-react";
import RequireRole from "@/components/dash/RequireRole";
import Logo from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { RiderProvider, useRider } from "@/context/RiderContext";
import { cn } from "@/lib/format";

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { orders, online, cash } = useRider();
  const owed = cash?.expected ?? 0;
  const tabs = [
    { href: "/rider", label: "Deliveries", icon: Bike, badge: orders.length || undefined, exact: true },
    { href: "/rider/history", label: "History", icon: History },
    { href: "/rider/cash", label: "Cash", icon: Wallet, badge: owed > 0 ? "₦" : undefined },
  ];
  return (
    <div className="min-h-screen bg-stone-50 pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-2">
            <span className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold", online ? "bg-success-100 text-success-700" : "bg-stone-200 text-stone-600")}>
              <span className={cn("h-2 w-2 rounded-full", online ? "bg-success-600" : "bg-stone-400")} /> {online ? "Online" : "Offline"}
            </span>
            <button onClick={async () => { await logout(); router.replace("/login"); }} aria-label={`Log out ${user?.name ?? ""}`} className="rounded-full p-2 text-stone-500 hover:bg-stone-100"><LogOut size={18} /></button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-5">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)]" aria-label="Rider tabs">
        <ul className="mx-auto grid max-w-xl grid-cols-3">
          {tabs.map(({ href, label, icon: Icon, badge, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link href={href} aria-current={active ? "page" : undefined} className={cn("relative flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold", active ? "text-primary-600" : "text-stone-500")}>
                  <Icon size={22} strokeWidth={active ? 2.5 : 2} /> {label}
                  {badge !== undefined && <span className="absolute right-[28%] top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">{badge}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export default function RiderLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole roles={["rider"]}>
      <RiderProvider><Shell>{children}</Shell></RiderProvider>
    </RequireRole>
  );
}

