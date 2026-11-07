"use client";

import { Flame, Leaf, Plus, Star, UtensilsCrossed } from "lucide-react";
import type { MenuItem } from "@/lib/types";
import { formatNaira } from "@/lib/format";
import { Badge } from "./ui";

export const hasChoices = (item: MenuItem) => item.variants.length > 0 || item.addOns.length > 0;

export const startingPrice = (item: MenuItem) =>
  item.variants.length ? Math.min(...item.variants.map((v) => v.price)) : item.price ?? item.basePrice;

export function ItemImage({ item, className }: { item: MenuItem; className?: string }) {
  return item.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.image} alt={item.name} loading="lazy" className={className} />
  ) : (
    <div className={`flex items-center justify-center bg-gradient-to-br from-accent-100 via-primary-50 to-primary-100 text-primary-300 ${className ?? ""}`} aria-hidden>
      <UtensilsCrossed size={36} />
    </div>
  );
}

export function TagBadges({ tags }: { tags: string[] }) {
  const t = tags.map((x) => x.toLowerCase());
  return (
    <>
      {t.includes("spicy") && <Badge tone="primary"><Flame size={12} /> Spicy</Badge>}
      {t.includes("vegetarian") && <Badge tone="success"><Leaf size={12} /> Veg</Badge>}
      {t.includes("popular") && <Badge tone="accent"><Star size={12} /> Popular</Badge>}
    </>
  );
}

export default function MenuCard({ item, onSelect }: { item: MenuItem; onSelect: (item: MenuItem) => void }) {
  const price = startingPrice(item);
  return (
    <article className="group flex overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md">
      <ItemImage item={item} className="h-auto w-28 shrink-0 object-cover sm:w-36" />
      <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
        <div className="flex flex-wrap gap-1"><TagBadges tags={item.tags || []} /></div>
        <h3 className="mt-1 font-bold leading-snug">{item.name}</h3>
        {item.description && <p className="mt-0.5 line-clamp-2 text-sm text-stone-600">{item.description}</p>}
        <div className="mt-auto flex items-center justify-between pt-3">
          <p className="font-extrabold text-accent-700">
            {item.variants.length > 1 && <span className="mr-1 text-xs font-semibold text-stone-500">from</span>}
            {formatNaira(price)}
          </p>
          <button
            onClick={() => onSelect(item)}
            aria-label={`Add ${item.name}`}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-white shadow-sm shadow-primary-600/30 transition hover:bg-primary-700 active:scale-90"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
    </article>
  );
}
