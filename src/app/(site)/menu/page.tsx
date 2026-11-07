"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MapPin, Search, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useCart } from "@/context/CartContext";
import { formatNaira, cn } from "@/lib/format";
import { VAT_MODE } from "@/lib/config";
import type { MenuItem } from "@/lib/types";
import MenuCard from "@/components/MenuCard";
import ItemSheet from "@/components/ItemSheet";
import { Container, EmptyState, ErrorState, Spinner, inputClass } from "@/components/ui";

const catId = (i: MenuItem) => (typeof i.category === "string" ? i.category : i.category._id);

export default function MenuPage() {
  const cart = useCart();
  const branches = useApi(() => api.branches.list(), "branches");
  const list = branches.data?.branches ?? [];

  // Only one branch? Select it for the customer.
  useEffect(() => {
    if (cart.hydrated && !cart.branchId && list.length === 1) cart.setBranch(list[0]._id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.hydrated, cart.branchId, list.length]);

  const branchId = cart.branchId && list.some((b) => b._id === cart.branchId) ? cart.branchId : null;
  const categories = useApi(() => api.categories.list(), "categories");
  const menu = useApi(() => api.menu.list(branchId as string), branchId);

  const [active, setActive] = useState<string>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<MenuItem | null>(null);

  const items = menu.data?.items ?? [];
  const cats = (categories.data?.categories ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((i) => (active === "all" || catId(i) === active) && (!term || i.name.toLowerCase().includes(term) || i.description?.toLowerCase().includes(term)));
  }, [items, active, q]);

  const groups = useMemo(() => {
    if (active !== "all" || q.trim()) return [{ id: "results", name: "", items: filtered }];
    return cats.map((c) => ({ id: c._id, name: c.name, items: filtered.filter((i) => catId(i) === c._id) })).filter((g) => g.items.length > 0);
  }, [cats, filtered, active, q]);

  const branch = list.find((b) => b._id === branchId);

  if (branches.loading || !cart.hydrated) return <Spinner label="Loading menu" />;
  if (branches.error) return <ErrorState message={branches.error} onRetry={() => branches.reload()} />;
  if (list.length === 0) return <EmptyState icon={<UtensilsCrossed size={28} />} title="No branches yet" text="The menu will appear here once a branch is set up." />;

  if (!branchId) {
    return (
      <Container className="py-10">
        <h1 className="text-3xl font-extrabold">Where are you ordering from?</h1>
        <p className="mt-1 text-stone-600">Menus and prices can differ by branch.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map((b) => (
            <button key={b._id} onClick={() => cart.setBranch(b._id)} className="rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm transition hover:border-primary-600 hover:shadow-md">
              <h2 className="text-lg font-bold">{b.name}</h2>
              <p className="mt-2 flex items-start gap-2 text-sm text-stone-600"><MapPin size={16} className="mt-0.5 shrink-0 text-primary-600" /> {b.address}</p>
            </button>
          ))}
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">Menu</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-600"><MapPin size={15} className="text-primary-600" /> {branch?.name}</p>
        </div>
        <div className="flex gap-2">
          {list.length > 1 && (
            <select value={branchId} onChange={(e) => cart.setBranch(e.target.value)} aria-label="Change branch" className={cn(inputClass, "!w-auto !py-2.5 text-sm font-semibold")}>
              {list.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          )}
          <div className="relative flex-1 sm:w-64">
            <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the menu" className={cn(inputClass, "!py-2.5 pl-10 text-sm")} />
          </div>
        </div>
      </div>

      <div className="no-scrollbar sticky top-16 z-30 -mx-4 mt-4 flex gap-2 overflow-x-auto bg-[#fffdfb]/95 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0">
        {[{ _id: "all", name: "All" }, ...cats].map((c) => (
          <button
            key={c._id}
            onClick={() => setActive(c._id)}
            className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition", active === c._id ? "bg-primary-600 text-white shadow-sm shadow-primary-600/30" : "bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50")}
          >
            {c.name}
          </button>
        ))}
      </div>

      {menu.loading ? (
        <Spinner label="Loading dishes" />
      ) : menu.error ? (
        <ErrorState message={menu.error} onRetry={() => menu.reload()} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Search size={28} />} title="Nothing found" text="Try another search or category." />
      ) : (
        <div className="mt-2 space-y-8">
          {groups.map((g) => (
            <section key={g.id}>
              {g.name && <h2 className="mb-3 text-xl font-bold">{g.name}</h2>}
              <div className="grid gap-4 md:grid-cols-2">
                {g.items.map((item) => <MenuCard key={item._id} item={item} onSelect={setSelected} />)}
              </div>
            </section>
          ))}
        </div>
      )}

      {cart.count > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 px-4 md:bottom-6">
          <button onClick={cart.openDrawer} className="pointer-events-auto mx-auto flex w-full max-w-md items-center justify-between rounded-full bg-primary-600 px-5 py-3.5 font-bold text-white shadow-xl shadow-primary-600/40 transition active:scale-[0.98]">
            <span className="flex items-center gap-2"><ShoppingBag size={20} /> View cart · {cart.count} item{cart.count > 1 ? "s" : ""}</span>
            <span>{formatNaira(cart.subtotal)}</span>
          </button>
        </div>
      )}

      {selected && <ItemSheet item={selected} onClose={() => setSelected(null)} />}
      <p className="mt-10 text-center text-sm text-stone-500">{VAT_MODE === "exclusive" ? "Prices shown are before VAT and delivery." : VAT_MODE === "inclusive" ? "Prices include VAT. Delivery is added at checkout." : "Delivery is added at checkout."} <Link href="/checkout" className="font-semibold text-secondary-600 hover:underline">Go to checkout</Link></p>
    </Container>
  );
}
