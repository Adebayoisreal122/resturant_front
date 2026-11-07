"use client";

import { useState } from "react";
import { Bike } from "lucide-react";
import { ApiError } from "@/lib/api";
import { staffApi } from "@/lib/staffApi";
import { useApi } from "@/lib/useApi";
import type { Order } from "@/lib/types";
import { useToast } from "@/context/ToastContext";
import { usePos } from "@/context/PosContext";
import { Button, ErrorState, Spinner } from "../ui";
import { Modal } from "../dash/kit";

export default function AssignRiderModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const { toast } = useToast();
  const { upsert } = usePos();
  const riders = useApi(() => staffApi.riders.available(), "riders");
  const [busy, setBusy] = useState<string | null>(null);

  async function assign(id: string) {
    setBusy(id);
    try {
      const r = await staffApi.orders.assignRider(order._id, id);
      upsert(r.order);
      toast("Rider assigned");
      onClose();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't assign the rider", "error");
      setBusy(null);
    }
  }

  return (
    <Modal title={`Assign a rider · ${order.orderNumber}`} onClose={onClose}>
      {riders.loading ? <Spinner /> : riders.error ? <ErrorState message={riders.error} onRetry={() => riders.reload()} /> : (riders.data?.riders.length ?? 0) === 0 ? (
        <div className="py-6 text-center"><Bike size={32} className="mx-auto text-stone-300" /><p className="mt-2 font-semibold">No riders are online</p><p className="text-sm text-stone-500">Riders switch themselves online in their app.</p><Button variant="outline" size="sm" className="mt-3" onClick={() => riders.reload()}>Check again</Button></div>
      ) : (
        <ul className="space-y-2">
          {riders.data!.riders.slice().sort((a, b) => a.activeDeliveries - b.activeDeliveries).map((r) => (
            <li key={r._id} className="flex items-center gap-3 rounded-xl border border-stone-200 p-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success-100 text-success-700"><Bike size={20} /></span>
              <div className="min-w-0 flex-1"><p className="font-bold">{r.name}</p><p className="text-sm text-stone-500">{r.activeDeliveries === 0 ? "Free now" : `${r.activeDeliveries} active delivery${r.activeDeliveries > 1 ? "ies" : ""}`}{r.vehicle ? ` · ${r.vehicle}` : ""}</p></div>
              <Button size="sm" variant="secondary" loading={busy === r._id} onClick={() => assign(r._id)}>Assign</Button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
