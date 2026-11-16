"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/form-fields";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "available", label: "Available" },
  { value: "maintenance", label: "Under maintenance" },
  { value: "unavailable", label: "Unavailable" },
] as const;

export function FacilityFilters({
  initialQuery,
  activeStatus,
  resultCount,
}: {
  initialQuery: string;
  activeStatus: string;
  resultCount: number;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState(initialQuery);

  function navigate(nextQuery: string, nextStatus: string) {
    const params = new URLSearchParams();
    const trimmed = nextQuery.trim();
    if (trimmed) params.set("q", trimmed);
    if (nextStatus) params.set("status", nextStatus);
    const search = params.toString();
    router.push(search ? `/facilities?${search}` : "/facilities");
  }

  return (
    <div className="surface grid gap-3 p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          navigate(query, activeStatus);
        }}
        className="flex flex-wrap items-center gap-2"
        role="search"
      >
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, type or location"
            aria-label="Search facilities"
            className="pl-9 pr-9"
            style={{ paddingLeft: "2.4rem", paddingRight: "2.4rem" }}
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                navigate("", activeStatus);
              }}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-subtle transition-colors hover:bg-page hover:text-ink"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-full bg-ink px-5 text-[0.85rem] font-medium text-white transition-colors hover:bg-[#262628]"
        >
          Search
        </button>

        <span className="ml-auto text-[0.78rem] text-subtle">
          {resultCount} facilit{resultCount === 1 ? "y" : "ies"}
        </span>
      </form>

      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_FILTERS.map((filter) => {
          const active = activeStatus === filter.value;
          return (
            <button
              key={filter.value || "all"}
              type="button"
              aria-pressed={active}
              onClick={() => navigate(query, filter.value)}
              className={cn(
                "inline-flex h-8 items-center rounded-full px-3.5 text-[0.78rem] font-medium transition-colors",
                active
                  ? "bg-ink text-white"
                  : "border border-line bg-white/70 text-subtle hover:border-ink/15 hover:text-ink",
              )}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
