"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { toast } from "sonner";

import { Field, Input, Textarea } from "@/components/ui/form-fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateTrainerProfileAction } from "@/lib/trainer-actions";
import { trainerProfileSchema } from "@/lib/validators";

export type TrainerProfileFormValues = {
  fullName: string;
  phone: string;
  specialization: string;
  qualifications: string;
  experienceYears: number;
  bio: string;
  contactEmail: string;
  contactPhone: string;
};

export function TrainerProfileForm({ initial }: { initial: TrainerProfileFormValues }) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<TrainerProfileFormValues>({
    resolver: standardSchemaResolver(trainerProfileSchema),
    defaultValues: initial,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const res = await updateTrainerProfileAction(values);
    if (!res.ok) {
      setServerError(res.error);
      return;
    }
    toast.success(res.message ?? "Profile updated");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-3.5">
      {serverError ? (
        <p className="rounded-2xl bg-danger-soft px-3.5 py-3 text-[0.8rem] text-danger">
          {serverError}
        </p>
      ) : null}

      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Full name" required error={form.formState.errors.fullName?.message}>
          <Input
            data-error={!!form.formState.errors.fullName}
            {...form.register("fullName")}
          />
        </Field>
        <Field label="Phone" error={form.formState.errors.phone?.message}>
          <Input
            autoComplete="tel"
            data-error={!!form.formState.errors.phone}
            {...form.register("phone")}
          />
        </Field>
        <Field label="Specialization" hint="e.g. Badminton & Fitness">
          <Input {...form.register("specialization")} />
        </Field>
        <Field label="Experience (years)" error={form.formState.errors.experienceYears?.message}>
          <Input
            type="number"
            min={0}
            data-error={!!form.formState.errors.experienceYears}
            {...form.register("experienceYears")}
          />
        </Field>
        <Field label="Qualifications" className="sm:col-span-2">
          <Input {...form.register("qualifications")} />
        </Field>
        <Field label="Contact email" error={form.formState.errors.contactEmail?.message}>
          <Input
            type="email"
            data-error={!!form.formState.errors.contactEmail}
            {...form.register("contactEmail")}
          />
        </Field>
        <Field label="Contact phone" error={form.formState.errors.contactPhone?.message}>
          <Input
            autoComplete="tel"
            data-error={!!form.formState.errors.contactPhone}
            {...form.register("contactPhone")}
          />
        </Field>
        <Field label="Bio" className="sm:col-span-2">
          <Textarea placeholder="Short introduction shown to customers." {...form.register("bio")} />
        </Field>
      </div>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
      </div>
    </form>
  );
}
