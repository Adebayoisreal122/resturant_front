import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import PWARegister from "@/components/PWARegister";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: { default: `${APP_NAME} | Order food online`, template: `%s | ${APP_NAME}` },
  description: `Order hot, fresh meals from ${APP_NAME} for delivery, pickup or dine-in. Pay online or on delivery.`,
  applicationName: APP_NAME,
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
  icons: { icon: "/icons/favicon-48.png", apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#dc2626",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Providers>
          {children}
          <PWARegister />
        </Providers>
      </body>
    </html>
  );
}
