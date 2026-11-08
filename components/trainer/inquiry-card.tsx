"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MessageSquareDot, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/form-fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { StatusPill } from "@/components/shared/status";
import { replyToInquiryAction, setInquiryStatusAction } from "@/lib/trainer-actions";
import { replySchema } from "@/lib/validators";
import { formatDateTime } from "@/lib/format";
import type { InquiryStatus } from "@/types/database";

export type InquiryCardData = {
  id: string;
  subject: string;
  message: string;
  reply: string | null;
  inquiry_status: InquiryStatus;
  created_at: string;
  replied_at: string | null;
  classTitle: string | null;
  customerName: string;
  customerEmail: string;
};

export function InquiryCard({ inquiry }: { inquiry: InquiryCardData }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const form = useForm<{ reply: string }>({
    resolver: standardSchemaResolver(replySchema.omit({ inquiryId: true })),
    defaultValues: { reply: inquiry.reply ?? "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setBusy(true);
    const res = await replyToInquiryAction(inquiry.id, values.reply);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(res.message ?? "Reply sent");
    setOpen(false);
    router.refresh();
  });

  return (
    <div className="surface flex flex-col gap-2.5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[0.92rem] font-semibold text-ink">{inquiry.subject}</p>
          <p className="mt-0.5 text-[0.75rem] text-subtle">
            {inquiry.classTitle ?? "Class"} · {inquiry.customerName} ·{" "}
            {formatDateTime(inquiry.created_at)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <StatusPill value={inquiry.inquiry_status} />
          <InquiryStatusMenu inquiryId={inquiry.id} status={inquiry.inquiry_status} />
        </div>
      </div>

      <p className="line-clamp-2 text-[0.83rem] text-subtle">{inquiry.message}</p>

      {inquiry.reply ? (
        <p className="rounded-[var(--radius-md)] bg-page px-3 py-2 text-[0.82rem] text-ink">
          <span className="font-semibold">Your reply · </span>
          {inquiry.reply}
        </p>
      ) : null}

      <div>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <MessageSquareDot className="size-4" />
          {inquiry.reply ? "View & update reply" : "Reply"}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title={inquiry.subject}
          description={`${inquiry.customerName} · ${inquiry.customerEmail}`}
        >
          <div className="grid gap-3.5">
            <div className="rounded-[var(--radius-md)] bg-page px-3 py-2.5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-subtle">
                Customer message
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[0.85rem] text-ink">
                {inquiry.message}
              </p>
              {inquiry.replied_at ? (
                <p className="mt-2 text-[0.7rem] text-subtle">
                  Last replied {formatDateTime(inquiry.replied_at)}
                </p>
              ) : null}
            </div>

            <form onSubmit={onSubmit} className="grid gap-2">
              <Field label="Reply" required error={form.formState.errors.reply?.message}>
                <Textarea
                  placeholder="Answer the customer's question…"
                  data-error={!!form.formState.errors.reply}
                  {...form.register("reply")}
                />
              </Field>
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setOpen(false)}
                >
                  Close
                </Button>
                <SubmitButton pendingLabel="Sending…">Send reply</SubmitButton>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InquiryStatusMenu({
  inquiryId,
  status,
}: {
  inquiryId: string;
  status: InquiryStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  const run = async (next: InquiryStatus) => {
    setBusy(true);
    const res = await setInquiryStatusAction(inquiryId, next);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(res.message ?? "Updated");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="iconSm" aria-label="Inquiry status" disabled={busy}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Set status</DropdownMenuLabel>
        <DropdownMenuItem active={status === "open"} onSelect={() => run("open")}>
          Open
        </DropdownMenuItem>
        <DropdownMenuItem active={status === "answered"} onSelect={() => run("answered")}>
          Answered
        </DropdownMenuItem>
        <DropdownMenuItem active={status === "closed"} onSelect={() => run("closed")}>
          Closed
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
