"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { toast } from "sonner";

import { Field, Input, Textarea } from "@/components/ui/form-fields";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { FITNESS_LEVELS } from "@/lib/constants";
import { updateCustomerFitnessAction } from "@/lib/customer-actions";
import { customerFitnessSchema } from "@/lib/validators";

export type CustomerFitnessFormValues = {
  heightCm: string;
  weightKg: string;
  fitnessLevel: (typeof FITNESS_LEVELS)[number] | "";
  fitnessGoals: string;
  medicalConditions: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
};

const LEVEL_LABELS: Record<(typeof FITNESS_LEVELS)[number], string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export function FitnessForm({ initial }: { initial: CustomerFitnessFormValues }) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<CustomerFitnessFormValues>({
    resolver: standardSchemaResolver(customerFitnessSchema),
    defaultValues: initial,
    mode: "onSubmit",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const res = await updateCustomerFitnessAction(values);
    if (!res.ok) {
      setServerError(res.error);
      if (res.fieldErrors) {
        for (const [key, message] of Object.entries(res.fieldErrors)) {
          form.setError(key as keyof CustomerFitnessFormValues, { message });
        }
      }
      return;
    }
    toast.success(res.message ?? "Fitness details updated");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <p className="text-[0.83rem] leading-relaxed text-subtle">
        Optional details that help trainers understand your starting point. You
        can leave any field blank.
      </p>

      {serverError ? (
        <p className="rounded-2xl bg-danger-soft px-3.5 py-3 text-[0.8rem] text-danger">
          {serverError}
        </p>
      ) : null}

      <div className="grid gap-3.5 sm:grid-cols-3">
        <Field label="Height (cm)" htmlFor="heightCm" error={form.formState.errors.heightCm?.message}>
          <Input
            id="heightCm"
            type="number"
            inputMode="decimal"
            min={50}
            max={250}
            step="0.1"
            placeholder="e.g. 172"
            data-error={!!form.formState.errors.heightCm}
            {...form.register("heightCm")}
          />
        </Field>

        <Field label="Weight (kg)" htmlFor="weightKg" error={form.formState.errors.weightKg?.message}>
          <Input
            id="weightKg"
            type="number"
            inputMode="decimal"
            min={20}
            max={300}
            step="0.1"
            placeholder="e.g. 68"
            data-error={!!form.formState.errors.weightKg}
            {...form.register("weightKg")}
          />
        </Field>

        <Field
          label="Fitness level"
          htmlFor="fitnessLevel"
          error={form.formState.errors.fitnessLevel?.message}
        >
          <Controller
            control={form.control}
            name="fitnessLevel"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger
                  id="fitnessLevel"
                  onBlur={field.onBlur}
                  data-error={!!form.formState.errors.fitnessLevel}
                >
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {FITNESS_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {LEVEL_LABELS[level]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field
          label="Fitness goals"
          htmlFor="fitnessGoals"
          className="sm:col-span-3"
          error={form.formState.errors.fitnessGoals?.message}
        >
          <Textarea
            id="fitnessGoals"
            placeholder="e.g. Improve stamina for weekly badminton and build strength."
            data-error={!!form.formState.errors.fitnessGoals}
            {...form.register("fitnessGoals")}
          />
        </Field>

        <Field
          label="Medical conditions or injuries"
          htmlFor="medicalConditions"
          className="sm:col-span-3"
          hint="Share anything a trainer should know before a session."
          error={form.formState.errors.medicalConditions?.message}
        >
          <Textarea
            id="medicalConditions"
            placeholder="e.g. Asthma, previous knee injury (2023)."
            data-error={!!form.formState.errors.medicalConditions}
            {...form.register("medicalConditions")}
          />
        </Field>

        <Field
          label="Emergency contact name"
          htmlFor="emergencyContactName"
          error={form.formState.errors.emergencyContactName?.message}
        >
          <Input
            id="emergencyContactName"
            autoComplete="name"
            placeholder="e.g. Jamie Tan"
            data-error={!!form.formState.errors.emergencyContactName}
            {...form.register("emergencyContactName")}
          />
        </Field>

        <Field
          label="Emergency contact phone"
          htmlFor="emergencyContactPhone"
          className="sm:col-span-2"
          error={form.formState.errors.emergencyContactPhone?.message}
        >
          <Controller
            control={form.control}
            name="emergencyContactPhone"
            render={({ field }) => (
              <PhoneInput
                id="emergencyContactPhone"
                autoComplete="tel"
                placeholder="e.g. 012-345 6789"
                data-error={!!form.formState.errors.emergencyContactPhone}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </Field>
      </div>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving…">Save fitness details</SubmitButton>
      </div>
    </form>
  );
}
