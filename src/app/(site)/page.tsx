import Link from "next/link";
import { ArrowRight, Flame, Store, Truck, Wallet } from "lucide-react";
import InstallButton from "@/components/InstallButton";
import InstallPromo from "@/components/InstallPromo";
import { BranchList, PopularDishes } from "@/components/HomeSections";
import { Container } from "@/components/ui";
import { APP_NAME } from "@/lib/config";

const features = [
  { icon: Truck, title: "Fast delivery", text: "Hot food brought to your door by our own riders.", tone: "bg-secondary-100 text-secondary-700" },
  { icon: Flame, title: "Fresh and hot", text: "Cooked when you order, never left sitting.", tone: "bg-primary-100 text-primary-700" },
  { icon: Wallet, title: "Pay your way", text: "Card, transfer or USSD online. Or cash on delivery.", tone: "bg-accent-100 text-accent-700" },
  { icon: Store, title: "Pickup or dine in", text: "Skip the queue. Order ahead and collect.", tone: "bg-success-100 text-success-700" },
];

const steps = [
  { n: 1, title: "Choose your branch", text: "Pick the location nearest to you and browse its menu.", tone: "bg-primary-600" },
  { n: 2, title: "Add your meals", text: "Customise sizes and extras, then check out in a minute.", tone: "bg-accent-500" },
  { n: 3, title: "Track and enjoy", text: "Watch your order move from kitchen to your door, live.", tone: "bg-success-600" },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-800 via-primary-600 to-accent-500 text-white">
        <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/10" aria-hidden />
        <div className="absolute -bottom-24 right-10 h-80 w-80 rounded-full bg-accent-500/30" aria-hidden />
        <Container className="relative grid items-center gap-10 py-14 sm:py-20 md:grid-cols-[1.2fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
              <span className="h-2 w-2 rounded-full bg-success-500" /> Taking orders now
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] sm:text-5xl lg:text-6xl">Hot Nigerian meals, brought to you.</h1>
            <p className="mt-4 max-w-xl text-lg text-primary-100">Order from {APP_NAME} for delivery, pickup or dine-in. Pay online or when your food arrives.</p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/menu" className="inline-flex items-center gap-2 rounded-full bg-accent-500 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-black/20 transition hover:bg-accent-600 active:scale-95">
                Order now <ArrowRight size={18} />
              </Link>
              <InstallButton variant="hero" />
            </div>
          </div>
          <div className="hidden gap-3 md:grid">
            {features.slice(0, 3).map(({ icon: Icon, title, text, tone }) => (
              <div key={title} className="flex items-center gap-4 rounded-2xl bg-white/95 p-4 text-stone-900 shadow-lg">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon size={24} /></span>
                <div><p className="font-bold">{title}</p><p className="text-sm text-stone-600">{text}</p></div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <Container className="mt-10 md:hidden">
        <div className="grid grid-cols-2 gap-3">
          {features.map(({ icon: Icon, title, tone }) => (
            <div key={title} className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon size={20} /></span>
              <p className="text-sm font-bold leading-tight">{title}</p>
            </div>
          ))}
        </div>
      </Container>

      <PopularDishes />

      <section className="mt-16">
        <Container>
          <h2 className="text-2xl font-extrabold sm:text-3xl">How it works</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <span className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-extrabold text-white ${s.tone}`}>{s.n}</span>
                <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                <p className="mt-1 text-stone-600">{s.text}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <BranchList />
      <InstallPromo />
    </>
  );
}
