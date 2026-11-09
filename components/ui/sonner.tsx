"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      toastOptions={{
        classNames: {
          toast:
            "!rounded-2xl !border-line !bg-[#fbfaf7] !text-ink !shadow-[0_24px_70px_rgba(12,12,13,0.14)]",
          description: "!text-subtle",
          actionButton: "!rounded-full !bg-ink !text-white",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
