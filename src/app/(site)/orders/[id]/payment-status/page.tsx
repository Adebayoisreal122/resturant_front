"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CircleCheck, CircleX, LoaderCircle } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import { formatNaira } from "@/lib/format";
import type { Order } from "@/lib/types";
import RequireAuth from "@/components/RequireAuth";
import { Button, Container, LinkButton } from "@/components/ui";

export default function PaymentStatusPage() {
  return (
    <Container className="max-w-md py-12">
      <RequireAuth message="Log in to check your payment.">
        <Suspense><Result /></Suspense>
      </RequireAuth>
    </Container>
  );
}

// Paystack sends the customer back here with ?reference=... after paying
function Result() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const reference = params.get("reference") || params.get("trxref");
  const [state, setState] = useState<"checking" | "paid" | "unpaid" | "error">("checking");
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState("");
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let alive = true;
    async function check() {
      if (!reference) { setState("unpaid"); return; }
      try {
        const r = await api.payments.verify(reference);
        if (!alive) return;
        setOrder(r.order);
        setState(r.paid ? "paid" : "unpaid");
      } catch (e) {
        if (!alive) return;
        setMessage(e instanceof ApiError ? e.message : "We couldn't check your payment.");
        setState("error");
      }
    }
    check();
    return () => { alive = false; };
  }, [reference]);

  async function tryAgain() {
    setRetrying(true);
    try {
      const { authorizationUrl } = await api.payments.initialize(id);
      window.location.href = authorizationUrl;
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : "Couldn't restart the payment.");
      setRetrying(false);
    }
  }

  if (state === "checking")
    return (
      <div className="text-center" role="status">
        <LoaderCircle size={44} className="mx-auto animate-spin text-secondary-600" />
        <h1 className="mt-4 text-xl font-bold">Confirming your payment…</h1>
        <p className="mt-1 text-stone-600">Please don't close this page.</p>
      </div>
    );

  if (state === "paid")
    return (
      <div className="text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success-100 text-success-600"><CircleCheck size={44} /></span>
        <h1 className="mt-4 text-2xl font-extrabold">Payment received</h1>
        <p className="mt-1 text-stone-600">{order ? `${formatNaira(order.total)} for order ${order.orderNumber}. ` : ""}The kitchen will start on it shortly.</p>
        <LinkButton href={`/orders/${id}`} variant="success" size="lg" className="mt-6">Track my order</LinkButton>
      </div>
    );

  return (
    <div className="text-center">
      <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-primary-600"><CircleX size={44} /></span>
      <h1 className="mt-4 text-2xl font-extrabold">{state === "error" ? "We couldn't confirm your payment" : "Payment not completed"}</h1>
      <p className="mt-1 text-stone-600">{message || "If money left your account, don't worry. It will show on your order within a few minutes."}</p>
      <div className="mt-6 flex flex-col gap-3">
        <Button size="lg" onClick={tryAgain} loading={retrying}>Try paying again</Button>
        <Link href={`/orders/${id}`} className="font-semibold text-secondary-600 hover:underline">View my order</Link>
      </div>
    </div>
  );
}
