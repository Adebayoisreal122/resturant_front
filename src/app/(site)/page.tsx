import Link from "next/link";
import { ArrowRight, Flame, Store, Truck, Wallet } from "lucide-react";
import InstallButton from "@/components/InstallButton";
import InstallPromo from "@/components/InstallPromo";
import { BranchList, PopularDishes } from "@/components/HomeSections";
import { Container } from "@/components/ui";
import { APP_NAME } from "@/lib/config";
import Image from "next/image";

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

<section className="relative isolate overflow-hidden bg-gradient-to-br from-primary-950 via-primary-800 to-primary-600 text-white">

  {/* Animated background decorations */}
<div className="hero-glow hero-glow-one" aria-hidden="true" />
<div className="hero-glow hero-glow-two" aria-hidden="true" />

<div
  className="pointer-events-none absolute inset-0 z-0"
  aria-hidden="true"
  style={{
    background:
      "radial-gradient(circle at 70% 50%, rgba(255,255,255,0.10), transparent 45%)"
  }}
/>

  <Container className="relative z-10 grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-2 lg:py-24">

    {/* LEFT: Hero content */}
    <div className="hero-content relative z-10">

      <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur-md">
        <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
        Taking orders now
      </span>

      <h1 className="mt-6 max-w-xl text-4xl font-extrabold leading-[1.1] sm:text-5xl lg:text-6xl">
        Hot Nigerian meals,
        <span className="mt-2 block text-accent-300">
          brought to you.
        </span>
      </h1>

      <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/75">
        Order from {APP_NAME} for delivery, pickup or dine-in.
        Enjoy freshly prepared meals delivered straight to your door.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-4">

        <Link
          href="/menu"
          className="group inline-flex items-center gap-3 rounded-full bg-accent-500 px-8 py-4 font-bold text-white shadow-xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:bg-accent-600"
        >
          Order now
          <ArrowRight
            size={19}
            className="transition-transform group-hover:translate-x-1"
          />
        </Link>

        <InstallButton variant="hero" />

      </div>

      <div className="mt-9 flex flex-wrap gap-6 text-sm text-white/70">
        <span>✓ Freshly prepared</span>
        <span>✓ Fast delivery</span>
        <span>✓ Easy payment</span>
      </div>

    </div>

    {/* RIGHT: Animated food image */}
    <div className="relative mx-auto w-full max-w-lg">

      {/* Background glowing circle */}
     <div className="absolute inset-8 rounded-full bg-accent-500/30 blur-3xl animate-pulse" />

      {/* Decorative circle */}
      <div className="absolute inset-5 rounded-full border border-white/15" />

      <div className="hero-food relative z-10 aspect-square">

        <Image
          src="/images/restaurant-hero.png"
          alt="Delicious freshly prepared Nigerian food"
          fill
          priority
          sizes="(max-width: 768px) 90vw, 45vw"
          className="object-contain drop-shadow-2xl"
        />

      </div>

      {/* Floating food badge */}
      <div className="hero-badge absolute -left-2 top-12 z-20 rounded-2xl border border-white/20 bg-white/95 p-4 text-stone-900 shadow-2xl sm:-left-8">

        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-2xl">
            🔥
          </span>

          <div>
            <p className="font-bold">Fresh & Hot</p>
            <p className="text-xs text-stone-500">
              Made with love
            </p>
          </div>
        </div>

      </div>

      {/* Floating delivery badge */}
      <div className="hero-delivery absolute -bottom-2 right-0 z-20 rounded-2xl border border-white/20 bg-white/95 p-4 text-stone-900 shadow-2xl sm:-right-6">

        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-2xl">
            🛵
          </span>

          <div>
            <p className="font-bold">Fast Delivery</p>
            <p className="text-xs text-stone-500">
              Right to your doorstep
            </p>
          </div>
        </div>

      </div>

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
