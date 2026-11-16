"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { toast } from "sonner";

import { Field, Input } from "@/components/ui/form-fields";
import { PhoneInput } from "@/components/ui/phone-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateAdminProfileAction } from "@/lib/admin-actions";
import { adminProfileSchema } from "@/lib/validators";

export type AdminProfileFormValues = {
  fullName: string;
  email: string;
  phone: string;
};

export function AdminPersonalDetailsForm({
  initial,
}: {
  initial: AdminProfileFormValues;
}) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<AdminProfileFormValues>({
    resolver: standardSchemaResolver(adminProfileSchema),
    defaultValues: initial,
    mode: "onSubmit",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const res = await updateAdminProfileAction(values);
    if (!res.ok) {
      setServerError(res.error);
      if (res.fieldErrors) {
        for (const [key, message] of Object.entries(res.fieldErrors)) {
          form.setError(key as keyof AdminProfileFormValues, { message });
        }
      }
      return;
    }
    toast.success(res.message ?? "Profile updated");
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
          className="sm:col-span-2"
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

        <Field
          label="Contact phone"
          htmlFor="phone"
          error={form.formState.errors.phone?.message}
        >
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
      </div>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving…">Save details</SubmitButton>
      </div>
    </form>
  );
}
