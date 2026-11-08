import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";

export function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn("input", className)}
      {...props}
    />
  );
}

/**
 * Password field with a visibility toggle (eye icon).
 * Forwards the RHF registration ref so `form.register(...)` keeps working.
 */
export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(function PasswordInput({ className, ...props }, ref) {
  const [visible, setVisible] = React.useState(false);
  return (
    <span className="relative block">
      <Input
        ref={ref}
        type={visible ? "text" : "password"}
        className={cn("pr-10", className)}
        {...props}
      />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute top-1/2 right-2 -translate-y-1/2 rounded-[var(--radius-sm)] p-1.5 text-subtle transition-colors hover:bg-page hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </span>
  );
});

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea className={cn("input min-h-24 resize-y", className)} {...props} />
  );
}

export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn("input appearance-none bg-surface pr-8", className)}
      {...props}
    />
  );
}

export function Label({ className, ...props }: Omit<React.ComponentProps<"label">, "htmlFor">) {
  return (
    <label
      className={cn("text-[0.8rem] font-medium text-ink", className)}
      {...props}
    />
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
  required,
}: {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      {label ? (
        <label htmlFor={htmlFor} className="text-[0.8rem] font-medium text-ink">
          {label}
          {required ? <span className="ml-0.5 text-danger">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-[0.72rem] font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="text-[0.72rem] text-subtle">{hint}</p>
      ) : null}
    </div>
  );
}
