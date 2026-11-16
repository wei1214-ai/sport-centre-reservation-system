"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";

import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/form-fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { setAccountActiveAction } from "@/lib/admin-account-actions";

type ReasonValues = { reason: string };

export function AccountStatusDialog({
  profileId,
  fullName,
  active,
  triggerLabel,
  triggerVariant = "outline",
  triggerSize = "sm",
}: {
  profileId: string;
  fullName: string;
  /** Current state: true = active, false = suspended. */
  active: boolean;
  triggerLabel: string;
  triggerVariant?: ButtonProps["variant"];
  triggerSize?: ButtonProps["size"];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  // `active` is the CURRENT state, so the target state is its opposite:
  // active accounts are being suspended, suspended accounts are reactivated.
  const suspending = active;

  const form = useForm<ReasonValues>({
    defaultValues: { reason: "" },
    // The Server Action re-validates with the canonical schema; these rules
    // only give immediate feedback for this single field.
    mode: "onSubmit",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const res = await setAccountActiveAction({
      profileId,
      active: !suspending,
      reason: values.reason,
    });

    if (!res.ok) {
      setServerError(res.error);
      if (res.fieldErrors?.reason) {
        form.setError("reason", { message: res.fieldErrors.reason });
      }
      return;
    }

    toast.success(res.message ?? "Account updated");
    setOpen(false);
    form.reset({ reason: "" });
    router.refresh();
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setServerError(null);
          form.clearErrors();
        }
      }}
    >
      <Button
        variant={triggerVariant}
        size={triggerSize}
        onClick={() => {
          form.reset({ reason: "" });
          form.clearErrors();
          setServerError(null);
          setOpen(true);
        }}
      >
        {suspending ? <ShieldOff className="size-4" /> : <ShieldCheck className="size-4" />}
        {triggerLabel}
      </Button>

      <DialogContent
        title={suspending ? `Suspend ${fullName}?` : `Reactivate ${fullName}?`}
        description={
          suspending
            ? "They will be blocked from signing in until you reactivate the account. Nothing is deleted."
            : "They will be able to sign in again and keep every previous record."
        }
      >
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          {serverError ? (
            <p className="rounded-2xl bg-danger-soft px-3.5 py-3 text-[0.8rem] text-danger">
              {serverError}
            </p>
          ) : null}

          {suspending ? (
            <Field
              label="Reason"
              required
              hint="Visible to administrators only. It is not emailed to the account."
              error={form.formState.errors.reason?.message}
            >
              <Textarea
                placeholder="e.g. Repeated no-shows after two warnings"
                rows={3}
                data-error={!!form.formState.errors.reason}
                {...form.register("reason", {
                  maxLength: {
                    value: 300,
                    message: "Keep the reason under 300 characters",
                  },
                  validate: (value) =>
                    !suspending ||
                    value.trim().length >= 3 ||
                    "Give a short reason (at least 3 characters)",
                })}
              />
            </Field>
          ) : (
            <p className="rounded-2xl bg-success-soft px-4 py-3 text-[0.8rem] leading-relaxed text-success">
              Reactivating restores sign-in immediately. Their bookings, classes,
              payments and attendance records were never removed.
            </p>
          )}

          <div className="rounded-2xl border border-line bg-page/60 px-4 py-3 text-[0.76rem] leading-relaxed text-subtle">
            {suspending ? (
              <>
                Suspension keeps all history for reporting and audit. Existing
                sessions end on their next page load; any upcoming classes stay
                scheduled, so reassign them if someone else will run them.
              </>
            ) : (
              <>
                Any class sessions that were scheduled while the account was
                suspended are still in place. Review their timetable after
                reactivation.
              </>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={form.formState.isSubmitting}
            >
              Cancel
            </Button>
            <SubmitButton
              variant={suspending ? "danger" : "brand"}
              pendingLabel={suspending ? "Suspending…" : "Reactivating…"}
            >
              {suspending ? "Suspend account" : "Reactivate account"}
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
