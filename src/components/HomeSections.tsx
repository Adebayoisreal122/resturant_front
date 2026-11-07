"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, MapPin, Phone, Truck } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useCart } from "@/context/CartContext";
import type { MenuItem } from "@/lib/types";
import MenuCard from "./MenuCard";
import ItemSheet from "./ItemSheet";
import { Container, buttonClass } from "./ui";

export function PopularDishes() {
  const { branchId, setBranch } = useCart();
  const branches = useApi(() => api.branches.list(), "branches");
  const target = branchId ?? branches.data?.branches[0]?._id ?? null;
  const menu = useApi(() => api.menu.list(target as string), target);
  const [selected, setSelected] = useState<MenuItem | null>(null);

  const items = menu.data?.items ?? [];
  if (menu.error || branches.error || (!menu.loading && items.length === 0)) return null;
  const featured = [...items].sort((a, b) => Number(b.tags?.includes("popular")) - Number(a.tags?.includes("popular"))).slice(0, 6);

  return (
    <section className="mt-16">
      <Container>
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-extrabold sm:text-3xl">Popular right now</h2>
            <p className="mt-1 text-stone-600">Customer favourites, made fresh.</p>
          </div>
          <Link href="/menu" className="hidden items-center gap-1 font-semibold text-secondary-600 hover:underline sm:flex">Full menu <ArrowRight size={16} /></Link>
        </div>
        {menu.loading ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-stone-100" />)}</div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((item) => (
              <MenuCard key={item._id} item={item} onSelect={(i) => { if (!branchId && target) setBranch(target); setSelected(i); }} />
            ))}
          </div>
        )}
        <Link href="/menu" className={buttonClass("outline", "md", "mt-6 sm:hidden")}>See full menu <ArrowRight size={16} /></Link>
      </Container>
      {selected && <ItemSheet item={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

export function BranchList() {
  const router = useRouter();
  const { setBranch } = useCart();
  const { data, error } = useApi(() => api.branches.list(), "branches");
  const branches = data?.branches ?? [];
  if (error || branches.length === 0) return null;

  return (
    <section className="mt-16">
      <Container>
        <h2 className="text-2xl font-extrabold sm:text-3xl">Our branches</h2>
        <p className="mt-1 text-stone-600">Choose the one closest to you.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {branches.map((b) => (
            <div key={b._id} className="flex flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold">{b.name}</h3>
              <p className="mt-2 flex items-start gap-2 text-sm text-stone-600"><MapPin size={16} className="mt-0.5 shrink-0 text-primary-600" /> {b.address}{b.city ? `, ${b.city}` : ""}</p>
              {b.phone && <a href={`tel:${b.phone}`} className="mt-1 flex items-center gap-2 text-sm text-secondary-600 hover:underline"><Phone size={16} /> {b.phone}</a>}
              {b.acceptsDelivery && b.deliveryZones.length > 0 && (
                <p className="mt-1 flex items-center gap-2 text-sm text-success-700"><Truck size={16} /> Delivers to {b.deliveryZones.length} area{b.deliveryZones.length > 1 ? "s" : ""}</p>
              )}
              <button
                onClick={() => { if (setBranch(b._id)) router.push("/menu"); }}
                className={buttonClass("primary", "md", "mt-4 w-full")}
              >
                Order from here
              </button>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
