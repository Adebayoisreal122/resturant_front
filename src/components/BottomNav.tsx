"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, House, User, UtensilsCrossed } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/format";
import { homeForRole } from "@/lib/roles";

/** App-style tab bar for phones */
export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const items = [
    { href: "/", label: "Home", icon: House },
    { href: "/menu", label: "Menu", icon: UtensilsCrossed },
    { href: "/orders", label: "Orders", icon: ClipboardList },
    { href: user ? (user.role === "customer" ? "/account" : homeForRole(user.role)) : "/login", label: user ? "Account" : "Log in", icon: User },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Tabs">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href) || (label === "Account" && pathname.startsWith("/login"));
          return (
            <li key={label}>
              <Link href={href} className={cn("flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold", active ? "text-primary-600" : "text-stone-500")} aria-current={active ? "page" : undefined}>
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
