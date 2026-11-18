"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/form-fields";
import { ConfirmDialog } from "@/components/ui/tabs-dialog";
import { PAYMENT_METHODS } from "@/lib/constants";
import { payClassFeeAction, withdrawFromClassAction } from "@/lib/enrollment-actions";

export function ClassEnrollmentActions({
  enrollmentId,
  className,
  canPay,
  fee,
}: {
  enrollmentId: string;
  className: string;
  canPay: boolean;
  fee: number;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [method, setMethod] = React.useState<string>(PAYMENT_METHODS[0]);
  const [pending, startTransition] = React.useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error ?? "Something went wrong");
      else toast.success(res.message ?? "Done");
      setOpen(false);
      router.refresh();
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canPay ? (
        <>
          <NativeSelect
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="h-9 w-auto min-w-44"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </NativeSelect>
          <Button
            size="sm"
            disabled={pending}
            onClick={() => run(() => payClassFeeAction(enrollmentId, method))}
          >
            Pay RM {fee.toFixed(2)}
          </Button>
        </>
      ) : null}
      <Button size="sm" variant="danger" disabled={pending} onClick={() => setOpen(true)}>
        Withdraw
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Withdraw from ${className}?`}
        description="You will lose your seat and the fee you already paid is not refunded."
        confirmLabel="Withdraw"
        danger
        onConfirm={() => run(() => withdrawFromClassAction(enrollmentId))}
      />
    </div>
  );
}
