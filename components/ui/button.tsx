import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius-md)] font-semibold transition-colors duration-100 disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-none focus-visible:box-shadow-[0_0_0_3px_var(--brand-soft)]",
  {
    variants: {
      variant: {
        brand:
          "bg-brand text-white hover:bg-brand-hover",
        outline:
          "border border-line bg-surface text-ink hover:border-brand/40 hover:text-brand",
        subtle:
          "bg-brand-soft text-brand hover:bg-[color-mix(in_srgb,var(--brand-soft)_75%,#fff)]",
        ghost:
          "text-subtle hover:text-ink hover:bg-page",
        danger:
          "border border-[color-mix(in_srgb,var(--danger)_25%,transparent)] bg-danger-soft text-danger hover:bg-[color-mix(in_srgb,var(--danger-soft)_70%,#fff)]",
        energy:
          "bg-energy text-[#23160a] hover:brightness-95",
      },
      size: {
        sm: "h-8 px-3 text-[0.8rem]",
        md: "h-9.5 px-4 text-[0.9rem]",
        lg: "h-11 px-5 text-[0.95rem]",
        icon: "size-9 p-0",
        iconSm: "size-8 p-0",
      },
    },
    defaultVariants: {
      variant: "brand",
      size: "md",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-variant={variant ?? undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
