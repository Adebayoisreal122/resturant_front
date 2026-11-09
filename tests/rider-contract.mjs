// Runs the rider app's real API calls and logic against a LIVE backend + MongoDB, including the live assignment alert.
import { io } from "socket.io-client";
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.window = { dispatchEvent() {} };
const m = await import("./.build/contract.mjs");
const { admin, api, tokens, staffApi, riderApi, request } = m;

let pass = 0, fail = 0;
const ok = (c, name, extra) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${c ? "" : "  -> " + JSON.stringify(extra)}`); };
const rejects = async (p) => { try { await p; return null; } catch (e) { return e; } };
const as = async (phone, password) => { const r = await api.auth.login({ phone, password }); tokens.set({ accessToken: r.accessToken, refreshToken: r.refreshToken }); return r; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const run = Date.now().toString().slice(-5), pw = "Passw0rd!x";

/* pure logic */
const base = { type: "delivery", payment: { method: "pay_on_delivery", status: "unpaid" }, total: 4300, delivery: { address: "12 Long St", zone: "Bodija", phone: "0803" } };
ok(m.cashToCollect({ ...base }) === 4300 && m.cashToCollect({ ...base, payment: { method: "pay_on_delivery", status: "paid" } }) === 0 && m.cashToCollect({ ...base, payment: { method: "card_online", status: "paid" } }) === 0, "cashToCollect: only unpaid pay-on-delivery");
ok(m.changeToGive(4300, 5000) === 700 && m.changeToGive(4300, 4000) === 0, "changeToGive");
ok(m.riderAction({ ...base, status: "ready" })?.id === "pickup" && m.riderAction({ ...base, status: "out_for_delivery" })?.id === "deliver" && m.riderAction({ ...base, status: "preparing" }) === null && m.riderAction({ ...base, status: "delivered" }) === null, "riderAction by status");
ok(/google\.com\/maps.*12%20Long%20St%2C%20Bodija/.test(m.mapsUrl("12 Long St", "Bodija")), "maps link is encoded");

/* setup */
await as(process.env.ADMIN_PHONE, process.env.ADMIN_PASSWORD);
const branch = (await admin.branches.create({ name: "Rider Test " + run, code: "R" + run, address: "1 Road", acceptsDelivery: true, acceptsDineIn: true, deliveryZones: [{ name: "Bodija", fee: 1000, estimatedMinutes: 30 }] })).branch;
const cat = (await admin.categories.create({ name: "R " + run })).category;
const zobo = (await admin.menu.create({ name: "Zobo", category: cat._id, basePrice: 800 })).item;
const mk = async (role, i, extra = {}) => { const phone = `0805${run}0${i}`; const u = (await admin.users.create({ name: role + i, phone, password: pw, role, branch: branch._id, ...extra })).user; return { phone, id: u._id }; };
const cashier = await mk("worker", 1, { workerType: "cashier" });
const riderA = await mk("rider", 2, { vehicle: "bike" });
const riderB = await mk("rider", 3, { vehicle: "bicycle" });
const mgr = await mk("branch_manager", 4);
const custP = `0804${run}09`;
const cust = await api.auth.register({ name: "Cust", phone: custP, password: pw });

/* rider goes online */
const rA = await as(riderA.phone, pw);
ok(rA.user.role === "rider" && !rA.user.rider?.isOnline, "rider logs in, starts offline");
ok((await riderApi.setOnline(true)).isOnline === true, "rider goes online");
ok((await api.auth.me()).user.rider?.isOnline === true, "online state survives a reload (/auth/me)");
await as(riderB.phone, pw); await riderApi.setOnline(true);
await as(cashier.phone, pw);
ok((await staffApi.riders.available()).riders.length === 2, "both riders are offered to the cashier");
await as(riderB.phone, pw); await riderApi.setOnline(false);
await as(cashier.phone, pw);
ok((await staffApi.riders.available()).riders.map((r) => r._id).join() === riderA.id, "a rider who goes offline is no longer offered");

/* live alert */
await as(riderA.phone, pw);
const alerts = [];
const sock = io(process.env.SOCKET_URL, { auth: { token: tokens.get().accessToken }, transports: ["websocket"], reconnection: false });
sock.on("delivery:assigned", (o) => alerts.push(o.orderNumber));
await new Promise((r) => sock.on("connect", r));

/* two delivery orders: cash on delivery, and already paid */
const place = async (method) => { tokens.set({ accessToken: cust.accessToken, refreshToken: cust.refreshToken }); return (await api.orders.create({ branch: branch._id, type: "delivery", items: [{ menuItem: zobo._id, quantity: 2 }], delivery: { address: "10 Test Street, Bodija", zone: "Bodija" }, payment: { method } })).order; };
const pod = await place("pay_on_delivery");
const online = await place("card_online");
await as(cashier.phone, pw);
await staffApi.shifts.open(0);
await staffApi.orders.pay(online._id, { method: "card_online", reference: "PSK-1" });
for (const o of [pod, online]) for (const st of ["confirmed", "preparing", "ready"]) await staffApi.orders.setStatus(o._id, st);
const rid = (await staffApi.riders.available()).riders[0]._id;
await staffApi.orders.assignRider(pod._id, rid);
await wait(600);
ok(alerts.includes(pod.orderNumber), "rider's socket gets the delivery:assigned alert instantly", alerts);
await staffApi.orders.assignRider(online._id, rid);

/* the rider's view */
await as(riderA.phone, pw);
const mine = (await riderApi.active()).orders;
ok(mine.length === 2 && mine.every((o) => o.delivery.rider?._id === riderA.id || o.delivery.rider === riderA.id), "rider sees exactly their 2 assigned deliveries", mine.length);
await as(riderB.phone, pw);
ok((await riderApi.active()).orders.length === 0, "another rider sees none of them");
ok((await rejects(request(`/orders/${pod._id}`)))?.status === 404, "another rider cannot open the order");
await as(riderA.phone, pw);
ok((await rejects(staffApi.orders.pay(pod._id, { method: "cash" })))?.status === 403, "a rider cannot take payments");
ok((await rejects(staffApi.orders.assignRider(pod._id, rid)))?.status === 403, "a rider cannot assign riders");
const rc = await rejects(staffApi.orders.setStatus(pod._id, "cancelled")); ok(rc && [403, 409].includes(rc.status), "a rider cannot cancel orders", rc?.status);

/* run each delivery with the buttons the app shows */
const podOrder = mine.find((o) => o._id === pod._id), onlineOrder = mine.find((o) => o._id === online._id);
ok(m.cashToCollect(podOrder) === pod.total && m.cashToCollect(onlineOrder) === 0, "app shows 'collect cash' for one and 'already paid' for the other", [pod.total]);
ok(m.riderAction(podOrder)?.id === "pickup", "ready order offers the pickup button");
let o1 = (await riderApi.setStatus(pod._id, m.riderAction(podOrder).status)).order;
ok(o1.status === "out_for_delivery" && m.riderAction(o1)?.id === "deliver", "after pickup the Delivered button appears");
ok((await rejects(riderApi.setStatus(pod._id, "delivered")))?.status === 400, "cash delivery without cash is refused");
ok((await rejects(riderApi.setStatus(pod._id, "delivered", pod.total - 1)))?.status === 400, "cash delivery with too little is refused");
o1 = (await riderApi.setStatus(pod._id, "delivered", 5000)).order;
ok(o1.status === "delivered" && o1.payment.status === "paid" && o1.delivery.cashCollected === 5000, "cash delivery with change: recorded as paid, cash collected 5,000", o1.delivery);
let o2 = (await riderApi.setStatus(online._id, "out_for_delivery")).order;
o2 = (await riderApi.setStatus(online._id, "delivered")).order;
ok(o2.status === "delivered", "paid-online delivery needs no cash step");

/* cash owed and the manager's handover */
const cash = await riderApi.cash();
ok(cash.count === 1 && cash.expected === pod.total, "rider sees they owe the order total (not the bigger amount the customer handed over)", cash);
const hist = (await riderApi.delivered(m.lagosToday(), m.lagosToday())).orders;
ok(hist.length === 2, "history lists both deliveries for today", hist.length);
ok((await riderApi.active()).orders.length === 0, "nothing left in the active list");
await as(mgr.phone, pw);
const sum = await request("/riders/cash");
ok(sum.totalOwed === pod.total && sum.riders[0].rider.name === "rider2", "manager's cash summary shows the rider and amount", sum);
const rem = await request(`/riders/${riderA.id}/remit`, { method: "POST", body: { amountReceived: pod.total } });
ok(rem.remittance.variance === 0, "manager records the handover, no shortage");
await as(riderA.phone, pw);
ok((await riderApi.cash()).expected === 0, "rider's cash owed drops to zero");

sock.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
