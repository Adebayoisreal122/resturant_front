// Runs the admin screens' real API calls and form builders against a LIVE backend + MongoDB.
// Usage: API_URL=http://localhost:5000/api ADMIN_PHONE=0801... ADMIN_PASSWORD=... node tests/admin-contract.mjs   (after `npm run test:contract:build`)
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.window = { dispatchEvent() {} };
const m = await import("./.build/contract.mjs");

let pass = 0, fail = 0;
const ok = (c, name, extra) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${c ? "" : "  -> " + JSON.stringify(extra)}`); };
const rejects = async (p) => { try { await p; return null; } catch (e) { return e; } };
const run = Date.now().toString().slice(-5);

const { admin, api, tokens } = m;
const r = await api.auth.login({ phone: process.env.ADMIN_PHONE, password: process.env.ADMIN_PASSWORD });
tokens.set({ accessToken: r.accessToken, refreshToken: r.refreshToken });
ok(r.user.role === "super_admin", "admin logs in through the real api client");

/* ---- form validation ---- */
const bf = (o = {}) => ({ name: "Test Branch", code: "T" + run, address: "1 Test Road", city: "Ibadan", state: "Oyo", phone: "08031234567", acceptsDelivery: true, acceptsDineIn: true,
  zones: [{ name: "Bodija", fee: "1000", estimatedMinutes: "30" }, { name: "Ring Road", fee: "1500", estimatedMinutes: "45" }], hours: m.defaultHours(), ...o });
ok(m.validateBranch(bf()) === null, "valid branch form passes");
ok(/code/i.test(m.validateBranch(bf({ code: "X" }))), "short branch code rejected");
ok(/twice/.test(m.validateBranch(bf({ zones: [{ name: "A", fee: "1", estimatedMinutes: "1" }, { name: "a", fee: "1", estimatedMinutes: "1" }] }))), "duplicate delivery areas rejected");
ok(/at least one delivery area/.test(m.validateBranch(bf({ zones: [] }))), "delivery on with no areas rejected");
ok(m.validateBranch(bf({ zones: [], acceptsDelivery: false })) === null, "delivery off with no areas is fine");
ok(m.generatePassword().length === 10 && m.generatePassword() !== m.generatePassword(), "generated passwords are 10 chars and differ");

/* ---- branches ---- */
const code = "T" + run;
const created = await admin.branches.create(m.branchPayload(bf()));
const bid = created.branch._id;
ok(created.branch.code === code && created.branch.deliveryZones.length === 2, "create branch via form payload", created.branch);
const got = (await admin.branches.get(bid)).branch;
ok(got.openingHours.length === 7 && got.deliveryZones[0].fee === 1000, "branch loads back with hours and zone fees", got.openingHours?.length);
const hours = m.defaultHours(); hours[0] = { day: 0, open: "", close: "", closed: true };
await admin.branches.update(bid, m.branchPayload(bf({ zones: [...bf().zones, { name: "Dugbe", fee: "2000", estimatedMinutes: "50" }], hours })));
const upd = (await admin.branches.get(bid)).branch;
ok(upd.deliveryZones.length === 3 && upd.openingHours.find((h) => h.day === 0).closed === true, "edit branch: zone added, Sunday closed");
const dup = await rejects(admin.branches.create(m.branchPayload(bf())));
ok(dup && /already exists/.test(dup.message), "duplicate branch code gives a clear error", dup?.message);
await admin.branches.deactivate(bid);
ok((await admin.branches.list()).branches.find((b) => b._id === bid)?.isActive === false, "admin list still shows the deactivated branch");
const publicList = await fetch(`${process.env.API_URL}/branches`).then((x) => x.json());
ok(!publicList.branches.some((b) => b._id === bid), "customers no longer see the deactivated branch");
await admin.branches.reactivate(bid);
ok((await admin.branches.list()).branches.find((b) => b._id === bid)?.isActive === true, "reactivated");
const second = (await admin.branches.create(m.branchPayload(bf({ name: "Second", code: "S" + run, zones: [], acceptsDelivery: false })))).branch._id;

/* ---- categories ---- */
const cat = (await admin.categories.create({ name: "Soups " + run, sortOrder: 2 })).category;
await admin.categories.update(cat._id, { name: "Soups & Stews " + run, sortOrder: 1 });
ok((await admin.categories.list()).categories.find((c) => c._id === cat._id)?.name.startsWith("Soups & Stews"), "category renamed");

/* ---- menu: variants, add-ons, per-branch rules ---- */
const mf = (o = {}) => ({ name: "Egusi Soup " + run, description: "With pounded yam", category: cat._id, image: "", basePrice: "3000", prepMinutes: "20", tags: ["popular"], isCombo: false,
  variants: [{ name: "Regular", price: "3000" }, { name: "Large", price: "4500" }], addOns: [{ name: "Extra meat", price: "1000" }], rules: { [bid]: { enabled: true, price: "" }, [second]: { enabled: true, price: "" } }, ...o });
ok(m.validateMenu(mf()) === null, "valid dish form passes");
ok(/category/i.test(m.validateMenu(mf({ category: "" }))), "dish needs a category");
ok(/http/.test(m.validateMenu(mf({ image: "ftp://x" }))), "bad image link rejected");
ok(/twice/.test(m.validateMenu(mf({ addOns: [{ name: "A", price: "1" }, { name: "a", price: "1" }] }))), "duplicate extras rejected");
const ids = [bid, second];
ok(m.menuPayload(mf(), ids).branchAvailability.length === 0, "everything on, no custom price = empty rules (sold everywhere)");

const dish = (await admin.menu.create(m.menuPayload(mf({ rules: { [bid]: { enabled: true, price: "" }, [second]: { enabled: false, price: "" } } }), ids))).item;
ok(dish.variants.length === 2 && dish.addOns[0].price === 1000 && dish.branchAvailability.length === 2, "create dish with variants, extras and per-branch rules", dish.branchAvailability);
const menuA = await fetch(`${process.env.API_URL}/menu?branch=${bid}`).then((x) => x.json());
const menuB = await fetch(`${process.env.API_URL}/menu?branch=${second}`).then((x) => x.json());
ok(menuA.items.some((i) => i._id === dish._id) && !menuB.items.some((i) => i._id === dish._id), "sold at branch 1, hidden at branch 2");
ok((await admin.menu.list()).items.find((i) => i._id === dish._id)?.branchAvailability.length === 2, "admin menu list includes branch rules");

// plain dish with a branch-specific price
const plain = (await admin.menu.create(m.menuPayload(mf({ name: "Zobo " + run, variants: [], addOns: [], basePrice: "800", rules: { [bid]: { enabled: true, price: "1000" }, [second]: { enabled: true, price: "" } } }), ids))).item;
const priced = (await fetch(`${process.env.API_URL}/menu?branch=${bid}`).then((x) => x.json())).items.find((i) => i._id === plain._id);
ok(priced?.price === 1000, "branch price override reaches the customer menu (1,000 vs base 800)", priced?.price);

// edit: make the first dish sold everywhere again
await admin.menu.update(dish._id, m.menuPayload(mf({ description: "Updated" }), ids));
const back = (await admin.menu.get(dish._id)).item;
ok(back.branchAvailability.length === 0 && back.description === "Updated", "editing back to 'all branches' clears the rules");
const menuB2 = await fetch(`${process.env.API_URL}/menu?branch=${second}`).then((x) => x.json());
ok(menuB2.items.some((i) => i._id === dish._id), "now sold at branch 2 too");
await admin.menu.remove(plain._id);
ok(!(await admin.menu.list()).items.some((i) => i._id === plain._id), "removed dish disappears from the menu");

/* ---- staff ---- */
const pw = m.generatePassword();
const phone = "0807" + run + "01";
const mgr = (await admin.users.create({ name: "Test Manager", phone, password: pw, role: "branch_manager", branch: bid })).user;
ok(mgr.role === "branch_manager", "create manager");
ok((await admin.branches.get(bid)).branch.manager?.name === "Test Manager", "branch now shows the manager");
const mgr2 = (await admin.users.create({ name: "New Manager", phone: "0807" + run + "02", password: pw, role: "branch_manager", branch: bid })).user;
ok((await admin.branches.get(bid)).branch.manager?.name === "New Manager", "a second manager replaces the first on the branch");
const w = (await admin.users.create({ name: "Test Cashier", phone: "0807" + run + "03", password: pw, role: "worker", workerType: "cashier", branch: bid })).user;
const rd = (await admin.users.create({ name: "Test Rider", phone: "0807" + run + "04", password: pw, role: "rider", vehicle: "bike", branch: bid })).user;
const staff = await admin.users.listStaff();
ok([mgr, mgr2, w, rd].every((u) => staff.some((s) => s._id === u._id)), "listStaff returns every staff role");
ok(staff.find((s) => s._id === rd._id)?.rider?.vehicle === "bike" && staff.find((s) => s._id === w._id)?.workerType === "cashier", "worker type and rider vehicle saved");
const dupPhone = await rejects(admin.users.create({ name: "X", phone, password: pw, role: "worker", workerType: "cashier", branch: bid }));
ok(dupPhone && /already exists/.test(dupPhone.message), "duplicate phone gives a clear error", dupPhone?.message);
await admin.users.update(w._id, { status: "suspended" });
const blocked = await rejects(api.auth.login({ phone: "0807" + run + "03", password: pw }));
ok(blocked && blocked.status === 403, "suspended staff cannot log in", blocked?.message);
await admin.users.update(w._id, { status: "active", name: "Renamed Cashier", workerType: "waiter" });
const again = await api.auth.login({ phone: "0807" + run + "03", password: pw });
ok(again.user.name === "Renamed Cashier" && again.user.workerType === "waiter", "reactivated and edited staff can log in");
const loginPhone = await api.auth.login({ phone: "+234807" + run + "04", password: pw });
ok(loginPhone.user.role === "rider", "login works with +234 format too");

/* ---- reports through the real client ---- */
const today = new Date(Date.now() + 3600000).toISOString().slice(0, 10);
const s = await admin.reports.summary(today, today);
ok(typeof s.revenue === "number" && s.byPaymentMethod instanceof Array, "summary report shape");
ok(Array.isArray((await admin.reports.daily(today, today)).days) && Array.isArray((await admin.reports.topItems(today, today)).items) && Array.isArray((await admin.reports.branches(today, today)).branches), "daily, top items and branch reports respond");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
