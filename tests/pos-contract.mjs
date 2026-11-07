// Runs the POS screens' real API calls and button logic against a LIVE backend + MongoDB.
// Usage: API_URL=... ADMIN_PHONE=... ADMIN_PASSWORD=... npm run test:contract:pos
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.window = { dispatchEvent() {} };
const m = await import("./.build/contract.mjs");
const { admin, api, tokens, staffApi, request } = m;

let pass = 0, fail = 0;
const ok = (c, name, extra) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${c ? "" : "  -> " + JSON.stringify(extra)}`); };
const rejects = async (p) => { try { await p; return null; } catch (e) { return e; } };
const as = async (phone, password) => { const r = await api.auth.login({ phone, password }); tokens.set({ accessToken: r.accessToken, refreshToken: r.refreshToken }); return r.user; };
const ids = (acts) => acts.map((a) => a.id).join(",");
const run = Date.now().toString().slice(-5);
const pw = "Passw0rd!x";

/* ---------- pure helpers ---------- */
ok(m.changeDue(4300, 5000) === 700 && m.changeDue(4300, 4300) === 0 && m.changeDue(4300, 4000) === 0, "changeDue");
ok(m.minutesAgo(new Date(Date.now() - 125000).toISOString()) === 2, "minutesAgo");
ok(m.ageTone(3) === "success" && m.ageTone(12) === "accent" && m.ageTone(25) === "primary", "ageTone thresholds");
const dl = { menuItem: "x", quantity: 1, unitPrice: 1, addOns: [] };
ok(/at least one/.test(m.validateDraft({ type: "dine_in", table: "", lines: [], zone: "", address: "", phone: "", method: "cash", paidNow: true }, true)), "empty order rejected");
ok(/area/.test(m.validateDraft({ type: "delivery", table: "", lines: [dl], zone: "", address: "x", phone: "", method: "pay_on_delivery", paidNow: false }, true)), "delivery needs an area");
ok(/phone/i.test(m.validateDraft({ type: "delivery", table: "", lines: [dl], zone: "A", address: "12 Long Street", phone: "123", method: "pay_on_delivery", paidNow: false }, true)), "delivery needs a valid phone");
ok(m.validateDraft({ type: "delivery", table: "", lines: [dl], zone: "A", address: "12 Long Street", phone: "0803 123 4567", method: "pay_on_delivery", paidNow: false }, true) === null, "valid delivery draft passes");
ok(/only applies/.test(m.validateDraft({ type: "takeaway", table: "", lines: [dl], zone: "", address: "", phone: "", method: "pay_on_delivery", paidNow: false }, true)), "pay on delivery only for delivery");

/* ---------- setup through the real admin API ---------- */
await as(process.env.ADMIN_PHONE, process.env.ADMIN_PASSWORD);
const branch = (await admin.branches.create({ name: "POS Test " + run, code: "P" + run, address: "1 Counter Road", acceptsDelivery: true, acceptsDineIn: true, deliveryZones: [{ name: "Bodija", fee: 1000, estimatedMinutes: 30 }] })).branch;
const cat = (await admin.categories.create({ name: "Rice " + run })).category;
const jollof = (await admin.menu.create({ name: "Jollof", category: cat._id, basePrice: 2500, variants: [{ name: "Regular", price: 2500 }, { name: "Large", price: 3500 }], addOns: [{ name: "Chicken", price: 1500 }] })).item;
const zobo = (await admin.menu.create({ name: "Zobo", category: cat._id, basePrice: 800 })).item;
const mk = async (role, i, extra = {}) => { const phone = `0809${run}0${i}`; await admin.users.create({ name: role + i, phone, password: pw, role, branch: branch._id, ...extra }); return phone; };
const cashierP = await mk("worker", 1, { workerType: "cashier" });
const kitchenP = await mk("worker", 2, { workerType: "kitchen" });
const riderP = await mk("rider", 3, { vehicle: "bike" });
const mgrP = await mk("branch_manager", 4);
const custP = `0808${run}09`;
const cust = await api.auth.register({ name: "Customer " + run, phone: custP, password: pw });

/* ---------- cashier: money needs a shift ---------- */
const cashier = await as(cashierP, pw);
ok(cashier.workerType === "cashier" && cashier.role === "worker", "cashier logs in");
const draft = (o = {}) => ({ type: "dine_in", table: "4", lines: [{ menuItem: zobo._id, quantity: 3, unitPrice: 800, addOns: [] }], zone: "", address: "", phone: "", method: "cash", paidNow: true, ...o });
const noShift = await rejects(staffApi.orders.create(m.buildOrderPayload(draft(), m.normalizePhone)));
ok(noShift && noShift.status === 409 && /shift/i.test(noShift.message), "taking payment without a shift is refused (the screen warns first)", noShift?.message);
const unpaidNoShift = await staffApi.orders.create(m.buildOrderPayload(draft({ paidNow: false }), m.normalizePhone));
ok(unpaidNoShift.order.payment.status === "unpaid" && unpaidNoShift.order.status === "confirmed", "an unpaid dine-in order can be placed without a shift");
const sh = await staffApi.shifts.open(5000);
ok(sh.shift.status === "open", "shift opens");
ok((await staffApi.shifts.current()).shift?._id === sh.shift._id, "current shift loads");

/* ---------- counter order paid in cash, then driven by the buttons the UI shows ---------- */
const o1 = (await staffApi.orders.create(m.buildOrderPayload(draft({ lines: [{ menuItem: jollof._id, quantity: 2, variant: "Large", addOns: [{ name: "Chicken", price: 1500 }], unitPrice: 3500, note: "less pepper" }] }), m.normalizePhone))).order;
ok(o1.status === "confirmed" && o1.payment.status === "paid" && o1.tableNumber === "4", "paid dine-in order: confirmed, paid, table saved", o1);
ok(o1.items[0].note === "less pepper" && o1.total === 10750 || o1.total === Math.round(10000 * 1.075 * 100) / 100, "server total = 10,000 + 7.5% VAT", o1.total);

async function drive(order, role, workerType, token) {
  const seen = [];
  for (let i = 0; i < 8; i++) {
    const acts = m.actionsFor(order, role, workerType);
    seen.push(m.FINAL.includes(order.status) ? "(done)" : `${order.status}:[${ids(acts)}]`);
    const next = acts.find((a) => a.status && a.id !== "cancel");
    if (!next) break;
    order = (await staffApi.orders.setStatus(order._id, next.status)).order;
  }
  return { order, seen };
}
let r = await drive(o1, "worker", "cashier");
ok(r.order.status === "completed", "UI buttons take a paid dine-in order confirmed -> completed", r.seen);
ok(r.seen[0] === "confirmed:[start,cancel]", "confirmed order shows Start cooking + Cancel", r.seen[0]);

/* ---------- unpaid takeaway: cannot complete until paid ---------- */
const o2 = (await staffApi.orders.create(m.buildOrderPayload(draft({ type: "takeaway", table: "", paidNow: false, method: "transfer" }), m.normalizePhone))).order;
ok(ids(m.actionsFor(o2, "worker", "cashier")) === "start,pay,cancel", "unpaid confirmed order offers Start, Take payment, Cancel", ids(m.actionsFor(o2, "worker", "cashier")));
r = await drive(o2, "worker", "cashier");
ok(r.order.status === "ready" && ids(m.actionsFor(r.order, "worker", "cashier")) === "pay", "unpaid order stops at Ready and only offers Take payment", r.seen);
const tooEarly = await rejects(staffApi.orders.setStatus(r.order._id, "completed"));
ok(tooEarly && tooEarly.status === 409, "backend agrees: cannot complete before payment", tooEarly?.message);
const tooLittle = await rejects(staffApi.orders.pay(r.order._id, { method: "cash", amount: 1 }));
ok(tooLittle && /less than/.test(tooLittle.message), "paying less than the total is refused");
const paid = (await staffApi.orders.pay(r.order._id, { method: "cash", amount: 5000 })).order;
ok(paid.payment.status === "paid" && ids(m.actionsFor(paid, "worker", "cashier")) === "complete", "after payment the Handed over button appears");
r = await drive(paid, "worker", "cashier");
ok(r.order.status === "completed", "takeaway completes");

/* ---------- online card order from the customer site ---------- */
tokens.set({ accessToken: cust.accessToken, refreshToken: cust.refreshToken });
const online = (await api.orders.create({ branch: branch._id, type: "takeaway", items: [{ menuItem: zobo._id, quantity: 1 }], payment: { method: "card_online" } })).order;
await as(cashierP, pw);
ok(ids(m.actionsFor(online, "worker", "cashier")) === "pay,cancel", "unpaid card order: Mark as paid + Cancel, no Confirm", ids(m.actionsFor(online, "worker", "cashier")));
ok(m.actionsFor(online, "worker", "kitchen").length === 1 && m.actionsFor(online, "worker", "kitchen")[0].id === "cancel", "kitchen staff are not offered payment actions");
const blocked = await rejects(staffApi.orders.setStatus(online._id, "confirmed"));
ok(blocked && blocked.status === 409, "backend agrees: cannot confirm an unpaid card order", blocked?.message);
const manual = (await staffApi.orders.pay(online._id, { method: "card_online", reference: "PSK-123" })).order;
ok(ids(m.actionsFor(manual, "worker", "cashier")) === "confirm,cancel", "after Mark as paid, Confirm appears");
r = await drive(manual, "worker", "cashier");
ok(r.order.status === "completed", "online card order runs through to completed", r.seen);

/* ---------- delivery, pay on delivery, rider ---------- */
await as(riderP, pw);
await request("/riders/me/status", { method: "PATCH", body: { isOnline: true } });
tokens.set({ accessToken: cust.accessToken, refreshToken: cust.refreshToken });
const del = (await api.orders.create({ branch: branch._id, type: "delivery", items: [{ menuItem: zobo._id, quantity: 2 }], delivery: { address: "10 Test Street, Bodija", zone: "Bodija" }, payment: { method: "pay_on_delivery" } })).order;
const cashierUser = await as(cashierP, pw);
ok(ids(m.actionsFor(del, "worker", "cashier")) === "confirm,cancel", "pay-on-delivery order: Confirm + Cancel (no counter payment)");
r = await drive(del, "worker", "cashier");
ok(r.order.status === "ready" && ids(m.actionsFor(r.order, "worker", "cashier")) === "assign", "delivery at Ready offers Assign rider", r.seen);
const riders = (await staffApi.riders.available()).riders;
ok(riders.length === 1 && riders[0].activeDeliveries === 0, "online rider appears as available", riders);
const assigned = (await staffApi.orders.assignRider(r.order._id, riders[0]._id)).order;
ok(assigned.delivery.rider?.name === "rider3" && m.actionsFor(assigned, "worker", "cashier").length === 0, "after assigning, staff have no buttons (waiting for rider)");
const staffCannot = await rejects(staffApi.orders.setStatus(assigned._id, "out_for_delivery"));
ok(staffApi.orders && staffCannot && staffCannot.status === 403, "backend agrees: only the rider moves it out", staffCannot?.message);
await as(riderP, pw);
await staffApi.orders.setStatus(assigned._id, "out_for_delivery");
const noCash = await rejects(staffApi.orders.setStatus(assigned._id, "delivered"));
ok(noCash && noCash.status === 400, "rider must enter cash collected");
const delivered = (await staffApi.orders.setStatus(assigned._id, "delivered", { cashCollected: assigned.total })).order;
ok(delivered.status === "delivered" && delivered.payment.status === "paid", "rider delivers and cash is recorded");

/* ---------- cancel + refund flag, lists ---------- */
await as(cashierP, pw);
const c1 = (await staffApi.orders.create(m.buildOrderPayload(draft(), m.normalizePhone))).order;
const cx = await staffApi.orders.setStatus(c1._id, "cancelled", { reason: "Cancelled by staff" });
ok(cx.order.status === "cancelled" && cx.refundRequired === true, "cancelling a paid order flags a refund", cx);
const active = (await staffApi.orders.active()).orders;
ok(active.every((o) => !m.FINAL.includes(o.status)) && active.some((o) => o._id === unpaidNoShift.order._id), "active list holds only in-progress orders");
const finished = (await staffApi.orders.doneToday(m.lagosToday())).orders;
ok(finished.some((o) => o._id === o1._id) && finished.some((o) => o._id === c1._id) && finished.some((o) => o._id === delivered._id), "finished-today list has completed, cancelled and delivered orders", finished.length);
ok(m.kitchenColumn({ status: "confirmed" }) === "new" && m.kitchenColumn({ status: "preparing" }) === "cooking" && m.kitchenColumn({ status: "ready" }) === "ready" && m.kitchenColumn({ status: "pending" }) === null, "kitchen columns");

/* ---------- kitchen worker ---------- */
const kitchen = await as(kitchenP, pw);
const kOrder = (await (async () => { await as(cashierP, pw); return staffApi.orders.create(m.buildOrderPayload(draft({ paidNow: false }), m.normalizePhone)); })()).order;
await as(kitchenP, pw);
const kActs = m.actionsFor(kOrder, kitchen.role, kitchen.workerType).filter((a) => a.id === "start" || a.id === "ready");
ok(kActs.length === 1 && kActs[0].id === "start", "kitchen sees Start cooking");
const k1 = (await staffApi.orders.setStatus(kOrder._id, "preparing")).order;
const k2 = (await staffApi.orders.setStatus(k1._id, "ready")).order;
ok(k2.status === "ready", "kitchen worker moves an order to ready");
const kPay = await rejects(staffApi.orders.pay(k2._id, { method: "cash" }));
ok(kPay && kPay.status === 409, "kitchen worker cannot take payment (no shift)", kPay?.message);
ok((await staffApi.orders.active()).orders.some((o) => o._id === k2._id), "kitchen sees the branch's active orders");

/* ---------- manager can take payment without a shift ---------- */
await as(mgrP, pw);
const mp = (await staffApi.orders.pay(k2._id, { method: "cash", amount: 5000 })).order;
ok(mp.payment.status === "paid", "manager records payment without a shift");

/* ---------- close the shift: the numbers must reconcile ---------- */
await as(cashierP, pw);
const live = await staffApi.shifts.current();
// cash sales on this shift: o1 (10,750) + c1 (2,580 incl VAT) + o2 paid cash at the counter (860)
ok(live.live.ordersCount === 3, "shift counts 3 counter payments (two POS orders and one later payment)", live.live);
const exp = live.live.expected;
const closed = (await staffApi.shifts.close({ cash: exp.cash - 300, transfer: exp.transfer, pos_terminal: exp.pos_terminal }, "gave small change from float")).shift;
ok(closed.hasVariance && closed.variance.cash === -300 && closed.variance.transfer === 0, "closing with ₦300 less cash records a -300 variance", closed.variance);
ok(closed.expected.cash === exp.cash && closed.notes?.startsWith("gave"), "closing figures match the live figures the cashier saw");
const mine = (await staffApi.shifts.mine()).shifts;
ok(mine.length === 1 && mine[0].hasVariance, "past shifts list shows it with the variance flag");
ok((await staffApi.shifts.current()).shift === null, "no open shift after closing");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
