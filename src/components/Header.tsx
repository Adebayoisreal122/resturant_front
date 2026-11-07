"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, User as UserIcon } from "lucide-react";
import Logo from "./Logo";
import InstallButton from "./InstallButton";
import { Container, buttonClass } from "./ui";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { cn } from "@/lib/format";
import { homeForRole } from "@/lib/roles";

const links = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/orders", label: "My orders" },
];

export default function Header() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { count, openDrawer, hydrated } = useCart();
  const accountHref = user ? (user.role === "customer" ? "/account" : homeForRole(user.role)) : "/login";

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-white/90 backdrop-blur pt-[env(safe-area-inset-top)]">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn("rounded-full px-4 py-2 text-sm font-semibold transition", active ? "bg-primary-50 text-primary-700" : "text-stone-600 hover:bg-stone-100")}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <InstallButton variant="compact" className="hidden sm:inline-flex" />
          <button
            onClick={openDrawer}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-800 transition hover:bg-stone-200"
            aria-label={`Open cart${hydrated && count ? `, ${count} items` : ""}`}
          >
            <ShoppingBag size={20} />
            {hydrated && count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-xs font-bold text-white">{count}</span>
            )}
          </button>
          {user ? (
            <Link href={accountHref} className="hidden h-10 items-center gap-2 rounded-full bg-secondary-50 px-3 text-sm font-semibold text-secondary-700 hover:bg-secondary-100 sm:flex">
              <UserIcon size={18} /> {user.name.split(" ")[0]}
            </Link>
          ) : (
            <Link href="/login" className={buttonClass("primary", "sm", "hidden sm:inline-flex")}>Log in</Link>
          )}
        </div>
      </Container>
    </header>
  );
}
