"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/form-fields";
import { cn } from "@/lib/utils";

const ROLE_FILTERS = [
  { value: "", label: "All accounts" },
  { value: "customer", label: "Customers" },
  { value: "trainer", label: "Trainers" },
] as const;

const STATUS_FILTERS = [
  { value: "", label: "Any status" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
] as const;

export function AccountFilters({
  initialQuery,
  activeRole,
  activeStatus,
  resultCount,
}: {
  initialQuery: string;
  activeRole: string;
  activeStatus: string;
  resultCount: number;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState(initialQuery);

  function navigate(nextQuery: string, nextRole: string, nextStatus: string) {
    const params = new URLSearchParams();
    const trimmed = nextQuery.trim();
    if (trimmed) params.set("q", trimmed);
    if (nextRole) params.set("role", nextRole);
    if (nextStatus) params.set("status", nextStatus);
    const search = params.toString();
    router.push(search ? `/admin/accounts?${search}` : "/admin/accounts");
  }

  return (
    <div className="surface grid gap-3 p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          navigate(query, activeRole, activeStatus);
        }}
        className="flex flex-wrap items-center gap-2"
        role="search"
      >
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, email or phone"
            aria-label="Search accounts"
            className="pl-9 pr-9"
            style={{ paddingLeft: "2.4rem", paddingRight: "2.4rem" }}
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                navigate("", activeRole, activeStatus);
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
          {resultCount} account{resultCount === 1 ? "" : "s"}
        </span>
      </form>

      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-subtle">
            Role
          </span>
          {ROLE_FILTERS.map((filter) => {
            const active = activeRole === filter.value;
            return (
              <button
                key={filter.value || "all-roles"}
                type="button"
                aria-pressed={active}
                onClick={() => navigate(query, filter.value, activeStatus)}
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

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-subtle">
            Status
          </span>
          {STATUS_FILTERS.map((filter) => {
            const active = activeStatus === filter.value;
            return (
              <button
                key={filter.value || "all-status"}
                type="button"
                aria-pressed={active}
                onClick={() => navigate(query, activeRole, filter.value)}
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
    </div>
  );
}
