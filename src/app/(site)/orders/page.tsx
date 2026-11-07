"use client";

import Link from "next/link";
import { ChevronRight, ClipboardList } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { formatDateTime, formatNaira } from "@/lib/format";
import RequireAuth from "@/components/RequireAuth";
import StatusBadge from "@/components/StatusBadge";
import { Container, EmptyState, ErrorState, LinkButton, Spinner } from "@/components/ui";

export default function OrdersPage() {
  return (
    <Container className="max-w-3xl py-8">
      <h1 className="text-3xl font-extrabold">My orders</h1>
      <RequireAuth message="Log in to see your orders.">
        <OrderList />
      </RequireAuth>
    </Container>
  );
}

function OrderList() {
  const { data, loading, error, reload } = useApi(() => api.orders.list(), "orders");
  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={() => reload()} />;
  const orders = data?.orders ?? [];
  if (orders.length === 0)
    return <EmptyState icon={<ClipboardList size={28} />} title="No orders yet" text="When you order, it will show up here." action={<LinkButton href="/menu">Order something</LinkButton>} />;

  return (
    <ul className="mt-6 space-y-3">
      {orders.map((o) => (
        <li key={o._id}>
          <Link href={`/orders/${o._id}`} className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-primary-200 hover:shadow-md">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold">{o.orderNumber}</p>
                <StatusBadge status={o.status} />
              </div>
              <p className="mt-1 truncate text-sm text-stone-600">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</p>
              <p className="mt-0.5 text-xs text-stone-500">{formatDateTime(o.createdAt)}</p>
            </div>
            <p className="font-extrabold text-accent-700">{formatNaira(o.total)}</p>
            <ChevronRight size={18} className="text-stone-400" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
