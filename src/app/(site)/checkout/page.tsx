"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Banknote, CreditCard, MapPin, ShoppingBag, Store, Truck } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { estimateTotals } from "@/lib/pricing";
import { cn, formatNaira, isValidNgPhone, normalizePhone } from "@/lib/format";
import type { CreateOrderPayload, PaymentMethod } from "@/lib/types";
import { lineUnitTotal, useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import RequireAuth from "@/components/RequireAuth";
import { Button, Container, EmptyState, Field, LinkButton, Spinner, TextInput, inputClass } from "@/components/ui";

export default function CheckoutPage() {
  return (
    <Container className="max-w-5xl py-8">
      <h1 className="text-3xl font-extrabold">Checkout</h1>
      <RequireAuth message="Log in or create an account to place your order.">
        <CheckoutForm />
      </RequireAuth>
    </Container>
  );
}

function CheckoutForm() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const cart = useCart();
  const branches = useApi(() => api.branches.list(), "branches");
  const branch = branches.data?.branches.find((b) => b._id === cart.branchId);

  const canDeliver = !!branch?.acceptsDelivery && (branch?.deliveryZones.length ?? 0) > 0;
  const type = cart.orderType === "delivery" && !canDeliver ? "takeaway" : cart.orderType;

  const [zone, setZone] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [method, setMethod] = useState<PaymentMethod>("card_online");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Make sure the chosen payment method is valid for the order type
  useEffect(() => {
    const allowed: PaymentMethod[] = type === "delivery" ? ["card_online", "pay_on_delivery"] : ["card_online", "cash"];
    if (!allowed.includes(method)) setMethod("card_online");
  }, [type, method]);

  const zoneObj = branch?.deliveryZones.find((z) => z.name === zone);
  const totals = useMemo(() => estimateTotals(cart.subtotal, type === "delivery" ? zoneObj?.fee ?? 0 : 0), [cart.subtotal, type, zoneObj]);

  if (!cart.hydrated || branches.loading) return <Spinner />;
  if (cart.lines.length === 0)
    return <EmptyState icon={<ShoppingBag size={28} />} title="Your cart is empty" text="Add a few dishes first." action={<LinkButton href="/menu">Browse menu</LinkButton>} />;
  if (!branch)
    return <EmptyState icon={<Store size={28} />} title="Choose a branch" text="Pick where you want to order from." action={<LinkButton href="/menu">Choose branch</LinkButton>} />;

  async function placeOrder() {
    setError("");
    if (!branch) return;
    if (type === "delivery") {
      if (!zone) return setError("Choose your delivery area.");
      if (address.trim().length < 5) return setError("Enter your full delivery address.");
      if (!isValidNgPhone(phone)) return setError("Enter a phone number the rider can call.");
    }
    const payload: CreateOrderPayload = {
      branch: branch._id,
      type,
      items: cart.lines.map((l) => ({ menuItem: l.menuItem, quantity: l.quantity, variant: l.variant, addOns: l.addOns.map((a) => a.name), note: l.note })),
      payment: { method },
      ...(type === "delivery" ? { delivery: { address: address.trim(), zone, phone: normalizePhone(phone) } } : {}),
    };

    setBusy(true);
    try {
      const { order } = await api.orders.create(payload);
      cart.clear();
      if (method === "card_online") {
        try {
          const { authorizationUrl } = await api.payments.initialize(order._id);
          window.location.href = authorizationUrl;
          return;
        } catch (err) {
          toast(err instanceof ApiError ? err.message : "Couldn't open the payment page. You can pay from your order.", "error");
        }
      }
      router.push(`/orders/${order._id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't place your order. Please try again.");
      setBusy(false);
    }
  }

  const options: { value: PaymentMethod; title: string; text: string; icon: typeof CreditCard }[] = [
    { value: "card_online", title: "Pay online", text: "Card, bank transfer or USSD", icon: CreditCard },
    type === "delivery"
      ? { value: "pay_on_delivery", title: "Pay on delivery", text: "Cash to the rider", icon: Banknote }
      : { value: "cash", title: "Pay at pickup", text: "Cash, transfer or POS at the counter", icon: Banknote },
  ];

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-bold">How do you want your order?</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {([["delivery", "Delivery", Truck], ["takeaway", "Pickup", Store]] as const).map(([val, label, Icon]) => {
              const disabled = val === "delivery" && !canDeliver;
              return (
                <button key={val} type="button" disabled={disabled} onClick={() => cart.setOrderType(val)}
                  className={cn("flex flex-col items-center gap-1 rounded-xl border-2 p-4 font-semibold transition disabled:opacity-40", type === val ? (val === "delivery" ? "border-secondary-600 bg-secondary-50 text-secondary-700" : "border-success-600 bg-success-50 text-success-700") : "border-stone-200")}>
                  <Icon size={24} /> {label}
                  {disabled && <span className="text-xs font-normal">Not available here</span>}
                </button>
              );
            })}
          </div>

          {type === "delivery" ? (
            <div className="mt-5 space-y-4">
              <Field label="Delivery area">
                <select value={zone} onChange={(e) => setZone(e.target.value)} className={inputClass}>
                  <option value="">Select your area</option>
                  {branch.deliveryZones.map((z) => <option key={z.name} value={z.name}>{z.name} · {formatNaira(z.fee)} · about {z.estimatedMinutes} min</option>)}
                </select>
              </Field>
              <Field label="Full address" hint="House number, street and a landmark help the rider find you.">
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} maxLength={250} className={inputClass} placeholder="e.g. 12 Adeoye Street, near the filling station" />
              </Field>
              <Field label="Phone for the rider">
                <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" placeholder="0803 123 4567" />
              </Field>
            </div>
          ) : (
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-success-50 p-3 text-sm text-success-700"><MapPin size={18} className="mt-0.5 shrink-0" /> Collect from {branch.name}, {branch.address}. We'll have it ready when you arrive.</p>
          )}
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-bold">Payment</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {options.map(({ value, title, text, icon: Icon }) => (
              <button key={value} type="button" onClick={() => setMethod(value)}
                className={cn("flex items-center gap-3 rounded-xl border-2 p-4 text-left transition", method === value ? "border-accent-500 bg-accent-50" : "border-stone-200")}>
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", method === value ? "bg-accent-500 text-white" : "bg-stone-100 text-stone-600")}><Icon size={20} /></span>
                <span><span className="block font-bold">{title}</span><span className="text-sm text-stone-600">{text}</span></span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-5 lg:sticky lg:top-24">
        <h2 className="text-lg font-bold">Order summary</h2>
        <ul className="mt-3 divide-y divide-stone-100 text-sm">
          {cart.lines.map((l) => (
            <li key={l.key} className="flex justify-between gap-3 py-2.5">
              <span><b>{l.quantity}×</b> {l.name}{(l.variant || l.addOns.length > 0) && <span className="block text-stone-500">{[l.variant, ...l.addOns.map((a) => `+ ${a.name}`)].filter(Boolean).join(", ")}</span>}</span>
              <span className="shrink-0 font-semibold">{formatNaira(lineUnitTotal(l) * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1.5 border-t border-stone-200 pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-stone-600">Subtotal</dt><dd>{formatNaira(totals.subtotal)}</dd></div>
          {type === "delivery" && <div className="flex justify-between"><dt className="text-stone-600">Delivery</dt><dd>{zone ? formatNaira(totals.deliveryFee) : "Choose area"}</dd></div>}
          {totals.vat > 0 && <div className="flex justify-between"><dt className="text-stone-600">VAT</dt><dd>{formatNaira(totals.vat)}</dd></div>}
          <div className="flex justify-between pt-2 text-lg font-extrabold"><dt>Total</dt><dd className="text-accent-700">{formatNaira(totals.total)}</dd></div>
        </dl>
        <p className="mt-2 text-xs text-stone-500">The final total is confirmed by the restaurant when you place the order.</p>

        {error && <p role="alert" className="mt-4 rounded-xl bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700">{error}</p>}
        <Button size="lg" className="mt-4 w-full" loading={busy} onClick={placeOrder}>{method === "card_online" ? "Place order and pay" : "Place order"}</Button>
        <Link href="/menu" className="mt-3 block text-center text-sm font-semibold text-secondary-600 hover:underline">Add more items</Link>
      </aside>
    </div>
  );
}
