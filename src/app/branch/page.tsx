"use client";

import Link from "next/link";
import { Bike, ClipboardCheck, ReceiptText, RotateCcw } from "lucide-react";
import { useBranch } from "@/context/BranchContext";
import { formatNaira } from "@/lib/format";
import ReportView from "@/components/dash/ReportView";
import { buttonClass } from "@/components/ui";

export default function BranchOverview() {
  const { needsReview, cashOwed, refundsDue } = useBranch();
  const items = [
    { show: needsReview > 0, href: "/branch/shifts", icon: ClipboardCheck, tone: "bg-accent-50 border-accent-200 text-accent-700", text: `${needsReview} shift${needsReview > 1 ? "s" : ""} with a cash difference to review` },
    { show: cashOwed > 0, href: "/branch/cash", icon: Bike, tone: "bg-secondary-50 border-secondary-200 text-secondary-700", text: `Riders owe ${formatNaira(cashOwed)} in cash` },
    { show: refundsDue > 0, href: "/branch/refunds", icon: RotateCcw, tone: "bg-primary-50 border-primary-200 text-primary-700", text: `${refundsDue} cancelled order${refundsDue > 1 ? "s" : ""} waiting for a refund` },
  ].filter((i) => i.show);

  return (
    <ReportView
      title="Your branch"
      subtitle="Sales and what needs your attention."
      topSlot={
        <div className="mb-6 space-y-3">
          {items.length > 0 && (
            <div className="grid gap-3 md:grid-cols-3">
              {items.map(({ href, icon: Icon, tone, text }) => (
                <Link key={href} href={href} className={`flex items-center gap-3 rounded-2xl border p-4 font-semibold transition hover:shadow-md ${tone}`}><Icon size={22} className="shrink-0" /> {text}</Link>
              ))}
            </div>
          )}
          <Link href="/pos" className={buttonClass("outline", "md")}><ReceiptText size={16} /> Open the point of sale</Link>
        </div>
      }
    />
  );
}
