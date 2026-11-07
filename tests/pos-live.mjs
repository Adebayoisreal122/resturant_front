// Checks the live order feed against a running API: who receives new orders and updates.
// Usage: API_URL=http://localhost:5000/api SOCKET_URL=http://localhost:5000 ADMIN_PHONE=... ADMIN_PASSWORD=... node tests/pos-live.mjs
import { io } from "socket.io-client";
const API = process.env.API_URL, SOCK = process.env.SOCKET_URL;
let pass = 0, fail = 0;
const ok = (c, name, extra) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${c ? "" : "  -> " + JSON.stringify(extra)}`); };
const call = async (method, path, token, body) => {
  const res = await fetch(API + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};
const login = async (phone, password) => (await call("POST", "/auth/login", null, { phone, password })).body.accessToken;
const run = Date.now().toString().slice(-5), pw = "Passw0rd!x";

const admin = await login(process.env.ADMIN_PHONE, process.env.ADMIN_PASSWORD);
const mkBranch = async (n) => (await call("POST", "/branches", admin, { name: `Live ${n} ${run}`, code: `L${n}${run}`.slice(0, 6), address: "1 Live Road", deliveryZones: [{ name: "A", fee: 500, estimatedMinutes: 20 }] })).body.branch._id;
const b1 = await mkBranch("A"), b2 = await mkBranch("B");
const cat = (await call("POST", "/categories", admin, { name: "Live " + run })).body.category;
const item = (await call("POST", "/menu", admin, { name: "Zobo", category: cat._id, basePrice: 800 })).body.item;
const mk = async (i, branch, workerType) => { const phone = `0807${run}0${i}`; await call("POST", "/users", admin, { name: "w" + i, phone, password: pw, role: "worker", workerType, branch }); return login(phone, pw); };
const cashierT = await mk(1, b1, "cashier"), kitchenT = await mk(2, b1, "kitchen"), otherT = await mk(3, b2, "cashier");
const cust = (await call("POST", "/auth/register", null, { name: "Live Customer", phone: `0806${run}01`, password: pw })).body;

const connect = (token) => new Promise((resolve) => {
  const s = io(SOCK, { auth: { token }, transports: ["websocket"], reconnection: false });
  const got = [];
  for (const ev of ["order:new", "order:updated"]) s.on(ev, (o) => got.push({ ev, status: o.status, source: o.source, number: o.orderNumber, createdBy: o.createdBy }));
  s.on("connect", () => resolve({ s, got }));
  s.on("connect_error", () => resolve({ s, got, error: true }));
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const bad = await connect("not-a-token");
ok(bad.error === true, "a bad token cannot connect");
const [cashier, kitchen, other, customer] = await Promise.all([connect(cashierT), connect(kitchenT), connect(otherT), connect(cust.accessToken)]);
ok(!cashier.error && !kitchen.error && !other.error && !customer.error, "staff and customer sockets connect");

// customer places an online order at branch 1
const order = (await call("POST", "/orders", cust.accessToken, { branch: b1, type: "takeaway", items: [{ menuItem: item._id, quantity: 1 }], payment: { method: "cash" } })).body.order;
await wait(700);
const n = (c) => c.got.filter((g) => g.ev === "order:new" && g.number === order.orderNumber);
ok(n(cashier).length === 1 && n(cashier)[0].status === "pending" && n(cashier)[0].source === "online", "cashier gets the new online order instantly (pending, online)", cashier.got);
ok(n(kitchen).length === 1, "kitchen worker gets it too (same branch)");
ok(n(other).length === 0, "a worker at ANOTHER branch does not get it", other.got);
ok(n(customer).length === 1, "the customer gets their own order event");

// cashier confirms: kitchen and customer see the update
const conf = await call("PATCH", `/orders/${order._id}/status`, cashierT, { status: "confirmed" });
await wait(700);
const u = (c) => c.got.filter((g) => g.ev === "order:updated" && g.number === order.orderNumber && g.status === "confirmed");
ok(conf.status === 200 && u(kitchen).length === 1 && u(customer).length === 1 && u(other).length === 0, "confirming reaches kitchen and customer, not the other branch", { k: kitchen.got, o: other.got });

// a counter order: event carries createdBy so the creator's screen can skip the chime
const pos = (await call("POST", "/orders", cashierT, { type: "takeaway", items: [{ menuItem: item._id, quantity: 1 }], payment: { method: "cash", paid: false } })).body.order;
await wait(600);
const mine = kitchen.got.find((g) => g.ev === "order:new" && g.number === pos.orderNumber);
ok(mine && mine.source === "pos" && mine.status === "confirmed" && typeof mine.createdBy === "string", "counter orders arrive confirmed with source=pos and createdBy (kitchen chimes, the creator doesn't)", mine);

[cashier, kitchen, other, customer, bad].forEach((c) => c.s.close());
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
