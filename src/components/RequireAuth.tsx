"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LogIn } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { EmptyState, LinkButton, Spinner } from "./ui";

/** Shows children only to logged-in users; otherwise invites them to log in and come back. */
export default function RequireAuth({ children, message = "Log in to continue." }: { children: ReactNode; message?: string }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  if (loading) return <Spinner />;
  if (!user) {
    const next = encodeURIComponent(pathname);
    return (
      <EmptyState
        icon={<LogIn size={28} />}
        title="Please log in"
        text={message}
        action={
          <div className="flex gap-2">
            <LinkButton href={`/login?next=${next}`}>Log in</LinkButton>
            <LinkButton href={`/register?next=${next}`} variant="outline">Sign up</LinkButton>
          </div>
        }
      />
    );
  }
  return <>{children}</>;
}
