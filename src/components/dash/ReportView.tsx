"use client";

import { useState, type ReactNode } from "react";
import { Banknote, Receipt, ShoppingBag, TrendingUp } from "lucide-react";
import { admin } from "@/lib/adminApi";
import { lagosDaysAgo, lagosToday, shortDay } from "@/lib/dates";
import { cn, formatNaira } from "@/lib/format";
import { useApi } from "@/lib/useApi";
import type { AdminBranch } from "@/lib/types";
import { Card, PageHeader, StatCard, selectClass } from "@/components/dash/kit";
import { ErrorState, Spinner } from "@/components/ui";

const PRESETS = [
  { id: "today", label: "Today", days: 0 },
  { id: "7d", label: "7 days", days: 6 },
  { id: "30d", label: "30 days", days: 29 },
] as const;

const METHOD_LABEL: Record<string, string> = { cash: "Cash", transfer: "Bank transfer", pos_terminal: "POS terminal", card_online: "Online (card/bank/USSD)", pay_on_delivery: "Pay on delivery" };
const METHOD_COLOR: Record<string, string> = { cash: "bg-success-600", transfer: "bg-secondary-600", pos_terminal: "bg-secondary-500", card_online: "bg-primary-600", pay_on_delivery: "bg-accent-500" };
const TYPE_LABEL: Record<string, string> = { delivery: "Delivery", takeaway: "Takeaway", dine_in: "Dine-in" };

/** Revenue report used by the admin (any branch) and the branch manager (own branch only). */
export default function ReportView({ title = "Overview", subtitle = "How the restaurant is doing.", branches, allowCompare, topSlot }: { title?: string; subtitle?: string; branches?: AdminBranch[]; allowCompare?: boolean; topSlot?: ReactNode }) {
  const [preset, setPreset] = useState<(typeof PRESETS)[number]["id"]>("today");
  const [branch, setBranch] = useState("");
  const days = PRESETS.find((p) => p.id === preset)!.days;
  const from = lagosDaysAgo(days);
  const to = lagosToday();
  const b = branch || undefined;
  const key = `${from}|${to}|${branch}`;

  const summary = useApi(() => admin.reports.summary(from, to, b), key);
  const daily = useApi(() => admin.reports.daily(from, to, b), key);
  const top = useApi(() => admin.reports.topItems(from, to, b), key);
  const compare = useApi(() => admin.reports.branches(from, to), allowCompare ? `cmp|${from}|${to}` : null);

  const branchList = branches ?? [];
  const s = summary.data;
  const maxDay = Math.max(1, ...(daily.data?.days ?? []).map((d) => d.revenue));

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <>
            <div className="inline-flex rounded-full bg-stone-100 p-1">
              {PRESETS.map((p) => (
                <button key={p.id} onClick={() => setPreset(p.id)} className={cn("rounded-full px-4 py-1.5 text-sm font-semibold transition", preset === p.id ? "bg-white text-primary-700 shadow-sm" : "text-stone-600")}>{p.label}</button>
              ))}
            </div>
            {branchList.length > 1 && (
              <select value={branch} onChange={(e) => setBranch(e.target.value)} aria-label="Branch" className={cn(selectClass, "!w-auto !py-2 text-sm font-semibold")}>
                <option value="">All branches</option>
                {branchList.map((x) => <option key={x._id} value={x._id}>{x.name}</option>)}
              </select>
            )}
          </>
        }
      />
      {topSlot}
      {summary.loading ? <Spinner /> : summary.error || !s ? <ErrorState message={summary.error || "Couldn't load the report"} onRetry={() => summary.reload()} /> : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Revenue" value={formatNaira(s.revenue)} hint="Paid orders, incl. VAT and delivery" icon={<Banknote size={18} />} tone="success" />
            <StatCard label="Orders" value={String(s.orders)} hint="Paid, not cancelled" icon={<ShoppingBag size={18} />} tone="secondary" />
            <StatCard label="Average order" value={formatNaira(s.averageOrderValue)} icon={<TrendingUp size={18} />} tone="accent" />
            <StatCard label="VAT collected" value={formatNaira(s.vat)} hint={`Food sales ${formatNaira(s.sales)}`} icon={<Receipt size={18} />} tone="primary" />
          </div>

          <Card title="Orders by status">
            {Object.keys(s.orderStatuses).length === 0 ? <p className="text-stone-500">No orders in this period yet.</p> : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(s.orderStatuses).map(([k, v]) => (
                  <span key={k} className={cn("rounded-full px-3 py-1.5 text-sm font-semibold", k === "pending" ? "bg-accent-100 text-accent-700" : k === "cancelled" ? "bg-primary-100 text-primary-700" : k === "delivered" || k === "completed" ? "bg-success-100 text-success-700" : "bg-secondary-100 text-secondary-700")}>
                    {v} {k.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            )}
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Revenue by day">
              {!daily.data || daily.data.days.length === 0 ? <p className="text-stone-500">Nothing to show yet.</p> : (
                <div className="flex h-44 items-end gap-2" role="img" aria-label="Revenue per day">
                  {daily.data.days.map((d) => (
                    <div key={d._id} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${shortDay(d._id)}: ${formatNaira(d.revenue)} from ${d.orders} orders`}>
                      <div className="w-full rounded-t-lg bg-secondary-600" style={{ height: `${Math.max(4, (d.revenue / maxDay) * 100)}%` }} />
                      <span className="text-[10px] text-stone-500">{shortDay(d._id)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="How customers paid">
              {s.byPaymentMethod.length === 0 ? <p className="text-stone-500">No payments yet.</p> : (
                <ul className="space-y-3">
                  {s.byPaymentMethod.map((m) => (
                    <li key={m._id}>
                      <div className="flex justify-between text-sm"><span className="font-semibold">{METHOD_LABEL[m._id] ?? m._id}</span><span>{formatNaira(m.revenue)} <span className="text-stone-500">({m.orders})</span></span></div>
                      <div className="mt-1 h-2 rounded-full bg-stone-100"><div className={cn("h-2 rounded-full", METHOD_COLOR[m._id] ?? "bg-stone-400")} style={{ width: `${(m.revenue / (s.revenue || 1)) * 100}%` }} /></div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Best sellers">
              {!top.data || top.data.items.length === 0 ? <p className="text-stone-500">No sales yet.</p> : (
                <ol className="space-y-2">
                  {top.data.items.map((i, n) => (
                    <li key={i._id} className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-100 text-sm font-bold text-accent-700">{n + 1}</span>
                      <span className="min-w-0 flex-1 truncate font-semibold">{i._id}</span>
                      <span className="text-sm text-stone-600">{i.quantity} sold</span>
                      <span className="w-24 text-right text-sm font-bold">{formatNaira(i.sales)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            <Card title="Order types">
              {s.byType.length === 0 ? <p className="text-stone-500">No orders yet.</p> : (
                <ul className="space-y-2">
                  {s.byType.map((t) => (
                    <li key={t._id} className="flex items-center justify-between rounded-xl bg-stone-50 px-4 py-3">
                      <span className="font-semibold">{TYPE_LABEL[t._id] ?? t._id}</span>
                      <span className="text-sm text-stone-600">{t.orders} orders · <b className="text-stone-900">{formatNaira(t.revenue)}</b></span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {allowCompare && !branch && (compare.data?.branches.length ?? 0) > 1 && (
            <Card title="Branch comparison">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-stone-500"><tr><th className="pb-2 font-semibold">Branch</th><th className="pb-2 text-right font-semibold">Orders</th><th className="pb-2 text-right font-semibold">Revenue</th></tr></thead>
                  <tbody className="divide-y divide-stone-100">
                    {compare.data!.branches.map((r) => (
                      <tr key={r.branch._id}><td className="py-2.5 font-semibold">{r.branch.name}</td><td className="py-2.5 text-right">{r.orders}</td><td className="py-2.5 text-right font-bold">{formatNaira(r.revenue)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
