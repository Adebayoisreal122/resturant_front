import { VAT_MODE, VAT_RATE } from "./config";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// Mirrors the backend so customers see a close estimate. The server's total is the one that counts.
export function estimateTotals(subtotal: number, deliveryFee = 0) {
  let vat = 0;
  let total = subtotal + deliveryFee;
  if (VAT_MODE === "exclusive") {
    vat = round2(subtotal * VAT_RATE);
    total = round2(subtotal + vat + deliveryFee);
  } else if (VAT_MODE === "inclusive") {
    vat = round2(subtotal - subtotal / (1 + VAT_RATE));
    total = round2(subtotal + deliveryFee);
  }
  return { subtotal: round2(subtotal), vat, deliveryFee, total };
}
