"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Textarea, NativeSelect } from "@/components/ui/form-fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { CLASS_DIFFICULTIES, CLASS_STATUSES, SPORT_TYPES } from "@/lib/constants";
import { perSessionPrice } from "@/lib/format";
import { formatPrice } from "@/lib/utils";
import { createClassAction, updateClassAction } from "@/lib/trainer-actions";
import { classSchema } from "@/lib/validators";

export type ClassFormValues = {
  title: string;
  sportType: (typeof SPORT_TYPES)[number];
  description: string;
  difficulty: (typeof CLASS_DIFFICULTIES)[number];
  capacity: number;
  /** Monthly class fee in RM, set by the trainer. */
  fee: number;
  sessionsPerMonth: number;
  status: (typeof CLASS_STATUSES)[number];
};

export function ClassDialog({
  mode,
  existing,
  triggerLabel,
  triggerVariant = "brand",
  triggerSize = "md",
}: {
  mode: "create" | "edit";
  existing?: ClassFormValues & { id: string };
  triggerLabel: string;
  triggerVariant?: "brand" | "outline" | "subtle";
  triggerSize?: "sm" | "md" | "lg";
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<ClassFormValues>({
    resolver: standardSchemaResolver(classSchema),
    defaultValues: existing
      ? {
          title: existing.title,
          sportType: existing.sportType,
          description: existing.description ?? "",
          difficulty: existing.difficulty,
          capacity: existing.capacity,
          fee: existing.fee,
          sessionsPerMonth: existing.sessionsPerMonth ?? 8,
          status: existing.status,
        }
      : {
          title: "",
          sportType: "Badminton",
          description: "",
          difficulty: "beginner",
          capacity: 12,
          fee: 160,
          sessionsPerMonth: 8,
          status: "active",
        },
  });

  const watchedFee = form.watch("fee");
  const watchedTimes = form.watch("sessionsPerMonth");
  const perSession =
    typeof watchedFee === "number" && typeof watchedTimes === "number"
      ? perSessionPrice(watchedFee, watchedTimes)
      : 0;

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const res =
      mode === "create"
        ? await createClassAction(values)
        : await updateClassAction(existing!.id, values);
    if (!res.ok) {
      setServerError(res.error);
      if (res.fieldErrors) {
        for (const [key, msg] of Object.entries(res.fieldErrors)) {
          form.setError(key as keyof ClassFormValues, { message: msg });
        }
      }
      return;
    }
    toast.success(res.message ?? "Saved");
    setOpen(false);
    form.reset(values);
    router.refresh();
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setServerError(null);
      }}
    >
      <Button onClick={() => setOpen(true)} variant={triggerVariant} size={triggerSize}>
        {mode === "create" ? <Plus className="size-4" /> : <Pencil className="size-4" />}
        {triggerLabel}
      </Button>
      <DialogContent
        title={mode === "create" ? "New class" : `Edit · ${existing?.title}`}
        description={
          mode === "create"
            ? "Set sport type, capacity and the monthly fee. The facility is chosen later, when you schedule each session."
            : "Update the class details. Fees are monthly; the per-session price is derived automatically."
        }
      >
        <form onSubmit={onSubmit} className="grid gap-3.5" noValidate>
          {serverError ? (
            <p className="rounded-2xl bg-danger-soft px-3.5 py-3 text-[0.8rem] text-danger">
              {serverError}
            </p>
          ) : null}

          <Field label="Class title" required error={form.formState.errors.title?.message}>
            <Input
              placeholder="e.g. Beginner Badminton Class"
              data-error={!!form.formState.errors.title}
              {...form.register("title")}
            />
          </Field>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Sport type" required error={form.formState.errors.sportType?.message}>
              <NativeSelect {...form.register("sportType")}>
                {SPORT_TYPES.map((sport) => (
                  <option key={sport} value={sport}>{sport}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Difficulty" required error={form.formState.errors.difficulty?.message}>
              <NativeSelect {...form.register("difficulty")}>
                {CLASS_DIFFICULTIES.map((level) => (
                  <option key={level} value={level}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field
              label="Capacity"
              required
              error={form.formState.errors.capacity?.message}
            >
              <Input
                type="number"
                min={1}
                data-error={!!form.formState.errors.capacity}
                {...form.register("capacity")}
              />
            </Field>
            <Field label="Status" error={form.formState.errors.status?.message}>
              <NativeSelect {...form.register("status")}>
                {CLASS_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field
              label="Monthly fee (RM)"
              required
              hint={
                watchedTimes > 0
                  ? `≈ ${formatPrice(perSession)} per session`
                  : undefined
              }
              error={form.formState.errors.fee?.message}
            >
              <Input
                type="number"
                min={0}
                step={0.5}
                data-error={!!form.formState.errors.fee}
                {...form.register("fee")}
              />
            </Field>
            <Field
              label="Sessions per month"
              required
              hint={
                watchedFee > 0 && watchedTimes > 0
                  ? `${formatPrice(watchedFee)}/month · ${formatPrice(perSession)}/session`
                  : "e.g. 8 sessions per month"
              }
              error={form.formState.errors.sessionsPerMonth?.message}
            >
              <Input
                type="number"
                min={1}
                max={31}
                data-error={!!form.formState.errors.sessionsPerMonth}
                {...form.register("sessionsPerMonth")}
              />
            </Field>
            <Field
              label="Description"
              className="sm:col-span-2"
              error={form.formState.errors.description?.message}
            >
              <Textarea
                placeholder="What students will learn, what to bring…"
                {...form.register("description")}
              />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingLabel={mode === "create" ? "Creating…" : "Saving…"}>
              {mode === "create" ? "Create class" : "Save changes"}
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
