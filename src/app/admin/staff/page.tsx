"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Plus, RefreshCw, Search, UsersRound } from "lucide-react";
import { ApiError } from "@/lib/api";
import { admin } from "@/lib/adminApi";
import { cn, isValidNgPhone, normalizePhone } from "@/lib/format";
import { generatePassword } from "@/lib/payloads";
import { ROLE_LABEL } from "@/lib/roles";
import { useApi } from "@/lib/useApi";
import type { Role, StaffUser } from "@/lib/types";
import { useToast } from "@/context/ToastContext";
import { Badge, Button, EmptyState, ErrorState, Field, Spinner, TextInput, inputClass } from "@/components/ui";
import { Modal, PageHeader, selectClass } from "@/components/dash/kit";

type StaffRole = Exclude<Role, "customer">;
const ROLE_TONE = { super_admin: "primary", branch_manager: "secondary", worker: "accent", rider: "success" } as const;
const ROLE_OPTIONS: { id: StaffRole; label: string }[] = [
  { id: "branch_manager", label: "Branch manager" }, { id: "worker", label: "Staff (cashier, waiter, kitchen)" }, { id: "rider", label: "Rider" }, { id: "super_admin", label: "Admin (full access)" },
];
const branchOf = (u: StaffUser) => (typeof u.branch === "object" && u.branch ? u.branch : null);

export default function StaffPage() {
  const { toast } = useToast();
  const staff = useApi(() => admin.users.listStaff(), "staff");
  const branches = useApi(() => admin.branches.list(), "branches");
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [branch, setBranch] = useState("");
  const [modal, setModal] = useState<"create" | StaffUser | null>(null);
  const [created, setCreated] = useState<{ name: string; phone: string; password: string } | null>(null);

  const list = useMemo(() => (staff.data ?? []).filter((u) => (!role || u.role === role) && (!branch || branchOf(u)?._id === branch) && (!q.trim() || (u.name + u.phone).toLowerCase().includes(q.trim().toLowerCase()))), [staff.data, q, role, branch]);
  const branchList = branches.data?.branches ?? [];

  async function setStatus(u: StaffUser) {
    const next = u.status === "active" ? "suspended" : "active";
    if (next === "suspended" && !window.confirm(`Suspend ${u.name}? They won't be able to log in.`)) return;
    try {
      await admin.users.update(u._id, { status: next });
      toast(next === "suspended" ? `${u.name} suspended` : `${u.name} can log in again`);
      await staff.reload(true);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't update", "error");
    }
  }

  return (
    <>
      <PageHeader title="Staff" subtitle="Managers, cashiers, kitchen staff and riders." actions={<Button onClick={() => setModal("create")}><Plus size={16} /> Add staff</Button>} />

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_200px_200px]">
        <div className="relative"><Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or phone" className={cn(inputClass, "pl-10")} /></div>
        <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role" className={selectClass}><option value="">All roles</option>{ROLE_OPTIONS.map((r) => <option key={r.id} value={r.id}>{ROLE_LABEL[r.id]}</option>)}</select>
        <select value={branch} onChange={(e) => setBranch(e.target.value)} aria-label="Branch" className={selectClass}><option value="">All branches</option>{branchList.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}</select>
      </div>

      {staff.loading ? <Spinner /> : staff.error ? <ErrorState message={staff.error} onRetry={() => staff.reload()} /> : list.length === 0 ? (
        <EmptyState icon={<UsersRound size={28} />} title="No staff found" text="Add your first team member." action={<Button onClick={() => setModal("create")}>Add staff</Button>} />
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          {list.map((u) => (
            <li key={u._id} className="flex flex-wrap items-center gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-100 font-bold text-stone-600">{u.name.charAt(0).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{u.name} {u.status === "suspended" && <Badge tone="neutral" className="ml-1">Suspended</Badge>}</p>
                <p className="truncate text-sm text-stone-500">{u.phone}{branchOf(u) ? ` · ${branchOf(u)!.name}` : ""}{u.workerType ? ` · ${u.workerType}` : ""}{u.rider?.vehicle ? ` · ${u.rider.vehicle}` : ""}</p>
              </div>
              <Badge tone={ROLE_TONE[u.role as StaffRole]}>{ROLE_LABEL[u.role]}</Badge>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setModal(u)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => setStatus(u)}>{u.status === "active" ? "Suspend" : "Reactivate"}</Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modal === "create" && <CreateStaff branches={branchList} managerOf={Object.fromEntries(branchList.map((b) => [b._id, b.manager?.name]))} onClose={() => setModal(null)} onCreated={async (c) => { setModal(null); setCreated(c); await staff.reload(true); }} />}
      {modal && modal !== "create" && <EditStaff user={modal} branches={branchList} onClose={() => setModal(null)} onSaved={async () => { setModal(null); toast("Saved"); await staff.reload(true); }} />}
      {created && <Credentials c={created} onClose={() => setCreated(null)} />}
    </>
  );
}

function CreateStaff({ branches, managerOf, onClose, onCreated }: { branches: { _id: string; name: string; isActive: boolean }[]; managerOf: Record<string, string | undefined>; onClose: () => void; onCreated: (c: { name: string; phone: string; password: string }) => void }) {
  const [f, setF] = useState({ name: "", phone: "", email: "", role: "worker" as StaffRole, branch: "", workerType: "cashier", vehicle: "bike", password: generatePassword() });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const needsBranch = f.role !== "super_admin";
  const replacing = f.role === "branch_manager" && f.branch ? managerOf[f.branch] : undefined;

  async function save() {
    if (f.name.trim().length < 2) return setError("Enter the person's name.");
    if (!isValidNgPhone(f.phone)) return setError("Enter a valid Nigerian phone number.");
    if (needsBranch && !f.branch) return setError("Choose a branch.");
    if (f.password.length < 8) return setError("The password must be at least 8 characters.");
    setBusy(true);
    try {
      await admin.users.create({
        name: f.name.trim(), phone: normalizePhone(f.phone), email: f.email.trim() || undefined, password: f.password, role: f.role,
        ...(needsBranch ? { branch: f.branch } : {}), ...(f.role === "worker" ? { workerType: f.workerType } : {}), ...(f.role === "rider" ? { vehicle: f.vehicle } : {}),
      });
      onCreated({ name: f.name.trim(), phone: normalizePhone(f.phone), password: f.password });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't create the account.");
      setBusy(false);
    }
  }

  return (
    <Modal title="Add staff" onClose={onClose} footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} loading={busy}>Create account</Button></>}>
      <div className="space-y-4">
        <Field label="Role"><select value={f.role} onChange={(e) => set("role", e.target.value)} className={selectClass}>{ROLE_OPTIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></Field>
        {needsBranch && (
          <Field label="Branch"><select value={f.branch} onChange={(e) => set("branch", e.target.value)} className={selectClass}><option value="">Choose a branch</option>{branches.filter((b) => b.isActive).map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}</select></Field>
        )}
        {replacing && <p className="rounded-xl bg-accent-50 px-4 py-3 text-sm text-accent-700">This branch already has a manager ({replacing}). The new manager will replace them on the branch. Their account stays active.</p>}
        {f.role === "worker" && <Field label="What do they do?"><select value={f.workerType} onChange={(e) => set("workerType", e.target.value)} className={selectClass}><option value="cashier">Cashier</option><option value="waiter">Waiter</option><option value="kitchen">Kitchen</option></select></Field>}
        {f.role === "rider" && <Field label="Vehicle"><select value={f.vehicle} onChange={(e) => set("vehicle", e.target.value)} className={selectClass}><option value="bike">Motorbike</option><option value="bicycle">Bicycle</option><option value="car">Car</option><option value="foot">On foot</option></select></Field>}
        <Field label="Full name"><TextInput value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Phone number" hint="They log in with this."><TextInput type="tel" inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="0803 123 4567" /></Field>
        <Field label="Email (optional)"><TextInput type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Temporary password" hint="Share it with them. They can't see it again after this.">
          <div className="flex gap-2"><TextInput value={f.password} onChange={(e) => set("password", e.target.value)} className="font-mono" /><Button variant="outline" aria-label="Generate a new password" onClick={() => set("password", generatePassword())}><RefreshCw size={16} /></Button></div>
        </Field>
        {error && <p role="alert" className="rounded-xl bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700">{error}</p>}
      </div>
    </Modal>
  );
}

function EditStaff({ user, branches, onClose, onSaved }: { user: StaffUser; branches: { _id: string; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email ?? "");
  const [workerType, setWorkerType] = useState(user.workerType ?? "cashier");
  const [branch, setBranch] = useState(branchOf(user)?._id ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (name.trim().length < 2) return setError("Enter the person's name.");
    setBusy(true);
    try {
      await admin.users.update(user._id, { name: name.trim(), email: email.trim() || undefined, ...(user.role === "worker" ? { workerType } : {}), ...(branch && user.role !== "super_admin" ? { branch } : {}) });
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save.");
      setBusy(false);
    }
  }

  return (
    <Modal title={`Edit ${user.name}`} onClose={onClose} footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} loading={busy}>Save</Button></>}>
      <div className="space-y-4">
        <Field label="Full name"><TextInput value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Phone" hint="Phone numbers can't be changed here."><TextInput value={user.phone} disabled /></Field>
        <Field label="Email"><TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        {user.role === "worker" && <Field label="What do they do?"><select value={workerType} onChange={(e) => setWorkerType(e.target.value as typeof workerType)} className={selectClass}><option value="cashier">Cashier</option><option value="waiter">Waiter</option><option value="kitchen">Kitchen</option></select></Field>}
        {user.role !== "super_admin" && <Field label="Branch"><select value={branch} onChange={(e) => setBranch(e.target.value)} className={selectClass}>{branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}</select></Field>}
        {error && <p role="alert" className="rounded-xl bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700">{error}</p>}
      </div>
    </Modal>
  );
}

function Credentials({ c, onClose }: { c: { name: string; phone: string; password: string }; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const text = `Login for ${c.name}\nPhone: ${c.phone}\nPassword: ${c.password}`;
  return (
    <Modal title="Account created" onClose={onClose} footer={<Button onClick={onClose}>Done</Button>}>
      <p className="text-stone-700"><b>{c.name}</b> can now log in. Send them these details. <b>The password won&apos;t be shown again.</b></p>
      <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-stone-100 p-4 font-mono text-sm">{text}</pre>
      <Button variant="secondary" className="mt-3" onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); } catch { /* clipboard blocked */ } }}>{copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy details</>}</Button>
    </Modal>
  );
}
