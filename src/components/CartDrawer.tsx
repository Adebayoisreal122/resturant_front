"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { lineUnitTotal, useCart } from "@/context/CartContext";
import { formatNaira } from "@/lib/format";
import { buttonClass } from "./ui";

export default function CartDrawer() {
  const { drawerOpen, closeDrawer, lines, subtotal, setQuantity, removeLine, clear } = useCart();

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeDrawer();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen, closeDrawer]);

  if (!drawerOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-black/50 animate-fade-in" onClick={closeDrawer}>
      <aside
        role="dialog"
        aria-label="Your cart"
        className="animate-slide-in-right flex h-full w-full max-w-md flex-col bg-white pt-[env(safe-area-inset-top)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-bold"><ShoppingBag size={20} className="text-primary-600" /> Your cart</h2>
          <button onClick={closeDrawer} aria-label="Close cart" className="rounded-full p-2 text-stone-500 hover:bg-stone-100"><X size={20} /></button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-100 text-accent-600"><ShoppingBag size={28} /></span>
            <p className="mt-4 text-lg font-bold">Your cart is empty</p>
            <p className="mt-1 text-stone-600">Add something tasty from the menu.</p>
            <Link href="/menu" onClick={closeDrawer} className={buttonClass("primary", "md", "mt-5")}>Browse menu</Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-stone-100 overflow-y-auto px-5">
              {lines.map((l) => (
                <li key={l.key} className="py-4">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{l.name}</p>
                      {(l.variant || l.addOns.length > 0) && (
                        <p className="mt-0.5 text-sm text-stone-500">{[l.variant, ...l.addOns.map((a) => `+ ${a.name}`)].filter(Boolean).join(", ")}</p>
                      )}
                      {l.note && <p className="mt-0.5 text-sm italic text-stone-500">“{l.note}”</p>}
                    </div>
                    <p className="shrink-0 font-bold text-accent-700">{formatNaira(lineUnitTotal(l) * l.quantity)}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1 rounded-full bg-stone-100 p-1">
                      <button onClick={() => setQuantity(l.key, l.quantity - 1)} aria-label={`Fewer ${l.name}`} className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm"><Minus size={16} /></button>
                      <span className="w-8 text-center font-bold" aria-live="polite">{l.quantity}</span>
                      <button onClick={() => setQuantity(l.key, l.quantity + 1)} aria-label={`More ${l.name}`} className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm"><Plus size={16} /></button>
                    </div>
                    <button onClick={() => removeLine(l.key)} aria-label={`Remove ${l.name}`} className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"><Trash2 size={15} /> Remove</button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-stone-200 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
              <div className="flex items-center justify-between text-lg font-bold"><span>Subtotal</span><span>{formatNaira(subtotal)}</span></div>
              <p className="mt-1 text-xs text-stone-500">Delivery fee and VAT are added at checkout.</p>
              <Link href="/checkout" onClick={closeDrawer} className={buttonClass("primary", "lg", "mt-4 w-full")}>Checkout</Link>
              <button onClick={clear} className="mt-2 w-full py-2 text-sm font-medium text-stone-500 hover:text-primary-600">Clear cart</button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
