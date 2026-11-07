"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ExternalLink, LogOut, Menu as MenuIcon, X, type LucideIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABEL } from "@/lib/roles";
import { cn } from "@/lib/format";
import Logo from "../Logo";

export interface NavItem { href: string; label: string; icon: LucideIcon; exact?: boolean; badge?: number }

/** Sidebar on desktop, slide-over menu on phones. Reused by every staff role. */
export default function DashboardShell({ nav, children, wide }: { nav: NavItem[]; children: ReactNode; wide?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const links = (
    <nav className="flex-1 space-y-1 px-3" aria-label="Dashboard">
      {nav.map(({ href, label, icon: Icon, exact, badge }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition", active ? "bg-primary-600 text-white shadow-sm shadow-primary-600/30" : "text-stone-700 hover:bg-stone-100")}>
            <Icon size={19} /> <span className="flex-1">{label}</span>
            {!!badge && <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", active ? "bg-white text-primary-700" : "bg-accent-500 text-white")}>{badge}</span>}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="space-y-2 border-t border-stone-200 p-4">
      {user && (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary-100 font-bold text-secondary-700">{user.name.charAt(0).toUpperCase()}</span>
          <div className="min-w-0"><p className="truncate text-sm font-bold">{user.name}</p><p className="text-xs text-stone-500">{ROLE_LABEL[user.role]}</p></div>
        </div>
      )}
      <Link href="/" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-stone-600 hover:bg-stone-100"><ExternalLink size={15} /> View customer site</Link>
      <button onClick={async () => { await logout(); router.replace("/login"); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-primary-700 hover:bg-primary-50"><LogOut size={15} /> Log out</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-stone-200 bg-white pt-5 lg:flex">
        <div className="mb-6 px-5"><Logo /></div>
        {links}
        {footer}
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-stone-200 bg-white/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
        <Logo />
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-full p-2 hover:bg-stone-100"><MenuIcon size={22} /></button>
      </header>

      {open && (
        <div className="fixed inset-0 z-[70] bg-black/50 animate-fade-in lg:hidden" onClick={() => setOpen(false)}>
          <aside className="animate-slide-in-right ml-auto flex h-full w-72 max-w-[85%] flex-col bg-white pt-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between px-5"><span className="font-bold">Menu</span><button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-full p-2 hover:bg-stone-100"><X size={20} /></button></div>
            {links}
            {footer}
          </aside>
        </div>
      )}

      <main className={cn("mx-auto w-full px-4 py-6 sm:px-6 lg:py-8", wide ? "max-w-[1700px]" : "max-w-6xl")}>{children}</main>
    </div>
  );
}
