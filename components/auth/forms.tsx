"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { AlertCircle } from "lucide-react";

import { RolePicker } from "@/components/auth/role-picker";
import { Button } from "@/components/ui/button";
import { Field, Input, PasswordInput } from "@/components/ui/form-fields";
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from "@/lib/validators";
import { loginAction, registerAction, forgotPasswordAction, updatePasswordAction, type AuthActionResult } from "@/lib/auth-actions";
import type { UserRole } from "@/types/database";

/* --------------------------------- Login ---------------------------------- */

type LoginValues = {
  email: string;
  password: string;
  role: UserRole;
};

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const [result, setResult] = React.useState<AuthActionResult | null>(null);

  const form = useForm<LoginValues>({
    resolver: standardSchemaResolver(loginSchema),
    defaultValues: { email: "", password: "", role: "customer" },
    mode: "onSubmit",
  });

  const role = form.watch("role");
  // `nextPath` is consumed by the server action redirect after sign-in.
  void nextPath;

  const onSubmit = form.handleSubmit(async (values) => {
    setResult(null);
    const res = await loginAction({ ...values, role: values.role });
    if (res.ok) return;
    setResult(res);
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      {result && !result.ok ? (
        <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-danger/30 bg-danger-soft px-3 py-2.5 text-[0.82rem] text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{result.error}</span>
        </div>
      ) : null}

      <div className="grid gap-1.5">
        <span className="text-[0.8rem] font-medium text-ink">I am signing in as</span>
        <RolePicker value={role} compact onChange={(r) => form.setValue("role", r)} />
      </div>

      <Field label="Email" required error={form.formState.errors.email?.message}>
        <Input
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          data-error={!!form.formState.errors.email}
          {...form.register("email")}
        />
      </Field>

      <Field label="Password" required error={form.formState.errors.password?.message}>
        <PasswordInput
          autoComplete="current-password"
          placeholder="Your password"
          data-error={!!form.formState.errors.password}
          {...form.register("password")}
        />
      </Field>

      <div className="flex items-center justify-between">
        <Link
          href="/forgot-password"
          className="text-[0.8rem] font-medium text-brand hover:text-brand-hover"
        >
          Forgot password?
        </Link>
        <Link
          href="/register"
          className="text-[0.8rem] font-medium text-subtle hover:text-ink"
        >
          Create account
        </Link>
      </div>

      <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

/* -------------------------------- Register -------------------------------- */

type RegisterValues = {
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  role: UserRole;
  password: string;
  confirmPassword: string;
};

export function RegisterForm() {
  const [pendingRole, setPendingRole] = React.useState<UserRole>("customer");
  const [result, setResult] = React.useState<AuthActionResult | null>(null);

  const form = useForm<RegisterValues>({
    resolver: standardSchemaResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      gender: "",
      dateOfBirth: "",
      role: "customer",
      password: "",
      confirmPassword: "",
    },
  });

  const role = form.watch("role");
  void pendingRole;

  const onSubmit = form.handleSubmit(async (values) => {
    setResult(null);
    const res = await registerAction(values);
    if (res.ok) {
      setResult(res);
      return;
    }
    setResult(res);
  });

  if (result?.ok) {
    return (
      <div className="grid gap-3">
        <div className="rounded-[var(--radius-md)] border border-success/30 bg-success-soft px-3 py-3 text-[0.85rem] text-success">
          <p className="font-semibold">Almost there — confirm your email</p>
          <p className="mt-1 text-[0.82rem]">{result.message}</p>
        </div>
        <Link href="/login" className="justify-self-start">
          <Button variant="subtle">Back to sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3.5" noValidate>
      {result && !result.ok ? (
        <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-danger/30 bg-danger-soft px-3 py-2.5 text-[0.82rem] text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{result.error}</span>
        </div>
      ) : null}

      <div className="grid gap-1.5">
        <span className="text-[0.8rem] font-medium text-ink">Account type</span>
        <RolePicker value={role} onChange={(r) => form.setValue("role", r)} />
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Full name" required className="sm:col-span-2" error={form.formState.errors.fullName?.message}>
          <Input
            autoComplete="name"
            placeholder="e.g. Alex Tan"
            data-error={!!form.formState.errors.fullName}
            {...form.register("fullName")}
          />
        </Field>
        <Field label="Email" required error={form.formState.errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            data-error={!!form.formState.errors.email}
            {...form.register("email")}
          />
        </Field>
        <Field label="Phone" hint="Optional" error={form.formState.errors.phone?.message}>
          <Input
            autoComplete="tel"
            placeholder="e.g. 0123456789"
            data-error={!!form.formState.errors.phone}
            {...form.register("phone")}
          />
        </Field>
        <Field label="Gender" hint="Optional" error={form.formState.errors.gender?.message}>
          <select className="input" {...form.register("gender")}>
            <option value="">Select…</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </Field>
        <Field label="Date of birth" hint="Optional" error={form.formState.errors.dateOfBirth?.message}>
          <Input type="date" {...form.register("dateOfBirth")} />
        </Field>
        <Field label="Password" required className="sm:col-span-2" error={form.formState.errors.password?.message}>
          <PasswordInput
            autoComplete="new-password"
            placeholder="At least 8 characters"
            data-error={!!form.formState.errors.password}
            {...form.register("password")}
          />
        </Field>
        <Field label="Confirm password" required className="sm:col-span-2" error={form.formState.errors.confirmPassword?.message}>
          <PasswordInput
            autoComplete="new-password"
            data-error={!!form.formState.errors.confirmPassword}
            {...form.register("confirmPassword")}
          />
        </Field>
      </div>

      <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-[0.8rem] text-subtle">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand hover:text-brand-hover">
          Sign in
        </Link>
      </p>
    </form>
  );
}

/* ------------------------------ Forgot password ------------------------------ */

export function ForgotPasswordForm() {
  const [result, setResult] = React.useState<AuthActionResult | null>(null);

  const form = useForm<{ email: string }>({
    resolver: standardSchemaResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setResult(null);
    const res = await forgotPasswordAction(values);
    setResult(res);
  });

  if (result?.ok) {
    return (
      <div className="rounded-[var(--radius-md)] border border-success/30 bg-success-soft px-3 py-3 text-[0.85rem] text-success">
        {result.message}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      {result && !result.ok ? (
        <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-danger/30 bg-danger-soft px-3 py-2.5 text-[0.82rem] text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{result.error}</span>
        </div>
      ) : null}
      <Field label="Email" required error={form.formState.errors.email?.message}>
        <Input
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          data-error={!!form.formState.errors.email}
          {...form.register("email")}
        />
      </Field>
      <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Sending…" : "Send reset link"}
      </Button>
      <Link href="/login" className="text-center text-[0.8rem] text-subtle hover:text-ink">
        Back to sign in
      </Link>
    </form>
  );
}

/* ------------------------------ Reset password ------------------------------ */

export function ResetPasswordForm() {
  const [result, setResult] = React.useState<AuthActionResult | null>(null);

  const form = useForm<{ password: string; confirmPassword: string }>({
    resolver: standardSchemaResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setResult(null);
    const res = await updatePasswordAction(values);
    if (res.ok) return;
    setResult(res);
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      {result && !result.ok ? (
        <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-danger/30 bg-danger-soft px-3 py-2.5 text-[0.82rem] text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{result.error}</span>
        </div>
      ) : null}
      <Field label="New password" required error={form.formState.errors.password?.message}>
        <PasswordInput
          autoComplete="new-password"
          placeholder="At least 8 characters"
          data-error={!!form.formState.errors.password}
          {...form.register("password")}
        />
      </Field>
      <Field label="Confirm new password" required error={form.formState.errors.confirmPassword?.message}>
        <PasswordInput
          autoComplete="new-password"
          data-error={!!form.formState.errors.confirmPassword}
          {...form.register("confirmPassword")}
        />
      </Field>
      <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Updating…" : "Set new password"}
      </Button>
    </form>
  );
}
