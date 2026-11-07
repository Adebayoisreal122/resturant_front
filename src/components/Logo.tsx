import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import { APP_NAME } from "@/lib/config";
import { cn } from "@/lib/format";

export default function Logo({ light, className }: { light?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 font-extrabold tracking-tight", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm shadow-primary-600/30">
        <UtensilsCrossed size={20} aria-hidden />
      </span>
      <span className={cn("text-lg", light ? "text-white" : "text-stone-900")}>{APP_NAME}</span>
    </Link>
  );
}
