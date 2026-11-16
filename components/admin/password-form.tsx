"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { toast } from "sonner";

import { Field, PasswordInput } from "@/components/ui/form-fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { changeAdminPasswordAction } from "@/lib/admin-actions";
import { changePasswordSchema } from "@/lib/validators";

type PasswordValues = {
  currentPassword: string;
  password: string;
  confirmPassword: string;
};

export function AdminPasswordForm() {
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<PasswordValues>({
    resolver: standardSchemaResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onSubmit",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const res = await changeAdminPasswordAction(values);
    if (!res.ok) {
      setServerError(res.error);
      if (res.fieldErrors) {
        for (const [key, message] of Object.entries(res.fieldErrors)) {
          form.setError(key as keyof PasswordValues, { message });
        }
      }
      return;
    }
    toast.success(res.message ?? "Password updated");
    form.reset();
  });

  return (
    <form onSubmit={onSubmit} className="grid max-w-xl gap-4" noValidate>
      <p className="text-[0.83rem] leading-relaxed text-subtle">
        Confirm your current password, then choose a new one. You will stay signed
        in on this device.
      </p>

      {serverError ? (
        <p className="rounded-2xl bg-danger-soft px-3.5 py-3 text-[0.8rem] text-danger">
          {serverError}
        </p>
      ) : null}

      <Field
        label="Current password"
        htmlFor="currentPassword"
        required
        error={form.formState.errors.currentPassword?.message}
      >
        <PasswordInput
          id="currentPassword"
          autoComplete="current-password"
          placeholder="Your current password"
          data-error={!!form.formState.errors.currentPassword}
          {...form.register("currentPassword")}
        />
      </Field>

      <Field
        label="New password"
        htmlFor="password"
        required
        hint="At least 8 characters."
        error={form.formState.errors.password?.message}
      >
        <PasswordInput
          id="password"
          autoComplete="new-password"
          placeholder="New password"
          data-error={!!form.formState.errors.password}
          {...form.register("password")}
        />
      </Field>

      <Field
        label="Confirm new password"
        htmlFor="confirmPassword"
        required
        error={form.formState.errors.confirmPassword?.message}
      >
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          placeholder="Repeat the new password"
          data-error={!!form.formState.errors.confirmPassword}
          {...form.register("confirmPassword")}
        />
      </Field>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Updating…">Update password</SubmitButton>
      </div>
    </form>
  );
}
