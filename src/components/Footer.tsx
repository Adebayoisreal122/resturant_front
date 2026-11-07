import Link from "next/link";
import Logo from "./Logo";
import InstallButton from "./InstallButton";
import { Container } from "./ui";
import { APP_NAME } from "@/lib/config";

export default function Footer() {
  return (
    <footer className="mt-16 bg-stone-900 text-stone-300">
      <Container className="grid gap-8 py-12 md:grid-cols-3">
        <div>
          <Logo light />
          <p className="mt-3 max-w-xs text-sm text-stone-400">Fresh, hot Nigerian meals for delivery, pickup and dining in.</p>
          <InstallButton variant="solid" className="mt-4 !py-2.5 !text-sm" />
        </div>
        <div>
          <h3 className="font-bold text-white">Explore</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-white" href="/menu">Full menu</Link></li>
            <li><Link className="hover:text-white" href="/orders">Track an order</Link></li>
            <li><Link className="hover:text-white" href="/login">Log in or sign up</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-white">Pay your way</h3>
          <p className="mt-3 text-sm text-stone-400">Card, bank transfer or USSD online. Cash on delivery or at pickup.</p>
        </div>
      </Container>
      <div className="border-t border-stone-800 py-4 text-center text-xs text-stone-500">© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</div>
    </footer>
  );
}
