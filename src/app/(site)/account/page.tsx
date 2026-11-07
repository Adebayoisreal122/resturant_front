"use client";

import { useRouter } from "next/navigation";
import { ClipboardList, LogOut, Mail, Phone, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import RequireAuth from "@/components/RequireAuth";
import InstallButton from "@/components/InstallButton";
import { Button, Container, LinkButton } from "@/components/ui";

export default function AccountPage() {
  return (
    <Container className="max-w-xl py-8">
      <h1 className="text-3xl font-extrabold">Account</h1>
      <RequireAuth message="Log in to see your account.">
        <Profile />
      </RequireAuth>
    </Container>
  );
}

function Profile() {
  const { user, logout } = useAuth();
  const router = useRouter();
  if (!user) return null;
  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-xl font-extrabold text-primary-700">{user.name.charAt(0).toUpperCase()}</span>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-lg font-bold"><User size={18} className="text-stone-400" /> {user.name}</p>
            <p className="flex items-center gap-2 text-stone-600"><Phone size={16} className="text-stone-400" /> {user.phone}</p>
            {user.email && <p className="flex items-center gap-2 truncate text-stone-600"><Mail size={16} className="text-stone-400" /> {user.email}</p>}
          </div>
        </div>
      </div>
      <LinkButton href="/orders" variant="secondary" size="lg" className="w-full"><ClipboardList size={20} /> My orders</LinkButton>
      <InstallButton variant="solid" className="w-full" />
      <Button variant="outline" size="lg" className="w-full" onClick={async () => { await logout(); router.replace("/"); }}><LogOut size={18} /> Log out</Button>
    </div>
  );
}
