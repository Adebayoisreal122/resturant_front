"use client";

import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import type { Role } from "@/lib/types";
import { homeForRole } from "@/lib/roles";
import RequireAuth from "../RequireAuth";
import { EmptyState, LinkButton } from "../ui";

export default function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  return (
    <RequireAuth message="Staff, please log in to continue.">
      <RoleGate roles={roles}>{children}</RoleGate>
    </RequireAuth>
  );
}

function RoleGate({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;
  if (!roles.includes(user.role)) {
    return (
      <EmptyState icon={<ShieldAlert size={28} />} title="You don't have access to this page" text="This area is for other staff roles."
        action={<LinkButton href={homeForRole(user.role)}>Go to my page</LinkButton>} />
    );
  }
  return <>{children}</>;
}
