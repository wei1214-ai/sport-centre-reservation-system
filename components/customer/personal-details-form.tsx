"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format, subYears } from "date-fns";
import { Controller, useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { toast } from "sonner";

import { DatePicker } from "@/components/ui/date-picker";
import { Field, Input } from "@/components/ui/form-fields";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { GENDERS } from "@/lib/constants";
import { updateCustomerProfileAction } from "@/lib/customer-actions";
import { customerProfileSchema } from "@/lib/validators";

export type CustomerProfileFormValues = {
  fullName: string;
  email: string;
  phone: string;
  gender: (typeof GENDERS)[number] | "";
  dateOfBirth: string;
};

export function PersonalDetailsForm({
  initial,
}: {
  initial: CustomerProfileFormValues;
}) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const dobMin = React.useMemo(
    () => format(subYears(new Date(), 120), "yyyy-MM-dd"),
    [],
  );
  const dobMax = React.useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  const form = useForm<CustomerProfileFormValues>({
    resolver: standardSchemaResolver(customerProfileSchema),
    defaultValues: initial,
    mode: "onSubmit",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const res = await updateCustomerProfileAction(values);
    if (!res.ok) {
      setServerError(res.error);
      if (res.fieldErrors) {
        for (const [key, message] of Object.entries(res.fieldErrors)) {
          form.setError(key as keyof CustomerProfileFormValues, { message });
        }
      }
      return;
    }
    toast.success(res.message ?? "Personal details updated");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      {serverError ? (
        <p className="rounded-2xl bg-danger-soft px-3.5 py-3 text-[0.8rem] text-danger">
          {serverError}
        </p>
      ) : null}

      <div className="grid items-start gap-3.5 sm:grid-cols-2">
        <Field
          label="Full name"
          htmlFor="fullName"
          required
          error={form.formState.errors.fullName?.message}
        >
          <Input
            id="fullName"
            autoComplete="name"
            data-error={!!form.formState.errors.fullName}
            {...form.register("fullName")}
          />
        </Field>

        <Field
          label="Contact email"
          htmlFor="email"
          required
          error={form.formState.errors.email?.message}
        >
          <Input
            id="email"
            type="email"
            autoComplete="email"
            data-error={!!form.formState.errors.email}
            {...form.register("email")}
          />
        </Field>

        <Field label="Contact phone" htmlFor="phone" error={form.formState.errors.phone?.message}>
          <Controller
            control={form.control}
            name="phone"
            render={({ field }) => (
              <PhoneInput
                id="phone"
                autoComplete="tel"
                placeholder="e.g. 011-2000 1010"
                data-error={!!form.formState.errors.phone}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </Field>

        <Field label="Gender" htmlFor="gender" error={form.formState.errors.gender?.message}>
          <Controller
            control={form.control}
            name="gender"
            render={({ field }) => (
              <Select
                value={field.value || undefined}
                onValueChange={field.onChange}
              >
                <SelectTrigger
                  id="gender"
                  onBlur={field.onBlur}
                  data-error={!!form.formState.errors.gender}
                >
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((gender) => (
                    <SelectItem key={gender} value={gender}>
                      {gender}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field
          label="Date of birth"
          htmlFor="dateOfBirth"
          className="sm:col-span-2"
          error={form.formState.errors.dateOfBirth?.message}
        >
          <Controller
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <DatePicker
                id="dateOfBirth"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                min={dobMin}
                max={dobMax}
                data-error={!!form.formState.errors.dateOfBirth}
              />
            )}
          />
        </Field>
      </div>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving…">Save details</SubmitButton>
      </div>
    </form>
  );
}
