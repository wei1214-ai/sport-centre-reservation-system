"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { CalendarPlus, Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, NativeSelect } from "@/components/ui/form-fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { createSessionAction, updateSessionAction } from "@/lib/trainer-actions";
import { sessionSchema } from "@/lib/validators";
import { localDatePart, localTimePart } from "@/lib/format";
import { formatPrice } from "@/lib/utils";

type ClassOption = { id: string; title: string; status: string };
type FacilityOption = {
  id: string;
  name: string;
  capacity: number | null;
  hourlyRate: number;
};

type SessionFormValues = {
  classId: string;
  facilityId: string;
  date: string;
  startTime: string;
  endTime: string;
};

export function SessionDialog({
  mode,
  classes,
  facilities,
  defaultClassId,
  defaultFacilityId,
  session,
  triggerLabel,
  triggerVariant = "brand",
  triggerSize = "md",
}: {
  mode: "create" | "edit";
  classes: ClassOption[];
  /** Available facilities (status = available). The trainer picks one to book. */
  facilities: FacilityOption[];
  defaultClassId?: string;
  defaultFacilityId?: string;
  /**
   * FOR EDIT MODE, PASS ONLY ID-LEVEL DATA - NOT THE FULL RECORD
   */
  session?: {
    id: string;
    start_time: string;
    end_time: string;
    session_status: string;
  };
  triggerLabel: string;
  triggerVariant?: "brand" | "outline" | "subtle" | "ghost";
  triggerSize?: "sm" | "md" | "lg";
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<SessionFormValues>({
    resolver: standardSchemaResolver(sessionSchema),
    defaultValues:
      mode === "edit" && session
        ? {
            classId: "",
            facilityId: defaultFacilityId ?? facilities[0]?.id ?? "",
            date: localDatePart(session.start_time),
            startTime: localTimePart(session.start_time),
            endTime: localTimePart(session.end_time),
          }
        : {
            classId: defaultClassId ?? classes[0]?.id ?? "",
            facilityId: defaultFacilityId ?? facilities[0]?.id ?? "",
            date: localDatePart(new Date()),
            startTime: "18:00",
            endTime: "19:30",
          },
  });

  const selectedFacility = facilities.find(
    (f) => f.id === form.watch("facilityId"),
  );

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const res =
      mode === "create"
        ? await createSessionAction(values)
        : await updateSessionAction(session!.id, values);
    if (!res.ok) {
      setServerError(res.error);
      if (res.fieldErrors) {
        for (const [key, msg] of Object.entries(res.fieldErrors)) {
          form.setError(key as keyof SessionFormValues, { message: msg });
        }
      }
      return;
    }
    toast.success(res.message ?? "Saved");
    setOpen(false);
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
        {mode === "create" ? (
          <CalendarPlus className="size-4" />
        ) : (
          <Pencil className="size-4" />
        )}
        {triggerLabel}
      </Button>
      <DialogContent
        title={mode === "create" ? "Schedule a session" : "Reschedule session"}
        description="Pick the facility and time — the server books that facility for the session and re-validates availability against other bookings, sessions and maintenance."
      >
        <form onSubmit={onSubmit} className="grid gap-3.5" noValidate>
          {serverError ? (
            <p className="rounded-2xl bg-danger-soft px-3.5 py-3 text-[0.8rem] text-danger">
              {serverError}
            </p>
          ) : null}

          {mode === "create" ? (
            <Field label="Class" required error={form.formState.errors.classId?.message}>
              <NativeSelect {...form.register("classId")}>
                {classes
                  .filter((c) => c.status === "active")
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
              </NativeSelect>
            </Field>
          ) : null}

          <Field
            label="Facility"
            required
            hint={
              selectedFacility
                ? `${formatPrice(selectedFacility.hourlyRate)}/hour · seats ${selectedFacility.capacity ?? "—"}`
                : "Choose the venue to book for this session"
            }
            error={form.formState.errors.facilityId?.message}
          >
            <NativeSelect {...form.register("facilityId")}>
              {facilities.map((facility) => (
                <option key={facility.id} value={facility.id}>{facility.name}</option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Date" required error={form.formState.errors.date?.message}>
            <Controller
              control={form.control}
              name="date"
              render={({ field }) => (
                <DatePicker
                  id="session-date"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  data-error={!!form.formState.errors.date}
                />
              )}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start time" required error={form.formState.errors.startTime?.message}>
              <Input
                type="time"
                data-error={!!form.formState.errors.startTime}
                {...form.register("startTime")}
              />
            </Field>
            <Field label="End time" required error={form.formState.errors.endTime?.message}>
              <Input
                type="time"
                data-error={!!form.formState.errors.endTime}
                {...form.register("endTime")}
              />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Checking availability…">
              {mode === "create" ? "Book & schedule" : "Save changes"}
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
