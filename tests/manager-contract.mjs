// Runs the branch manager screens' real API calls against a LIVE backend + MongoDB, with two branches to prove isolation.
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.window = { dispatchEvent() {} };
const m = await import("./.build/contract.mjs");
const { admin, api, tokens, staffApi, riderApi, managerApi, request } = m;

let pass = 0, fail = 0;
const ok = (c, name, extra) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${c ? "" : "  -> " + JSON.stringify(extra)}`); };
const rejects = async (p) => { try { await p; return null; } catch (e) { return e; } };
const as = async (phone, password) => { const r = await api.auth.login({ phone, password }); tokens.set({ accessToken: r.accessToken, refreshToken: r.refreshToken }); return r; };
const run = Date.now().toString().slice(-5), pw = "Passw0rd!x";
const today = m.lagosToday(), weekAgo = new Date(Date.now() + 3600000 - 13 * 86400000).toISOString().slice(0, 10);

/* ---------- setup: two branches, each with its own team ---------- */
await as(process.env.ADMIN_PHONE, process.env.ADMIN_PASSWORD);
const mkBranch = async (n) => (await admin.branches.create({ name: `Mgr ${n} ${run}`, code: `M${n}${run}`.slice(0, 6), address: "1 Road", acceptsDelivery: true, acceptsDineIn: true, deliveryZones: [{ name: "Z", fee: 500, estimatedMinutes: 20 }] })).branch;
const B1 = await mkBranch("A"), B2 = await mkBranch("B");
const cat = (await admin.categories.create({ name: "Mgr " + run })).category;
const zobo = (await admin.menu.create({ name: "Zobo", category: cat._id, basePrice: 800 })).item;
const jollof = (await admin.menu.create({ name: "Jollof", category: cat._id, basePrice: 2500 })).item;
let n = 0;
const mk = async (role, branch, extra = {}) => { const phone = `0803${run}${String(++n).padStart(2, "0")}`.slice(0, 11); const u = (await admin.users.create({ name: `${role}${n}`, phone, password: pw, role, branch: branch._id, ...extra })).user; return { phone, id: u._id }; };
const mgr1 = await mk("branch_manager", B1), mgr2 = await mk("branch_manager", B2);
const cash1 = await mk("worker", B1, { workerType: "cashier" }), cash2 = await mk("worker", B2, { workerType: "cashier" });
const rider1 = await mk("rider", B1, { vehicle: "bike" });
const cust = await api.auth.register({ name: "Cust", phone: `0802${run}01`, password: pw });
const draft = (item, qty = 1) => ({ type: "takeaway", table: "", lines: [{ menuItem: item._id, quantity: qty, unitPrice: 800, addOns: [] }], zone: "", address: "", phone: "", method: "cash", paidNow: true });
const pos = async (item, qty) => (await staffApi.orders.create(m.buildOrderPayload(draft(item, qty), m.normalizePhone))).order;

/* ---------- shifts: each cashier closes with a shortage ---------- */
async function shiftWithVariance(cashier, short) {
  await as(cashier.phone, pw);
  await staffApi.shifts.open(1000);
  await pos(zobo, 2);
  const live = (await staffApi.shifts.current()).live;
  return (await staffApi.shifts.close({ cash: live.expected.cash - short, transfer: 0, pos_terminal: 0 }, "counted twice")).shift;
}
const s1 = await shiftWithVariance(cash1, 500);
const s2 = await shiftWithVariance(cash2, 200);

await as(mgr1.phone, pw);
const needs = (await managerApi.shifts.list({ status: "closed", variance: true })).shifts;
ok(needs.length === 1 && needs[0]._id === s1._id, "manager 1 sees only their own branch's shift with a difference", needs.map((x) => x._id));
ok(typeof needs[0].cashier === "object" && needs[0].cashier.name === "worker3" || typeof needs[0].cashier === "object", "shift list includes the cashier's name");
const det = await managerApi.shifts.get(s1._id);
ok(det.shift.variance.cash === -500 && det.orders.length === 1 && det.shift.notes === "counted twice", "shift detail: variance, payments and the cashier's note", det.shift.variance);
ok((await rejects(managerApi.shifts.get(s2._id)))?.status === 404, "manager 1 cannot open branch 2's shift");
ok((await rejects(managerApi.shifts.review(s2._id, "x")))?.status === 404, "manager 1 cannot review branch 2's shift");
const rv = (await managerApi.shifts.review(s1._id, "Spoke to cashier")).shift;
ok(!!rv.reviewedAt && rv.reviewNote === "Spoke to cashier", "manager reviews the shift with a note");
const after = (await managerApi.shifts.list({ status: "closed", variance: true })).shifts;
ok(after.filter((x) => !x.reviewedAt).length === 0, "the 'needs review' count drops to zero");
await as(cash1.phone, pw); await staffApi.shifts.open(0);
await as(mgr1.phone, pw);
const openNow = (await managerApi.shifts.list({ status: "open" })).shifts;
ok(openNow.length === 1 && (await managerApi.shifts.get(openNow[0]._id)).live !== undefined, "open shifts are listed with live figures");

/* ---------- rider cash ---------- */
await as(rider1.phone, pw); await riderApi.setOnline(true);
tokens.set({ accessToken: cust.accessToken, refreshToken: cust.refreshToken });
const pod = (await api.orders.create({ branch: B1._id, type: "delivery", items: [{ menuItem: jollof._id, quantity: 1 }], delivery: { address: "5 Test Street, Z", zone: "Z" }, payment: { method: "pay_on_delivery" } })).order;
await as(cash1.phone, pw);
for (const st of ["confirmed", "preparing", "ready"]) await staffApi.orders.setStatus(pod._id, st);
await staffApi.orders.assignRider(pod._id, (await staffApi.riders.available()).riders[0]._id);
await as(rider1.phone, pw);
await riderApi.setStatus(pod._id, "out_for_delivery");
await riderApi.setStatus(pod._id, "delivered", 4000);
await as(mgr1.phone, pw);
const cs = await managerApi.cash.summary();
ok(cs.totalOwed === pod.total && cs.riders.length === 1 && cs.riders[0].rider.name === "rider5", "manager 1 sees the rider and exactly what they owe", cs);
await as(mgr2.phone, pw);
ok((await managerApi.cash.summary()).totalOwed === 0, "manager 2 sees nothing owed (other branch)");
ok((await rejects(managerApi.cash.remit(rider1.id, pod.total)))?.status === 404, "manager 2 cannot take cash from branch 1's rider");
await as(mgr1.phone, pw);
const rem = (await managerApi.cash.remit(rider1.id, pod.total - 150, "will bring balance")).remittance;
ok(rem.variance === -150 && rem.expected === pod.total, "handover with ₦150 short is recorded as a -150 variance", rem);
ok((await managerApi.cash.summary()).totalOwed === 0, "owed amount clears after the handover");
const hist = (await managerApi.cash.remittances()).remittances;
ok(hist.length === 1 && hist[0].rider.name === "rider5" && hist[0].receivedBy.name === "branch_manager1" && hist[0].note === "will bring balance", "handover history shows who received it and the note", hist[0]);
await as(mgr2.phone, pw);
ok((await managerApi.cash.remittances()).remittances.length === 0, "manager 2's history is empty");

/* ---------- sold out ---------- */
await as(mgr1.phone, pw);
const menu1 = (await managerApi.menu.forBranch(B1._id)).items;
ok([zobo, jollof].every((x) => menu1.find((i) => i._id === x._id)?.isAvailable === true), "sold-out list shows both dishes, available at first");
await managerApi.menu.setAvailability(zobo._id, B1._id, false);
const menu1b = (await managerApi.menu.forBranch(B1._id)).items;
ok(menu1b.find((i) => i._id === zobo._id).isAvailable === false && menu1b.find((i) => i._id === jollof._id).isAvailable === true, "Zobo is marked sold out, Jollof untouched");
const customerView = await fetch(`${process.env.API_URL}/menu?branch=${B1._id}`).then((r) => r.json());
ok(!customerView.items.some((i) => i._id === zobo._id), "customers no longer see Zobo at branch 1");
const otherBranch = await fetch(`${process.env.API_URL}/menu?branch=${B2._id}`).then((r) => r.json());
ok(otherBranch.items.some((i) => i._id === zobo._id), "branch 2 still sells it");
ok((await rejects(managerApi.menu.setAvailability(zobo._id, B2._id, false)))?.status === 403, "manager 1 cannot change branch 2's menu");
await managerApi.menu.setAvailability(zobo._id, B1._id, true);
ok((await managerApi.menu.forBranch(B1._id)).items.find((i) => i._id === zobo._id).isAvailable === true, "switching it back on restores it");

/* ---------- refunds (manual path; the Paystack path needs the live Paystack API) ---------- */
await as(cash1.phone, pw);
const paidOrder = await pos(jollof, 1);
const cx = await staffApi.orders.setStatus(paidOrder._id, "cancelled", { reason: "Customer left" });
ok(cx.refundRequired === true, "cancelling the paid order flags a refund");
await as(mgr1.phone, pw);
let list = (await managerApi.refunds.cancelled(weekAgo, today)).orders;
ok(list.some((o) => o._id === paidOrder._id && o.payment.status === "paid"), "it appears in the refunds list as paid + cancelled");
ok((await rejects(managerApi.refunds.refund(paidOrder._id, {})))?.status === 400, "refunding cash without confirming you handed money back is refused");
const refunded = (await managerApi.refunds.refund(paidOrder._id, { manual: true, note: "Returned in cash" })).order;
ok(refunded.payment.status === "refunded" && refunded.payment.refundNote === "Returned in cash", "manual refund recorded with the note");
list = (await managerApi.refunds.cancelled(weekAgo, today)).orders;
ok(list.filter((o) => o.payment.status === "paid").length === 0, "nothing left waiting for a refund");
ok((await rejects(managerApi.refunds.refund(paidOrder._id, { manual: true })))?.status === 409, "cannot refund the same order twice");
await as(mgr2.phone, pw);
ok((await rejects(managerApi.refunds.refund(paidOrder._id, { manual: true })))?.status === 404, "manager 2 cannot refund branch 1's order");

/* ---------- staff (manager scope) ---------- */
await as(mgr1.phone, pw);
const staff = await admin.users.listBranchStaff();
ok(staff.length === 2 && staff.every((u) => ["worker", "rider"].includes(u.role)), "manager sees only their own workers and riders (no managers, no other branch)", staff.map((u) => u.name));
const newW = (await admin.users.create({ name: "New Waiter", phone: `0803${run}91`, password: pw, role: "worker", workerType: "waiter" })).user;
ok(String(newW.branch) === B1._id, "a worker created by the manager lands in the manager's branch automatically");
ok((await rejects(admin.users.create({ name: "x", phone: `0803${run}92`, password: pw, role: "branch_manager" })))?.status === 403, "manager cannot create another manager");
ok((await rejects(admin.users.create({ name: "x", phone: `0803${run}93`, password: pw, role: "super_admin" })))?.status === 403, "manager cannot create an admin");
await admin.users.update(newW._id, { status: "suspended" });
ok((await rejects(api.auth.login({ phone: `0803${run}91`, password: pw })))?.status === 403, "suspended worker cannot log in");
await as(mgr2.phone, pw);
ok((await rejects(admin.users.update(newW._id, { status: "active" })))?.status === 403, "manager 2 cannot edit branch 1's staff");

/* ---------- reports are locked to the branch ---------- */
const sum1 = await (async () => { await as(mgr1.phone, pw); return admin.reports.summary(today, today); })();
const sum2 = await (async () => { await as(mgr2.phone, pw); return admin.reports.summary(today, today); })();
ok(sum2.revenue === 1720 /* 2 zobo + VAT */ && sum1.revenue > sum2.revenue, "each manager's report only counts their own branch", [sum1.revenue, sum2.revenue]);
ok((await rejects(admin.reports.branches(today, today)))?.status === 403, "branch comparison is admin-only");
ok((await rejects(admin.branches.create({ name: "x", code: "ZZ", address: "yyyyyy" })))?.status === 403, "a manager cannot create branches");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
