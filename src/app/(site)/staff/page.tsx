"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Hammer, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import RequireAuth from "@/components/RequireAuth";
import { Button, Container } from "@/components/ui";

const LABEL = { super_admin: "Admin dashboard", branch_manager: "Branch manager dashboard", worker: "Point of sale and kitchen", rider: "Rider app", customer: "Customer" } as const;

export default function StaffPage() {
  return (
    <Container className="max-w-xl py-12">
      <RequireAuth message="Staff, please log in.">
        <Placeholder />
      </RequireAuth>
    </Container>
  );
}

// The staff dashboards are the next part of the build. This page keeps staff logins from hitting a dead end.
function Placeholder() {
  const { user, logout } = useAuth();
  const router = useRouter();
  useEffect(() => { if (user?.role === "super_admin") router.replace("/admin"); }, [user, router]);
  if (!user) return null;
  return (
    <div className="text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-100 text-accent-600"><Hammer size={28} /></span>
      <h1 className="mt-4 text-2xl font-extrabold">Hello, {user.name.split(" ")[0]}</h1>
      <p className="mt-2 text-stone-600">Your <b>{LABEL[user.role]}</b> is the next screen we're building. You're logged in as {user.role.replace("_", " ")}.</p>
      <Button variant="outline" className="mt-6" onClick={async () => { await logout(); router.replace("/"); }}><LogOut size={16} /> Log out</Button>
    </div>
  );
}
