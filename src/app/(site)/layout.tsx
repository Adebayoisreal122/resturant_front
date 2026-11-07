import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import CartDrawer from "@/components/CartDrawer";
import { IOSInstallSheet } from "@/components/InstallButton";

// The customer-facing shell. Staff dashboards live outside this group and have their own shell.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0">
      <Header />
      <main>{children}</main>
      <Footer />
      <BottomNav />
      <CartDrawer />
      <IOSInstallSheet />
    </div>
  );
}
