"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import RequireAuth from "@/components/RequireAuth";
import { Spinner } from "@/components/ui";
import { homeForRole } from "@/lib/roles";

// Old entry point: sends each role to its own screen
export default function StaffRedirect() {
  return (
    <RequireAuth message="Staff, please log in.">
      <Go />
    </RequireAuth>
  );
}

function Go() {
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => { if (user) router.replace(homeForRole(user.role)); }, [user, router]);
  return <Spinner label="Taking you to your page" />;
}
