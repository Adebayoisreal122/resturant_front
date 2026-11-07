"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import type { MenuItem } from "@/lib/types";
import { useCart, type CartLine } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { formatNaira } from "@/lib/format";
import { Button } from "./ui";
import { ItemImage, TagBadges } from "./MenuCard";

export default function ItemSheet({ item, onClose, onAdd }: { item: MenuItem; onClose: () => void; onAdd?: (line: Omit<CartLine, "key">) => void }) {
  const { addLine } = useCart();
  const { toast } = useToast();
  const [variant, setVariant] = useState(item.variants[0]?.name);
  const [addOns, setAddOns] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const base = item.variants.length ? item.variants.find((v) => v.name === variant)?.price ?? item.variants[0].price : item.price ?? item.basePrice;
  const chosenAddOns = item.addOns.filter((a) => addOns.includes(a.name));
  const unit = base + chosenAddOns.reduce((s, a) => s + a.price, 0);

  const add = () => {
    (onAdd ?? addLine)({
      menuItem: item._id,
      name: item.name,
      image: item.image,
      unitPrice: base,
      variant: item.variants.length ? variant : undefined,
      addOns: chosenAddOns.map((a) => ({ name: a.name, price: a.price })),
      quantity: qty,
      note: note.trim() || undefined,
    });
    toast(`${item.name} added to cart`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center bg-black/50 animate-fade-in sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label={item.name}
        className="animate-slide-up flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <ItemImage item={item} className="h-44 w-full object-cover" />
          <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex flex-wrap gap-1"><TagBadges tags={item.tags || []} /></div>
          <h2 className="mt-1 text-xl font-extrabold">{item.name}</h2>
          {item.description && <p className="mt-1 text-stone-600">{item.description}</p>}

          {item.variants.length > 0 && (
            <fieldset className="mt-5">
              <legend className="mb-2 font-bold">Choose one <span className="text-sm font-medium text-primary-600">(required)</span></legend>
              <div className="space-y-2">
                {item.variants.map((v) => (
                  <label key={v.name} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${variant === v.name ? "border-primary-600 bg-primary-50" : "border-stone-200"}`}>
                    <span className="flex items-center gap-3">
                      <input type="radio" name="variant" checked={variant === v.name} onChange={() => setVariant(v.name)} className="h-4 w-4 accent-primary-600" />
                      {v.name}
                    </span>
                    <span className="font-semibold">{formatNaira(v.price)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {item.addOns.length > 0 && (
            <fieldset className="mt-5">
              <legend className="mb-2 font-bold">Extras <span className="text-sm font-medium text-stone-500">(optional)</span></legend>
              <div className="space-y-2">
                {item.addOns.map((a) => {
                  const on = addOns.includes(a.name);
                  return (
                    <label key={a.name} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${on ? "border-success-600 bg-success-50" : "border-stone-200"}`}>
                      <span className="flex items-center gap-3">
                        <input type="checkbox" checked={on} onChange={() => setAddOns((p) => (on ? p.filter((x) => x !== a.name) : [...p, a.name]))} className="h-4 w-4 accent-success-600" />
                        {a.name}
                      </span>
                      <span className="font-semibold text-stone-600">+ {formatNaira(a.price)}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          <label className="mt-5 block">
            <span className="mb-1.5 block font-bold">Note for the kitchen <span className="text-sm font-medium text-stone-500">(optional)</span></span>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} placeholder="e.g. less pepper" className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-secondary-500 focus:ring-4 focus:ring-secondary-100" />
          </label>
        </div>

        <div className="flex items-center gap-3 border-t border-stone-200 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-1 rounded-full bg-stone-100 p-1">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Fewer" className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm"><Minus size={16} /></button>
            <span className="w-8 text-center font-bold">{qty}</span>
            <button onClick={() => setQty((q) => Math.min(50, q + 1))} aria-label="More" className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm"><Plus size={16} /></button>
          </div>
          <Button size="lg" className="flex-1" onClick={add}>Add · {formatNaira(unit * qty)}</Button>
        </div>
      </div>
    </div>
  );
}
