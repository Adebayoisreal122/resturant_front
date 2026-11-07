"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { ApiError } from "@/lib/api";
import { isValidNgPhone, normalizePhone } from "@/lib/format";
import { safeNext } from "@/lib/redirect";
import { homeForRole } from "@/lib/roles";
import { useAuth } from "@/context/AuthContext";
import { Button, Container, Field, TextInput } from "./ui";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const { login, register } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isLogin = mode === "login";
  const next = params.get("next");
  const qs = next ? `?next=${encodeURIComponent(next)}` : "";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!isValidNgPhone(phone)) return setError("Enter a valid Nigerian phone number, like 0803 123 4567.");
    if (!isLogin && name.trim().length < 2) return setError("Please enter your name.");
    if (!isLogin && password.length < 8) return setError("Password must be at least 8 characters.");

    setBusy(true);
    try {
      const p = normalizePhone(phone);
      const user = isLogin ? await login(p, password) : await register({ name: name.trim(), phone: p, email: email.trim() || undefined, password });
      router.replace(user.role === "customer" ? safeNext(next, "/menu") : homeForRole(user.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <Container className="flex justify-center py-10">
      <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">{isLogin ? <LogIn size={24} /> : <UserPlus size={24} />}</span>
        <h1 className="mt-4 text-2xl font-extrabold">{isLogin ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-1 text-stone-600">{isLogin ? "Log in with your phone number." : "Order faster and track every meal."}</p>

        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          {!isLogin && (
            <Field label="Full name">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Ade Johnson" />
            </Field>
          )}
          <Field label="Phone number">
            <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 123 4567" />
          </Field>
          {!isLogin && (
            <Field label="Email (optional)" hint="For receipts. We never spam.">
              <TextInput value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" placeholder="you@example.com" />
            </Field>
          )}
          <Field label="Password" hint={isLogin ? undefined : "At least 8 characters."}>
            <div className="relative">
              <TextInput value={password} onChange={(e) => setPassword(e.target.value)} type={show ? "text" : "password"} autoComplete={isLogin ? "current-password" : "new-password"} className="pr-12" />
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-stone-500 hover:bg-stone-100">
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>

          {error && <p role="alert" className="rounded-xl bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700">{error}</p>}

          <Button type="submit" size="lg" className="w-full" loading={busy}>{isLogin ? "Log in" : "Create account"}</Button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-600">
          {isLogin ? "New here? " : "Already have an account? "}
          <Link href={`${isLogin ? "/register" : "/login"}${qs}`} className="font-semibold text-secondary-600 hover:underline">{isLogin ? "Create an account" : "Log in"}</Link>
        </p>
      </div>
    </Container>
  );
}
