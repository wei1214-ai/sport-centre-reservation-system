"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, NativeSelect } from "@/components/ui/form-fields";
import { PAYMENT_METHODS } from "@/lib/constants";
import { enrollInClassAction } from "@/lib/enrollment-actions";

export function EnrollPanel({
  classId,
  fee,
  seatsLeft,
}: {
  classId: string;
  fee: number;
  seatsLeft: number;
}) {
  const router = useRouter();
  const [method, setMethod] = React.useState<string>(PAYMENT_METHODS[0]);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const full = seatsLeft <= 0;

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await enrollInClassAction(classId, method);
      if (!res.ok) {
        setError(res.error);
        router.refresh();
        return;
      }
      toast.success(res.message ?? "Enrolled");
      router.push("/customer/my-classes");
      router.refresh();
    });
  };

  return (
    <div className="surface grid gap-4 p-5">
      <div>
        <p className="text-[0.75rem] text-subtle">Monthly fee</p>
        <p className="text-[1.3rem] font-medium text-ink">RM {fee.toFixed(2)}</p>
        <p className="text-[0.75rem] text-subtle">
          {full ? "This class is full." : `${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left`}
        </p>
      </div>
      {error ? (
        <p className="rounded-2xl bg-danger-soft px-3.5 py-3 text-[0.8rem] text-danger">{error}</p>
      ) : null}
      <Field label="Payment method">
        <NativeSelect value={method} onChange={(e) => setMethod(e.target.value)} disabled={full}>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Button onClick={submit} disabled={full || pending}>
        {pending ? "Processing payment…" : full ? "Class full" : "Pay & enrol"}
      </Button>
      <p className="text-[0.72rem] text-subtle">
        Your seat is confirmed only after payment succeeds. Withdrawing later does not refund the fee.
      </p>
    </div>
  );
}
