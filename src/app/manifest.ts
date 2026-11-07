import type { MetadataRoute } from "next";
import { APP_NAME } from "@/lib/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME.length > 12 ? APP_NAME.split(" ")[0] : APP_NAME,
    description: `Order delicious meals from ${APP_NAME}: delivery, pickup and dine-in.`,
    id: "/",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fffdfb",
    theme_color: "#dc2626",
    categories: ["food", "shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Order food", short_name: "Menu", url: "/menu", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "My orders", short_name: "Orders", url: "/orders", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
