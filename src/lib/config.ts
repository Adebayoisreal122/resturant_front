export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Naija Kitchen";
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";
export const VAT_RATE = Number(process.env.NEXT_PUBLIC_VAT_RATE ?? 0.075);
export const VAT_MODE = (process.env.NEXT_PUBLIC_VAT_MODE || "exclusive") as "exclusive" | "inclusive" | "none";
