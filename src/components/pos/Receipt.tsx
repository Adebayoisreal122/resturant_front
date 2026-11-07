import type { Branch, Order } from "@/lib/types";
import { formatDateTime, formatNaira } from "@/lib/format";
import { APP_NAME } from "@/lib/config";

const METHOD: Record<string, string> = { cash: "Cash", transfer: "Transfer", pos_terminal: "POS", card_online: "Paid online", pay_on_delivery: "Pay on delivery" };

/** Plain, narrow receipt for an 80mm thermal printer (also fine on A4). Only visible when printing. */
export default function Receipt({ order, branch, tendered, change }: { order: Order; branch: Branch | null; tendered?: number; change?: number }) {
  const paid = order.payment.status === "paid";
  return (
    <div id="print-area" className="hidden font-mono text-[11px] leading-snug text-black print:block">
      <div className="text-center">
        <p className="text-sm font-bold uppercase">{APP_NAME}</p>
        {branch && <p>{branch.name}</p>}
        {branch?.address && <p>{branch.address}</p>}
        {branch?.phone && <p>Tel: {branch.phone}</p>}
      </div>
      <hr className="my-1.5 border-dashed border-black" />
      <p>Order: <b>{order.orderNumber}</b></p>
      <p>{formatDateTime(order.createdAt)}</p>
      <p>{order.type === "dine_in" ? `Dine-in${order.tableNumber ? `, table ${order.tableNumber}` : ""}` : order.type === "takeaway" ? "Takeaway" : "Delivery"}</p>
      {order.type === "delivery" && order.delivery && <p>{order.delivery.zone}: {order.delivery.address} ({order.delivery.phone})</p>}
      <hr className="my-1.5 border-dashed border-black" />
      {order.items.map((l, i) => (
        <div key={i} className="mb-1">
          <div className="flex justify-between gap-2"><span>{l.quantity} x {l.name}{l.variant ? ` (${l.variant})` : ""}</span><span>{formatNaira(l.lineTotal)}</span></div>
          {l.addOns.map((a) => <div key={a.name} className="pl-3">+ {a.name}</div>)}
          {l.note && <div className="pl-3">Note: {l.note}</div>}
        </div>
      ))}
      <hr className="my-1.5 border-dashed border-black" />
      <div className="flex justify-between"><span>Subtotal</span><span>{formatNaira(order.subtotal)}</span></div>
      {order.deliveryFee > 0 && <div className="flex justify-between"><span>Delivery</span><span>{formatNaira(order.deliveryFee)}</span></div>}
      {order.vat > 0 && <div className="flex justify-between"><span>VAT</span><span>{formatNaira(order.vat)}</span></div>}
      <div className="flex justify-between text-sm font-bold"><span>TOTAL</span><span>{formatNaira(order.total)}</span></div>
      <hr className="my-1.5 border-dashed border-black" />
      <p>{paid ? `Paid: ${METHOD[order.payment.method] ?? order.payment.method}` : `Payment: ${METHOD[order.payment.method] ?? order.payment.method} (NOT PAID)`}</p>
      {tendered ? <p>Received: {formatNaira(tendered)}</p> : null}
      {change ? <p>Change: {formatNaira(change)}</p> : null}
      <p className="mt-2 text-center">Thank you for dining with us!</p>
    </div>
  );
}
