"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      toastOptions={{
        classNames: {
          toast: "!rounded-[0.65rem] !border-line !bg-surface !text-ink",
          description: "!text-subtle",
          actionButton: "!bg-brand !text-white",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
