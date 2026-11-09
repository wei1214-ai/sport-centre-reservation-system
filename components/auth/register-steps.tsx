"use client";

import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Compact two-step indicator for the register form.
 * Purely presentational; step state lives in the form.
 */
export function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex w-full items-center gap-3" aria-label={`Step ${step} of 2`}>
      <span className="eyebrow shrink-0">Step {step} of 2</span>
      <span className="flex flex-1 gap-2" aria-hidden>
        {[1, 2].map((s) => (
          <span
            key={s}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              step >= s ? "bg-ink" : "bg-line",
            )}
          />
        ))}
      </span>
    </div>
  );
}

export function BackToStepButton({
  onBack,
}: {
  onBack: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-1.5 text-[0.85rem] font-medium text-subtle transition-colors hover:text-ink"
    >
      <ArrowLeft className="size-3.5" />
      Back
    </button>
  );
}
