"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Field, NativeSelect } from "@/components/ui/form-fields";

type Option = { value: string; label: string; hint?: string };

export function LinkedSelects({
  className,
  selects,
}: {
  className?: string;
  selects: Array<{
    searchParam: string;
    label: string;
    options: Option[];
    value: string;
    placeholder?: string;
  }>;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const update = (searchParam: string, value: string) => {
    setPending(true);
    const params = new URLSearchParams(window.location.search);
    if (value) {
      params.set(searchParam, value);
    } else {
      params.delete(searchParam);
    }
    // Changing a parent selector resets its children.
    if (searchParam === "class") {
      params.delete("session");
    }
    router.push(`/trainer/attendance?${params.toString()}`);
  };

  return (
    <div className={`grid gap-3 sm:grid-cols-2 ${className ?? ""}`}>
      {selects.map((select) => (
        <Field key={select.searchParam} label={select.label}>
          <NativeSelect
            disabled={pending}
            value={select.value}
            onChange={(e) => update(select.searchParam, e.target.value)}
          >
            {select.placeholder ? (
              <option value="">{select.placeholder}</option>
            ) : null}
            {select.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      ))}
    </div>
  );
}
