"use client";

import * as React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/form-fields";
import { deleteCustomerAccountAction } from "@/lib/customer-actions";

export function DeleteAccountCard() {
  const [open, setOpen] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const confirmed = confirmation.trim().toUpperCase() === "DELETE";

  async function handleDelete(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmed) return;

    setError(null);
    setBusy(true);
    const res = await deleteCustomerAccountAction({ confirmation });
    setBusy(false);

    if (!res.ok) setError(res.error);
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-danger-soft text-danger">
          <AlertTriangle className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[0.95rem] font-medium text-ink">Delete your account</p>
          <p className="mt-1 text-[0.83rem] leading-relaxed text-subtle">
            This is permanent and cannot be undone. Your personal details and
            fitness profile are removed, and you will be signed out.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-danger/15 bg-danger-soft/60 px-4 py-3.5">
        <p className="max-w-md text-[0.78rem] leading-relaxed text-danger">
          Booking, enrollment, payment and attendance records stay in the system
          for audit, linked to an anonymized &ldquo;Deleted customer&rdquo; profile.
        </p>
        <Button variant="danger" onClick={() => setOpen(true)}>
          <Trash2 className="size-4" />
          Delete my account
        </Button>
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setConfirmation("");
            setError(null);
          }
        }}
      >
        <DialogContent
          title="Delete your account?"
          description="Your personal data will be removed and you will be signed out immediately."
        >
          <ul className="mb-5 grid gap-1.5 text-[0.8rem] leading-relaxed text-subtle">
            <li>• Name, phone, gender, date of birth and photo are cleared.</li>
            <li>• Fitness details, training plans, notifications and inquiries are deleted.</li>
            <li>• Bookings, enrollments, payments and attendance are retained for audit.</li>
          </ul>

          <form onSubmit={handleDelete} className="grid gap-4">
            <Field
              label="Type DELETE to confirm"
              htmlFor="deleteConfirmation"
              required
              error={error ?? undefined}
            >
              <Input
                id="deleteConfirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                autoCapitalize="characters"
                data-error={!!error}
              />
            </Field>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                disabled={!confirmed || busy}
              >
                {busy ? "Deleting…" : "Delete account"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
