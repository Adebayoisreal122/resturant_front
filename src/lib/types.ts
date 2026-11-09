export type Role = "super_admin" | "branch_manager" | "worker" | "customer" | "rider";

export interface User {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  role: Role;
  workerType?: "cashier" | "waiter" | "kitchen";
  branch?: string | { _id: string; name: string; code: string };
  loyaltyPoints?: number;
  rider?: { vehicle?: string; isOnline?: boolean };
}

export interface DeliveryZone {
  _id?: string;
  name: string;
  fee: number;
  estimatedMinutes: number;
}

export interface Branch {
  _id: string;
  name: string;
  code: string;
  address: string;
  city?: string;
  state?: string;
  phone?: string;
  deliveryZones: DeliveryZone[];
  acceptsDelivery: boolean;
  acceptsDineIn: boolean;
  isActive: boolean;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

export interface Option {
  _id?: string;
  name: string;
  price: number;
}

export interface MenuItem {
  _id: string;
  name: string;
  description?: string;
  category: { _id: string; name: string; slug: string } | string;
  image?: string;
  basePrice: number;
  price?: number; // branch price, when a branch was requested
  variants: Option[];
  addOns: Option[];
  isCombo?: boolean;
  prepMinutes?: number;
  tags: string[];
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled"
  | "refunded";

export type OrderType = "dine_in" | "takeaway" | "delivery";
export type PaymentMethod = "cash" | "transfer" | "pos_terminal" | "card_online" | "pay_on_delivery";

export interface OrderLine {
  name: string;
  unitPrice: number;
  variant?: string;
  addOns: { name: string; price: number }[];
  quantity: number;
  note?: string;
  lineTotal: number;
}

export interface Order {
  _id: string;
  orderNumber: string;
  branch: { _id: string; name: string; code: string; phone?: string } | string;
  type: OrderType;
  items: OrderLine[];
  subtotal: number;
  vat: number;
  deliveryFee: number;
  discount: number;
  total: number;
  status: OrderStatus;
  statusHistory: { status: OrderStatus; at: string }[];
  payment: { method: PaymentMethod; status: "unpaid" | "paid" | "failed" | "refunded"; reference?: string; paidAt?: string };
  delivery?: { address: string; zone: string; phone: string; rider?: { _id: string; name: string; phone: string }; cashCollected?: number };
  tableNumber?: string;
  source?: "online" | "pos";
  createdBy?: string;
  customer?: { _id: string; name: string; phone: string } | string;
  createdAt: string;
}

export interface CreateOrderPayload {
  branch: string;
  type: OrderType;
  items: { menuItem: string; quantity: number; variant?: string; addOns?: string[]; note?: string }[];
  delivery?: { address: string; zone: string; phone: string };
  payment: { method: PaymentMethod };
}

/* ---------- staff / admin ---------- */
export interface OpeningHours {
  day: number; // 0 = Sunday
  open?: string;
  close?: string;
  closed?: boolean;
}

export interface AdminBranch extends Branch {
  manager?: { _id: string; name: string; phone: string } | null;
  openingHours: OpeningHours[];
}

export interface BranchRule {
  branch: string;
  isAvailable: boolean;
  priceOverride?: number | null;
}

export interface AdminMenuItem extends MenuItem {
  isActive: boolean;
  branchAvailability: BranchRule[];
}

export interface StaffUser extends User {
  status: "active" | "suspended";
  rider?: { vehicle?: string; isOnline?: boolean };
  createdAt: string;
}

export interface Breakdown { _id: string; orders: number; revenue: number }

export interface ReportSummary {
  range: { from: string; to: string };
  orders: number;
  sales: number;
  vat: number;
  deliveryFees: number;
  discounts: number;
  revenue: number;
  averageOrderValue: number;
  byPaymentMethod: Breakdown[];
  byType: Breakdown[];
  bySource: Breakdown[];
  orderStatuses: Record<string, number>;
}

/* ---------- POS ---------- */
export interface ShiftTotals { cash: number; transfer: number; pos_terminal: number }

export interface Shift {
  _id: string;
  status: "open" | "closed";
  openedAt: string;
  closedAt?: string;
  openingFloat: number;
  declared: ShiftTotals;
  expected: ShiftTotals;
  variance: ShiftTotals;
  hasVariance: boolean;
  ordersCount: number;
  totalSales: number;
  notes?: string;
  reviewedAt?: string;
  reviewNote?: string;
  cashier?: { _id: string; name: string; workerType?: string } | string;
}

export interface ShiftLive { sales: ShiftTotals; expected: ShiftTotals; ordersCount: number; totalSales: number }

export interface AvailableRider { _id: string; name: string; phone: string; vehicle?: string; activeDeliveries: number }

export interface CashOwed {
  count: number;
  expected: number;
  orders: { _id: string; orderNumber: string; total: number; createdAt: string }[];
}
