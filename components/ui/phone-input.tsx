"use client";

import * as React from "react";

import { Input } from "@/components/ui/form-fields";
import { formatMalaysianPhone } from "@/lib/format";

type PhoneInputProps = Omit<
  React.ComponentProps<"input">,
  "type" | "value" | "onChange"
> & {
  value: string;
  onChange: (value: string) => void;
};

/**
 * Malaysian phone field that inserts `-` and the group space while typing.
 * The caret is kept next to the digit that was just entered, so editing in
 * the middle of a number does not jump to the end.
 */
export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  function PhoneInput({ value, onChange, ...props }, ref) {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const caretRef = React.useRef<number | null>(null);

    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    React.useLayoutEffect(() => {
      const input = inputRef.current;
      if (!input || caretRef.current === null) return;
      const caret = caretRef.current;
      caretRef.current = null;
      input.setSelectionRange(caret, caret);
    }, [value]);

    return (
      <Input
        {...props}
        ref={inputRef}
        type="tel"
        inputMode="tel"
        value={value}
        onChange={(event) => {
          const raw = event.target.value;
          const caret = event.target.selectionStart ?? raw.length;
          const digitsBeforeCaret = raw.slice(0, caret).replace(/\D/g, "").length;
          const formatted = formatMalaysianPhone(raw);

          let nextCaret = formatted.length;
          if (digitsBeforeCaret === 0) {
            nextCaret = 0;
          } else {
            let digits = 0;
            for (let index = 0; index < formatted.length; index += 1) {
              if (/\d/.test(formatted[index])) digits += 1;
              if (digits === digitsBeforeCaret) {
                nextCaret = index + 1;
                break;
              }
            }
          }

          caretRef.current = nextCaret;
          onChange(formatted);
        }}
      />
    );
  },
);
