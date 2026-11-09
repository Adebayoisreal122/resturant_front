"use client";

import { useState } from "react";
import { Banknote, Clock, MapPin, Navigation, Phone, Store } from "lucide-react";
import { ApiError } from "@/lib/api";
import { riderApi } from "@/lib/riderApi";
import { cashToCollect, changeToGive, mapsUrl, riderAction, waitingNote } from "@/lib/riderLogic";
import { minutesAgo } from "@/lib/posLogic";
import { formatNaira } from "@/lib/format";
import type { Order } from "@/lib/types";
import { useRider } from "@/context/RiderContext";
import { useToast } from "@/context/ToastContext";
import StatusBadge from "../StatusBadge";
import { Badge, Button, Field, TextInput } from "../ui";
import { Modal } from "../dash/kit";

export default function DeliveryCard({ order }: { order: Order }) {
  const { upsert, refreshCash } = useRider();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [cashModal, setCashModal] = useState(false);
  const [given, setGiven] = useState("");
  const [error, setError] = useState("");

  const d = order.delivery;
  const branch = typeof order.branch === "object" ? order.branch : null;
  const action = riderAction(order);
  const collect = cashToCollect(order);
  const wait = waitingNote(order);

  async function perform(cash?: number) {
    if (!action) return;
    setBusy(true);
    setError("");
    try {
      const r = await riderApi.setStatus(order._id, action.status, cash);
      upsert(r.order);
      if (action.id === "deliver") { toast("Delivery complete. Well done!"); refreshCash(); }
      setCashModal(false);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Couldn't update the delivery.";
      setError(msg);
      toast(msg, "error");
    }
    setBusy(false);
  }

  const onAction = () => (action?.id === "deliver" && collect > 0 ? (setGiven(String(collect)), setCashModal(true)) : perform());
  const g = Number(given);
  const tooLittle = given !== "" && g < collect;

  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div><p className="font-extrabold">{order.orderNumber}</p><p className="flex items-center gap-1 text-xs text-stone-500"><Clock size={12} /> {minutesAgo(order.createdAt)} min ago</p></div>
        <StatusBadge status={order.status} />
      </div>

      {branch && (
        <p className="mt-3 flex items-center gap-2 text-sm text-stone-700"><Store size={16} className="shrink-0 text-primary-600" /> Pick up from <b>{branch.name}</b>
          {branch.phone && <a href={`tel:${branch.phone}`} className="ml-auto font-semibold text-secondary-600">Call</a>}</p>
      )}

      {d && (
        <div className="mt-3 rounded-xl bg-secondary-50 p-3">
          <p className="flex items-start gap-2 text-sm"><MapPin size={16} className="mt-0.5 shrink-0 text-secondary-600" /> <span><b>{d.zone}</b><br />{d.address}</span></p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a href={mapsUrl(d.address, d.zone)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-full bg-secondary-600 py-2.5 text-sm font-bold text-white"><Navigation size={16} /> Navigate</a>
            <a href={`tel:${d.phone}`} className="flex items-center justify-center gap-2 rounded-full bg-white py-2.5 text-sm font-bold text-secondary-700 ring-1 ring-secondary-200"><Phone size={16} /> Call customer</a>
          </div>
        </div>
      )}

      <ul className="mt-3 space-y-0.5 text-sm">{order.items.map((l, i) => <li key={i}><b>{l.quantity}×</b> {l.name}{l.variant ? ` (${l.variant})` : ""}</li>)}</ul>

      {collect > 0 ? (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-accent-100 p-3 text-accent-700">
          <Banknote size={26} className="shrink-0" /><div><p className="text-xs font-bold uppercase tracking-wide">Collect cash</p><p className="text-2xl font-extrabold">{formatNaira(collect)}</p></div>
        </div>
      ) : (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-success-50 p-3 text-sm font-semibold text-success-700"><Badge tone="success">Paid</Badge> Already paid. Don&apos;t collect any money.</p>
      )}

      {wait && <p className="mt-3 rounded-xl bg-stone-100 px-3 py-2.5 text-sm text-stone-600">{wait}</p>}
      {error && !cashModal && <p role="alert" className="mt-3 rounded-xl bg-primary-50 px-3 py-2.5 text-sm font-medium text-primary-700">{error}</p>}
      {action && <Button size="lg" variant={action.id === "deliver" ? "success" : "secondary"} className="mt-3 w-full" loading={busy && !cashModal} onClick={onAction}>{action.label}</Button>}

      {cashModal && (
        <Modal title="Cash collected" onClose={() => setCashModal(false)} footer={<><Button variant="outline" onClick={() => setCashModal(false)}>Back</Button><Button variant="success" loading={busy} disabled={tooLittle || given === ""} onClick={() => perform(g)}>Confirm delivery</Button></>}>
          <p className="text-center text-sm text-stone-600">Order total</p>
          <p className="text-center text-4xl font-extrabold text-accent-700">{formatNaira(collect)}</p>
          <div className="mt-5"><Field label="How much did the customer give you?"><TextInput inputMode="numeric" value={given} onChange={(e) => setGiven(e.target.value.replace(/[^\d.]/g, ""))} /></Field></div>
          {tooLittle && <p className="mt-2 text-sm font-medium text-primary-600">That is less than the total. Collect {formatNaira(collect - g)} more.</p>}
          {changeToGive(collect, g) > 0 && <p className="mt-3 rounded-xl bg-accent-50 p-3 text-center text-lg">Give change: <b className="text-accent-700">{formatNaira(changeToGive(collect, g))}</b></p>}
          <p className="mt-3 text-xs text-stone-500">You hand the order total ({formatNaira(collect)}) to your branch manager. Change you give out comes from what the customer handed you.</p>
          {error && <p role="alert" className="mt-3 rounded-xl bg-primary-50 px-3 py-2.5 text-sm font-medium text-primary-700">{error}</p>}
        </Modal>
      )}
    </article>
  );
}
