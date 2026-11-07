// Turns admin form state into the exact bodies the API expects, and checks them first.
// Pure functions (no React), so they can be tested without a browser.

export interface ZoneForm { name: string; fee: string; estimatedMinutes: string }
export interface HoursForm { day: number; open: string; close: string; closed: boolean }
export interface BranchFormState {
  name: string; code: string; address: string; city: string; state: string; phone: string;
  acceptsDelivery: boolean; acceptsDineIn: boolean; zones: ZoneForm[]; hours: HoursForm[];
}

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const defaultHours = (): HoursForm[] => DAY_NAMES.map((_, day) => ({ day, open: "08:00", close: "22:00", closed: false }));

const num = (s: string) => (s.trim() === "" ? NaN : Number(s));

export function validateBranch(f: BranchFormState): string | null {
  if (f.name.trim().length < 2) return "Enter the branch name.";
  if (!/^[A-Za-z0-9]{2,6}$/.test(f.code.trim())) return "Branch code must be 2 to 6 letters or numbers, like IKD. It appears in order numbers.";
  if (f.address.trim().length < 5) return "Enter the branch address.";
  const seen = new Set<string>();
  for (const z of f.zones) {
    const name = z.name.trim();
    if (!name) return "Every delivery area needs a name.";
    if (seen.has(name.toLowerCase())) return `The delivery area "${name}" is listed twice.`;
    seen.add(name.toLowerCase());
    const fee = num(z.fee);
    if (!Number.isFinite(fee) || fee < 0) return `Enter a delivery fee for ${name} (0 or more).`;
    const mins = num(z.estimatedMinutes);
    if (!Number.isFinite(mins) || mins < 1) return `Enter the delivery time in minutes for ${name}.`;
  }
  if (f.acceptsDelivery && f.zones.length === 0) return "Add at least one delivery area, or turn delivery off for this branch.";
  for (const h of f.hours) {
    if (!h.closed && (!h.open || !h.close)) return `Set opening and closing times for ${DAY_NAMES[h.day]}, or mark it closed.`;
  }
  return null;
}

export const branchPayload = (f: BranchFormState) => ({
  name: f.name.trim(),
  code: f.code.trim().toUpperCase(),
  address: f.address.trim(),
  city: f.city.trim() || undefined,
  state: f.state.trim() || undefined,
  phone: f.phone.trim() || undefined,
  acceptsDelivery: f.acceptsDelivery,
  acceptsDineIn: f.acceptsDineIn,
  deliveryZones: f.zones.map((z) => ({ name: z.name.trim(), fee: Number(z.fee), estimatedMinutes: Number(z.estimatedMinutes) })),
  openingHours: f.hours.map((h) => (h.closed ? { day: h.day, closed: true } : { day: h.day, open: h.open, close: h.close, closed: false })),
});

/* ---------- menu ---------- */
export interface OptionForm { name: string; price: string }
export interface RuleForm { enabled: boolean; price: string }
export interface MenuFormState {
  name: string; description: string; category: string; image: string; basePrice: string; prepMinutes: string;
  tags: string[]; isCombo: boolean; variants: OptionForm[]; addOns: OptionForm[]; rules: Record<string, RuleForm>;
}

export function validateMenu(f: MenuFormState): string | null {
  if (f.name.trim().length < 2) return "Enter the dish name.";
  if (!f.category) return "Choose a category.";
  const base = num(f.basePrice);
  if (!Number.isFinite(base) || base < 0) return "Enter a price (0 or more).";
  if (f.image.trim() && !/^https?:\/\//i.test(f.image.trim())) return "The image link must start with http:// or https://";
  for (const [label, list] of [["size/option", f.variants], ["extra", f.addOns]] as const) {
    const seen = new Set<string>();
    for (const o of list) {
      const n = o.name.trim();
      if (!n) return `Every ${label} needs a name.`;
      if (seen.has(n.toLowerCase())) return `The ${label} "${n}" is listed twice.`;
      seen.add(n.toLowerCase());
      const p = num(o.price);
      if (!Number.isFinite(p) || p < 0) return `Enter a price for "${n}".`;
    }
  }
  for (const r of Object.values(f.rules)) {
    if (r.price.trim() !== "" && (!Number.isFinite(num(r.price)) || num(r.price) < 0)) return "A branch price is not a valid amount.";
  }
  return null;
}

export function menuPayload(f: MenuFormState, branchIds: string[]) {
  const hasVariants = f.variants.length > 0;
  // Everything on and no custom prices = "available at every branch" (an empty list), which also covers branches added later
  const allDefault = branchIds.every((id) => {
    const r = f.rules[id];
    return !r || (r.enabled && (hasVariants || r.price.trim() === ""));
  });
  return {
    name: f.name.trim(),
    description: f.description.trim() || undefined,
    category: f.category,
    image: f.image.trim() || undefined,
    basePrice: Number(f.basePrice),
    prepMinutes: f.prepMinutes.trim() ? Number(f.prepMinutes) : 15,
    tags: f.tags,
    isCombo: f.isCombo,
    variants: f.variants.map((v) => ({ name: v.name.trim(), price: Number(v.price) })),
    addOns: f.addOns.map((a) => ({ name: a.name.trim(), price: Number(a.price) })),
    branchAvailability: allDefault
      ? []
      : branchIds.map((id) => {
          const r = f.rules[id] ?? { enabled: true, price: "" };
          const override = !hasVariants && r.price.trim() !== "" ? Number(r.price) : undefined;
          return { branch: id, isAvailable: r.enabled, ...(override !== undefined ? { priceOverride: override } : {}) };
        }),
  };
}

/* ---------- staff ---------- */
export const generatePassword = (length = 10): string => {
  // No look-alike characters (0/O, 1/l/I) so it can be read out over the phone
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
};
