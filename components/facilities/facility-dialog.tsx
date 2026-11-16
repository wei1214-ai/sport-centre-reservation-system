"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/form-fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { FACILITY_STATUSES } from "@/lib/constants";
import { createFacilityAction, updateFacilityAction } from "@/lib/facility-actions";
import {
  facilitySchema,
  facilityTypeOptions,
  type FacilityFormValues,
} from "@/lib/validators";
import type { FacilityStatus } from "@/types/database";

export type FacilityDialogValues = FacilityFormValues;

const STATUS_LABELS: Record<FacilityStatus, string> = {
  available: "Available",
  maintenance: "Under maintenance",
  unavailable: "Unavailable",
};

export function FacilityDialog({
  mode,
  existing,
  triggerLabel,
  triggerVariant = "brand",
  triggerSize = "md",
}: {
  mode: "create" | "edit";
  existing?: FacilityDialogValues & { id: string };
  triggerLabel: string;
  triggerVariant?: "brand" | "outline" | "subtle";
  triggerSize?: "sm" | "md" | "lg";
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<FacilityDialogValues>({
    resolver: standardSchemaResolver(facilitySchema),
    defaultValues: existing
      ? {
          name: existing.name,
          facilityType: existing.facilityType,
          description: existing.description ?? "",
          location: existing.location ?? "",
          capacity: existing.capacity,
          hourlyRate: existing.hourlyRate,
          openingTime: existing.openingTime,
          closingTime: existing.closingTime,
          status: existing.status,
        }
      : {
          name: "",
          facilityType: "Badminton Court",
          description: "",
          location: "",
          capacity: 4,
          hourlyRate: 30,
          openingTime: "08:00",
          closingTime: "23:00",
          status: "available",
        },
  });

  const typeOptions = facilityTypeOptions(existing?.facilityType);

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const res =
      mode === "create"
        ? await createFacilityAction(values)
        : await updateFacilityAction(existing!.id, values);

    if (!res.ok) {
      setServerError(res.error);
      if (res.fieldErrors) {
        for (const [key, message] of Object.entries(res.fieldErrors)) {
          form.setError(key as keyof FacilityDialogValues, { message });
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
        title={mode === "create" ? "New facility" : `Edit · ${existing?.name}`}
        description={
          mode === "create"
            ? "Add a bookable facility with its price, capacity and daily operating hours."
            : "Update the facility details, price or status. Under-maintenance facilities cannot be booked."
        }
      >
        <form onSubmit={onSubmit} className="grid gap-3.5" noValidate>
          {serverError ? (
            <p className="rounded-2xl bg-danger-soft px-3.5 py-3 text-[0.8rem] text-danger">
              {serverError}
            </p>
          ) : null}

          <Field label="Facility name" required error={form.formState.errors.name?.message}>
            <Input
              placeholder="e.g. Badminton Court A"
              data-error={!!form.formState.errors.name}
              {...form.register("name")}
            />
          </Field>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field
              label="Facility type"
              required
              error={form.formState.errors.facilityType?.message}
            >
              <NativeSelect {...form.register("facilityType")}>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Status" required error={form.formState.errors.status?.message}>
              <NativeSelect {...form.register("status")}>
                {FACILITY_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Capacity" required error={form.formState.errors.capacity?.message}>
              <Input
                type="number"
                min={1}
                max={5000}
                inputMode="numeric"
                data-error={!!form.formState.errors.capacity}
                {...form.register("capacity")}
              />
            </Field>

            <Field
              label="Price per hour (RM)"
              required
              error={form.formState.errors.hourlyRate?.message}
            >
              <Input
                type="number"
                min={0}
                step={0.5}
                inputMode="decimal"
                data-error={!!form.formState.errors.hourlyRate}
                {...form.register("hourlyRate")}
              />
            </Field>

            <Field
              label="Opening time"
              required
              error={form.formState.errors.openingTime?.message}
            >
              <Input
                type="time"
                data-error={!!form.formState.errors.openingTime}
                {...form.register("openingTime")}
              />
            </Field>

            <Field
              label="Closing time"
              required
              error={form.formState.errors.closingTime?.message}
            >
              <Input
                type="time"
                data-error={!!form.formState.errors.closingTime}
                {...form.register("closingTime")}
              />
            </Field>

            <Field
              label="Location"
              hint="Shown to customers, e.g. Level 1."
              error={form.formState.errors.location?.message}
            >
              <Input
                placeholder="e.g. Level 1"
                data-error={!!form.formState.errors.location}
                {...form.register("location")}
              />
            </Field>

            <Field
              label="Description"
              className="sm:col-span-2"
              error={form.formState.errors.description?.message}
            >
              <Textarea
                placeholder="What the facility includes, flooring, equipment…"
                {...form.register("description")}
              />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingLabel={mode === "create" ? "Creating…" : "Saving…"}>
              {mode === "create" ? "Create facility" : "Save changes"}
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
