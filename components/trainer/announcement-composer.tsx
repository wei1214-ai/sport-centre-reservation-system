"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, NativeSelect, Textarea } from "@/components/ui/form-fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { postAnnouncementAction } from "@/lib/trainer-actions";
import { announcementSchema } from "@/lib/validators";

type ClassOption = { id: string; title: string; studentCount: number };

export function AnnouncementComposer({ classes }: { classes: ClassOption[] }) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<{ classId: string; message: string }>({
    resolver: standardSchemaResolver(announcementSchema),
    defaultValues: { classId: classes[0]?.id ?? "", message: "" },
  });

  const selected = form.watch("classId");
  const studentCount = classes.find((c) => c.id === selected)?.studentCount ?? 0;

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const res = await postAnnouncementAction(values);
    if (!res.ok) {
      setServerError(res.error);
      return;
    }
    toast.success(res.message ?? "Announcement sent");
    form.setValue("message", "");
    router.refresh();
  });

  if (!classes.length) {
    return (
      <div className="surface p-4 text-[0.85rem] text-subtle">
        Create a class first — announcements are sent to its class chat room.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="surface grid gap-3 p-4">
      {serverError ? (
        <p className="rounded-2xl bg-danger-soft px-3.5 py-3 text-[0.8rem] text-danger">
          {serverError}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)_1fr]">
        <Field label="Class" error={form.formState.errors.classId?.message}>
          <NativeSelect {...form.register("classId")}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field
          label="Message"
          className="sm:row-span-2"
          hint={`Goes to the class chat room as an announcement${studentCount ? ` and to ${studentCount} enrolled student${studentCount === 1 ? "" : "s"}` : ""}.`}
          error={form.formState.errors.message?.message}
        >
          <Textarea
            placeholder="e.g. Please bring your own racket and arrive 10 minutes early."
            data-error={!!form.formState.errors.message}
            {...form.register("message")}
          />
        </Field>
        <div className="flex sm:hidden items-end" />
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => form.setValue("message", "")}>
          Clear
        </Button>
        <SubmitButton pendingLabel="Sending…">
          <Megaphone className="size-4" />
          Send announcement
        </SubmitButton>
      </div>
    </form>
  );
}
