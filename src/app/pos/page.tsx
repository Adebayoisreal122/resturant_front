"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Banknote, Bike, Building2, Check, Minus, Plus, Printer, Search, ShoppingBag, Smartphone, Store, Trash2, UtensilsCrossed, X } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import { staffApi } from "@/lib/staffApi";
import { useApi } from "@/lib/useApi";
import { estimateTotals } from "@/lib/pricing";
import { buildOrderPayload, changeDue, lineTotal, validateDraft, type PosDraft } from "@/lib/posLogic";
import { cn, formatNaira, normalizePhone } from "@/lib/format";
import type { MenuItem, Order, OrderType } from "@/lib/types";
import { makeKey, type CartLine } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { usePos } from "@/context/PosContext";
import { useToast } from "@/context/ToastContext";
import ItemSheet from "@/components/ItemSheet";
import MenuCard, { hasChoices, startingPrice } from "@/components/MenuCard";
import { Button, ErrorState, Field, Spinner, TextInput, inputClass } from "@/components/ui";
import { Modal, selectClass } from "@/components/dash/kit";

type Line = CartLine;
const catId = (i: MenuItem) => (typeof i.category === "string" ? i.category : i.category._id);
type PayMethod = PosDraft["method"];

export default function PosTerminal() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { branch, branchId, shift, shiftLoading, upsert, refreshShift, printReceipt } = usePos();

  useEffect(() => { if (user?.role === "worker" && user.workerType === "kitchen") router.replace("/pos/kitchen"); }, [user, router]);

  const menu = useApi(() => api.menu.list(branchId as string), branchId);
  const cats = useApi(() => api.categories.list(), "cats");

  const [lines, setLines] = useState<Line[]>([]);
  const [type, setType] = useState<OrderType>("dine_in");
  const [table, setTable] = useState("");
  const [zone, setZone] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<PayMethod>("cash");
  const [paidNow, setPaidNow] = useState(true);
  const [tendered, setTendered] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ order: Order; change: number; tendered: number } | null>(null);

  const [active, setActive] = useState("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const items = menu.data?.items ?? [];
  const categories = (cats.data?.categories ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
  const shown = useMemo(() => items.filter((i) => (active === "all" || catId(i) === active) && (!q.trim() || i.name.toLowerCase().includes(q.trim().toLowerCase()))), [items, active, q]);

  const zones = branch?.deliveryZones ?? [];
  const canDeliver = !!branch?.acceptsDelivery && zones.length > 0;
  const zoneObj = zones.find((z) => z.name === zone);
  const subtotal = lines.reduce((s, l) => s + lineTotal(l), 0);
  const totals = estimateTotals(subtotal, type === "delivery" ? zoneObj?.fee ?? 0 : 0);
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  const received = Number(tendered);
  const change = method === "cash" && paidNow ? changeDue(totals.total, received) : 0;
  const takingPayment = paidNow && method !== "pay_on_delivery";
  const blockedByShift = takingPayment && user?.role === "worker" && !shift && !shiftLoading;

  // Keep the payment choice valid for the order type
  useEffect(() => {
    if (type !== "delivery" && method === "pay_on_delivery") setMethod("cash");
  }, [type, method]);

  const add = (l: Omit<Line, "key">) => {
    const key = makeKey(l);
    setLines((prev) => (prev.some((x) => x.key === key) ? prev.map((x) => (x.key === key ? { ...x, quantity: Math.min(50, x.quantity + l.quantity) } : x)) : [...prev, { ...l, key }]));
  };
  const onSelect = (item: MenuItem) => {
    if (hasChoices(item)) return setSelected(item);
    add({ menuItem: item._id, name: item.name, image: item.image, unitPrice: item.price ?? item.basePrice, addOns: [], quantity: 1 });
  };
  const setQty = (key: string, qty: number) => setLines((p) => (qty <= 0 ? p.filter((l) => l.key !== key) : p.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, qty) } : l))));

  function reset() {
    setLines([]); setTable(""); setZone(""); setAddress(""); setPhone(""); setTendered(""); setError(""); setPaidNow(true); setMethod("cash"); setPanelOpen(false);
  }

  async function place() {
    const draft: PosDraft = { type, table, lines, zone, address, phone, method, paidNow };
    const problem = validateDraft(draft, canDeliver);
    if (problem) return setError(problem);
    if (takingPayment && method === "cash" && tendered !== "" && received < totals.total) return setError("The amount received is less than the total.");
    setError("");
    setBusy(true);
    try {
      const r = await staffApi.orders.create(buildOrderPayload(draft, normalizePhone));
      upsert(r.order);
      if (takingPayment) await refreshShift();
      setDone({ order: r.order, change: method === "cash" && paidNow && tendered ? changeDue(r.order.total, received) : 0, tendered: method === "cash" && paidNow && tendered ? received : 0 });
      reset();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't place the order.");
      if (e instanceof ApiError && e.status === 0) toast("No connection. The order was NOT placed.", "error");
    }
    setBusy(false);
  }

  const quick = Array.from(new Set([totals.total, Math.ceil(totals.total / 500) * 500, Math.ceil(totals.total / 1000) * 1000, Math.ceil(totals.total / 5000) * 5000])).filter((n) => n >= totals.total && n > 0);

  if (!branchId) return <ErrorState message="Your account isn't linked to a branch. Ask the admin to fix this." />;
  if (menu.loading || cats.loading) return <Spinner label="Loading menu" />;
  if (menu.error) return <ErrorState message={menu.error} onRetry={() => menu.reload()} />;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_410px]">
      {/* ---------- menu ---------- */}
      <div className="min-w-0">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1"><Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the menu" className={cn(inputClass, "pl-10")} /></div>
        </div>
        <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
          {[{ _id: "all", name: "All" }, ...categories].map((c) => (
            <button key={c._id} onClick={() => setActive(c._id)} className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition", active === c._id ? "bg-primary-600 text-white" : "bg-white text-stone-700 ring-1 ring-stone-200")}>{c.name}</button>
          ))}
        </div>
        {shown.length === 0 ? <p className="py-12 text-center text-stone-500">No dishes found.</p> : (
          <div className="grid gap-3 pb-24 sm:grid-cols-2 xl:grid-cols-3 lg:pb-0">
            {shown.map((i) => <MenuCard key={i._id} item={i} onSelect={onSelect} />)}
          </div>
        )}
      </div>

      {/* mobile: open the order */}
      {count > 0 && !panelOpen && (
        <button onClick={() => setPanelOpen(true)} className="fixed inset-x-4 bottom-4 z-30 flex items-center justify-between rounded-full bg-primary-600 px-5 py-3.5 font-bold text-white shadow-xl lg:hidden">
          <span className="flex items-center gap-2"><ShoppingBag size={20} /> Order · {count}</span><span>{formatNaira(totals.total)}</span>
        </button>
      )}

      {/* ---------- order panel ---------- */}
      <aside className={cn("fixed inset-0 z-[60] overflow-y-auto bg-white p-4 lg:static lg:z-auto lg:block lg:max-h-[calc(100vh-4rem)] lg:self-start lg:rounded-2xl lg:border lg:border-stone-200 lg:p-5 lg:shadow-sm lg:sticky lg:top-6", panelOpen ? "block" : "hidden")}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Current order</h2>
          <div className="flex items-center gap-1">
            {lines.length > 0 && <button onClick={() => window.confirm("Clear this order?") && reset()} className="rounded-full px-3 py-1.5 text-sm font-semibold text-primary-600 hover:bg-primary-50">Clear</button>}
            <button onClick={() => setPanelOpen(false)} aria-label="Close" className="rounded-full p-2 hover:bg-stone-100 lg:hidden"><X size={20} /></button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-stone-100 p-1">
          {([["dine_in", "Dine-in", UtensilsCrossed, !branch || branch.acceptsDineIn], ["takeaway", "Takeaway", Store, true], ["delivery", "Delivery", Bike, canDeliver]] as const).map(([id, label, Icon, enabled]) => (
            <button key={id} disabled={!enabled} onClick={() => { setType(id); if (id === "delivery") setMethod("pay_on_delivery"); }} className={cn("flex flex-col items-center gap-0.5 rounded-xl py-2 text-xs font-bold transition disabled:opacity-30", type === id ? "bg-white text-primary-700 shadow-sm" : "text-stone-600")}><Icon size={18} /> {label}</button>
          ))}
        </div>

        {type === "dine_in" && <div className="mt-3"><Field label="Table (optional)"><TextInput value={table} onChange={(e) => setTable(e.target.value)} placeholder="e.g. 4 or Patio 2" maxLength={20} /></Field></div>}
        {type === "delivery" && (
          <div className="mt-3 space-y-3">
            <Field label="Delivery area"><select value={zone} onChange={(e) => setZone(e.target.value)} className={selectClass}><option value="">Select area</option>{zones.map((z) => <option key={z.name} value={z.name}>{z.name} · {formatNaira(z.fee)}</option>)}</select></Field>
            <Field label="Address"><textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className={inputClass} placeholder="House number, street, landmark" /></Field>
            <Field label="Customer phone"><TextInput type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0803 123 4567" /></Field>
          </div>
        )}

        <div className="mt-4">
          {lines.length === 0 ? <p className="rounded-xl bg-stone-50 py-8 text-center text-sm text-stone-500">Tap dishes to add them.</p> : (
            <ul className="divide-y divide-stone-100">
              {lines.map((l) => (
                <li key={l.key} className="py-2.5">
                  <div className="flex justify-between gap-2"><p className="font-semibold">{l.name}</p><p className="shrink-0 font-bold">{formatNaira(lineTotal(l))}</p></div>
                  {(l.variant || l.addOns.length > 0 || l.note) && <p className="text-xs text-stone-500">{[l.variant, ...l.addOns.map((a) => `+ ${a.name}`), l.note && `“${l.note}”`].filter(Boolean).join(", ")}</p>}
                  <div className="mt-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1 rounded-full bg-stone-100 p-0.5">
                      <button onClick={() => setQty(l.key, l.quantity - 1)} aria-label={`Fewer ${l.name}`} className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm"><Minus size={14} /></button>
                      <span className="w-7 text-center text-sm font-bold">{l.quantity}</span>
                      <button onClick={() => setQty(l.key, l.quantity + 1)} aria-label={`More ${l.name}`} className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm"><Plus size={14} /></button>
                    </div>
                    <button onClick={() => setQty(l.key, 0)} aria-label={`Remove ${l.name}`} className="p-1.5 text-primary-600"><Trash2 size={16} /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <dl className="mt-3 space-y-1 border-t border-stone-200 pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-stone-600">Subtotal</dt><dd>{formatNaira(totals.subtotal)}</dd></div>
          {type === "delivery" && <div className="flex justify-between"><dt className="text-stone-600">Delivery</dt><dd>{zone ? formatNaira(totals.deliveryFee) : "—"}</dd></div>}
          {totals.vat > 0 && <div className="flex justify-between"><dt className="text-stone-600">VAT</dt><dd>{formatNaira(totals.vat)}</dd></div>}
          <div className="flex justify-between pt-1 text-xl font-extrabold"><dt>Total</dt><dd className="text-accent-700">{formatNaira(totals.total)}</dd></div>
        </dl>

        <div className="mt-4">
          <p className="mb-1.5 text-sm font-bold">Payment</p>
          <div className="grid grid-cols-2 gap-2">
            {([["cash", "Cash", Banknote], ["transfer", "Transfer", Building2], ["pos_terminal", "POS", Smartphone], ...(type === "delivery" ? [["pay_on_delivery", "Pay on delivery", Bike] as const] : [])] as const).map(([id, label, Icon]) => (
              <button key={id} onClick={() => { setMethod(id as PayMethod); if (id !== "pay_on_delivery") setPaidNow(true); }} className={cn("flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition", method === id ? "border-primary-600 bg-primary-50 text-primary-700" : "border-stone-200")}><Icon size={18} /> {label}</button>
            ))}
          </div>
          {method !== "pay_on_delivery" && (
            <label className="mt-3 flex items-center gap-3 rounded-xl bg-stone-50 px-4 py-3 text-sm font-semibold">
              <input type="checkbox" checked={paidNow} onChange={(e) => setPaidNow(e.target.checked)} className="h-5 w-5 accent-success-600" /> Customer has paid now
            </label>
          )}
          {takingPayment && method === "cash" && (
            <div className="mt-3 space-y-2">
              <TextInput inputMode="numeric" aria-label="Amount received" value={tendered} onChange={(e) => setTendered(e.target.value.replace(/[^\d.]/g, ""))} placeholder="Amount received (optional)" />
              <div className="flex flex-wrap gap-1.5">{quick.map((n) => <button key={n} onClick={() => setTendered(String(n))} className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold hover:bg-stone-200">{n === totals.total ? "Exact" : formatNaira(n)}</button>)}</div>
              {change > 0 && <p className="rounded-xl bg-accent-50 p-2.5 text-center font-semibold">Change: <b className="text-accent-700">{formatNaira(change)}</b></p>}
            </div>
          )}
          {!paidNow && method !== "pay_on_delivery" && <p className="mt-2 text-xs text-stone-500">The order goes to the kitchen now. Take the payment later from the Orders screen.</p>}
        </div>

        {blockedByShift && (
          <p className="mt-3 rounded-xl bg-accent-50 px-3 py-2.5 text-sm text-accent-700">Open your shift to take payments. <Link href="/pos/shift" className="font-bold underline">Open shift</Link>, or untick “Customer has paid now”.</p>
        )}
        {error && <p role="alert" className="mt-3 rounded-xl bg-primary-50 px-3 py-2.5 text-sm font-medium text-primary-700">{error}</p>}
        <Button size="lg" variant="success" className="mt-4 w-full" loading={busy} disabled={lines.length === 0 || blockedByShift} onClick={place}>
          {takingPayment ? `Place order and take ${formatNaira(totals.total)}` : "Place order"}
        </Button>
      </aside>

      {selected && <ItemSheet item={selected} onClose={() => setSelected(null)} onAdd={add} />}

      {done && (
        <Modal title="Order placed" onClose={() => setDone(null)} footer={<><Button variant="outline" onClick={() => printReceipt(done.order, { tendered: done.tendered || undefined, change: done.change || undefined })}><Printer size={16} /> Print receipt</Button><Button onClick={() => setDone(null)}>New order</Button></>}>
          <div className="text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-100 text-success-600"><Check size={30} /></span>
            <p className="mt-3 text-sm text-stone-600">Order number</p>
            <p className="text-2xl font-extrabold">{done.order.orderNumber}</p>
            <p className="mt-2 text-3xl font-extrabold text-accent-700">{formatNaira(done.order.total)}</p>
            <p className="mt-1 text-sm text-stone-600">{done.order.payment.status === "paid" ? "Paid" : "Not paid yet"}{done.order.type === "dine_in" && done.order.tableNumber ? ` · Table ${done.order.tableNumber}` : ""}</p>
            {done.change > 0 && <p className="mt-4 rounded-2xl bg-accent-50 p-4 text-lg">Give change: <b className="text-accent-700">{formatNaira(done.change)}</b></p>}
          </div>
        </Modal>
      )}
    </div>
  );
}
