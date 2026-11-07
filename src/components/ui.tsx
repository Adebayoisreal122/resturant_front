import Link from "next/link";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/format";

type Variant = "primary" | "secondary" | "accent" | "success" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-primary-600 text-white hover:bg-primary-700 shadow-sm shadow-primary-600/25",
  secondary: "bg-secondary-600 text-white hover:bg-secondary-700 shadow-sm shadow-secondary-600/25",
  accent: "bg-accent-500 text-white hover:bg-accent-600 shadow-sm shadow-accent-500/25",
  success: "bg-success-600 text-white hover:bg-success-700 shadow-sm shadow-success-600/25",
  outline: "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50",
  ghost: "text-stone-700 hover:bg-stone-100",
};
const sizes: Record<Size, string> = { sm: "px-3 py-1.5 text-sm", md: "px-5 py-2.5 text-sm", lg: "px-6 py-3.5 text-base" };

export const buttonClass = (variant: Variant = "primary", size: Size = "md", extra?: string) =>
  cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    extra
  );

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button className={buttonClass(variant, size, className)} disabled={disabled || loading} {...props}>
      {loading && <LoaderCircle size={16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function LinkButton({ href, variant, size, className, children }: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode }) {
  return <Link href={href} className={buttonClass(variant, size, className)}>{children}</Link>;
}

const tones = {
  primary: "bg-primary-100 text-primary-700",
  secondary: "bg-secondary-100 text-secondary-700",
  accent: "bg-accent-100 text-accent-700",
  success: "bg-success-100 text-success-700",
  neutral: "bg-stone-100 text-stone-700",
};
export function Badge({ tone = "neutral", children, className }: { tone?: keyof typeof tones; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone], className)}>{children}</span>;
}

export const inputClass =
  "w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none transition placeholder:text-stone-400 focus:border-secondary-500 focus:ring-4 focus:ring-secondary-100";

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-stone-800">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-primary-600">{error}</span>}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, props.className)} />;
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-stone-500" role="status">
      <LoaderCircle className="animate-spin text-primary-600" size={22} /> {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mx-auto my-10 flex max-w-md flex-col items-center rounded-2xl border border-primary-200 bg-primary-50 p-6 text-center">
      <TriangleAlert className="text-primary-600" size={28} />
      <p className="mt-2 font-medium text-primary-800">{message}</p>
      {onRetry && <Button variant="primary" size="sm" className="mt-4" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="mx-auto my-12 flex max-w-sm flex-col items-center text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-100 text-accent-600">{icon}</span>
      <h2 className="mt-4 text-lg font-bold">{title}</h2>
      {text && <p className="mt-1 text-stone-600">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}>{children}</div>;
}
