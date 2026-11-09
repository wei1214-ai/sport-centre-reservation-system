import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 focus-visible:ring-offset-2 focus-visible:ring-offset-page active:scale-[0.985]",
  {
    variants: {
      variant: {
        brand: "bg-ink text-white hover:bg-[#262628]",
        outline:
          "border border-line bg-white/70 text-ink hover:border-ink/15 hover:bg-white",
        subtle: "bg-[#efede7] text-ink hover:bg-[#e7e4dc]",
        ghost: "text-subtle hover:bg-ink/[0.045] hover:text-ink",
        danger:
          "bg-danger-soft text-danger hover:bg-[color-mix(in_srgb,var(--danger-soft)_72%,#fff)]",
        energy:
          "bg-energy-soft text-warning hover:bg-[color-mix(in_srgb,var(--energy-soft)_70%,#fff)]",
        inverse: "bg-white text-ink hover:bg-white/90",
        glass:
          "border border-white/75 bg-white/50 text-ink backdrop-blur-md hover:bg-white/75",
      },
      size: {
        sm: "h-8 px-3.5 text-[0.78rem]",
        md: "h-10 px-5 text-[0.85rem]",
        lg: "h-12 px-6 text-[0.9rem]",
        icon: "size-10 p-0",
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
