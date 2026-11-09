"use client";

import Link from "next/link";
import { Circle, CircleCheck } from "lucide-react";
import { admin } from "@/lib/adminApi";
import { cn } from "@/lib/format";
import { useApi } from "@/lib/useApi";
import { Card } from "@/components/dash/kit";
import ReportView from "@/components/dash/ReportView";

export default function AdminOverview() {
  const branches = useApi(() => admin.branches.list(), "branches");
  const menu = useApi(() => admin.menu.list(), "menu");
  const staff = useApi(() => admin.users.listStaff(), "staff");
  const branchList = branches.data?.branches ?? [];

  const checklist = [
    { done: branchList.length > 0, label: "Add your first branch", text: "Set its address and the areas you deliver to.", href: "/admin/branches/new" },
    { done: (menu.data?.items.length ?? 0) > 0, label: "Build your menu", text: "Add categories, then dishes with prices.", href: "/admin/menu" },
    { done: (staff.data ?? []).some((u) => u.role !== "super_admin"), label: "Add your team", text: "Managers, cashiers, kitchen staff and riders.", href: "/admin/staff" },
  ];
  const showChecklist = !branches.loading && !menu.loading && !staff.loading && checklist.some((c) => !c.done);

  return (
    <ReportView
      branches={branchList}
      allowCompare
      topSlot={
        showChecklist ? (
          <Card title="Get your restaurant ready" className="mb-6 border-accent-200 bg-accent-50/50">
            <ol className="grid gap-3 md:grid-cols-3">
              {checklist.map((c, i) => (
                <li key={c.label}>
                  <Link href={c.href} className={cn("flex h-full gap-3 rounded-xl border p-4 transition hover:shadow-md", c.done ? "border-success-200 bg-success-50" : "border-stone-200 bg-white")}>
                    {c.done ? <CircleCheck className="mt-0.5 shrink-0 text-success-600" size={22} /> : <Circle className="mt-0.5 shrink-0 text-stone-300" size={22} />}
                    <span><span className="block font-bold">{i + 1}. {c.label}</span><span className="text-sm text-stone-600">{c.text}</span></span>
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
        ) : null
      }
    />
  );
}
