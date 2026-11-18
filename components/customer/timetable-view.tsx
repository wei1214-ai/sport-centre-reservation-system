"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { StatusPill } from "@/components/shared/status";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { formatDayLabel, formatTimeOnly, localDatePart } from "@/lib/format";
import { cn } from "@/lib/utils";

export type TimetableEntry = {
  id: string;
  kind: "booking" | "class";
  title: string;
  subtitle: string;
  facility: string;
  start: string;
  end: string;
  status: string;
  reference?: string;
};

const DAY_MS = 86_400_000;
const parse = (key: string) => new Date(`${key}T00:00:00Z`);
const toKey = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (key: string, n: number) => toKey(new Date(parse(key).getTime() + n * DAY_MS));
const mondayOf = (key: string) => {
  const d = parse(key);
  return addDays(key, -((d.getUTCDay() + 6) % 7));
};
const label = (key: string, opts: Intl.DateTimeFormatOptions) =>
  parse(key).toLocaleDateString("en-MY", { timeZone: "UTC", ...opts });

function chipClass(kind: TimetableEntry["kind"], status: string) {
  if (status === "cancelled") return "bg-[#efede7] text-subtle line-through";
  return kind === "booking" ? "bg-ink text-white" : "bg-energy-soft text-warning";
}

export function TimetableView({ items, today }: { items: TimetableEntry[]; today: string }) {
  const [mode, setMode] = React.useState<"week" | "month">("week");
  const [anchor, setAnchor] = React.useState(today);
  const [selected, setSelected] = React.useState<TimetableEntry | null>(null);

  const byDay = React.useMemo(() => {
    const map = new Map<string, TimetableEntry[]>();
    items.forEach((item) => {
      const key = localDatePart(item.start);
      map.set(key, [...(map.get(key) ?? []), item]);
    });
    return map;
  }, [items]);

  let days: string[];
  let title: string;
  if (mode === "week") {
    const start = mondayOf(anchor);
    days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    title = `${label(days[0], { day: "numeric", month: "short" })} – ${label(days[6], {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`;
  } else {
    const first = `${anchor.slice(0, 7)}-01`;
    const start = mondayOf(first);
    const next = new Date(Date.UTC(Number(anchor.slice(0, 4)), Number(anchor.slice(5, 7)), 1));
    const monthEnd = addDays(toKey(next), -1);
    const weeks = Math.ceil(((parse(monthEnd).getTime() - parse(start).getTime()) / DAY_MS + 1) / 7);
    days = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
    title = label(first, { month: "long", year: "numeric" });
  }

  const shift = (dir: 1 | -1) => {
    if (mode === "week") return setAnchor(addDays(anchor, dir * 7));
    const d = parse(anchor);
    setAnchor(toKey(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + dir, 1))));
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => shift(-1)} aria-label="Previous">
            <ChevronLeft className="size-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAnchor(today)}>
            Today
          </Button>
          <Button size="sm" variant="outline" onClick={() => shift(1)} aria-label="Next">
            <ChevronRight className="size-4" />
          </Button>
          <p className="ml-2 text-[0.95rem] font-medium text-ink">{title}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={mode === "week" ? "brand" : "outline"}
            onClick={() => setMode("week")}
          >
            Week
          </Button>
          <Button
            size="sm"
            variant={mode === "month" ? "brand" : "outline"}
            onClick={() => setMode("month")}
          >
            Month
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-[0.75rem] text-subtle">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-ink" /> Facility booking
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-warning" /> Class session
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[44rem] grid-cols-7 gap-2">
          {days.slice(0, 7).map((d) => (
            <p key={d} className="px-1 text-[0.72rem] font-medium uppercase tracking-wide text-subtle">
              {label(d, { weekday: "short" })}
            </p>
          ))}
          {days.map((d) => {
            const list = byDay.get(d) ?? [];
            const inMonth = mode === "week" || d.slice(0, 7) === anchor.slice(0, 7);
            const shown = mode === "month" ? list.slice(0, 3) : list;
            return (
              <div
                key={d}
                className={cn(
                  "surface grid content-start gap-1.5 p-2",
                  mode === "week" ? "min-h-40" : "min-h-24",
                  !inMonth && "opacity-45",
                  d === today && "ring-2 ring-ink/70",
                )}
              >
                <p className="text-[0.75rem] font-medium text-ink">{label(d, { day: "numeric" })}</p>
                {shown.map((item) => (
                  <button
                    key={`${item.kind}-${item.id}`}
                    type="button"
                    onClick={() => setSelected(item)}
                    className={cn(
                      "rounded-lg px-2 py-1 text-left text-[0.7rem] leading-tight",
                      chipClass(item.kind, item.status),
                    )}
                  >
                    <span className="block font-medium">{formatTimeOnly(item.start)}</span>
                    <span className="block truncate">{item.title}</span>
                  </button>
                ))}
                {list.length > shown.length ? (
                  <p className="px-1 text-[0.68rem] text-subtle">+{list.length - shown.length} more</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        {selected ? (
          <DialogContent title={selected.title} description={selected.subtitle}>
            <div className="grid gap-3 text-[0.85rem]">
              <Row k="Facility" v={selected.facility} />
              <Row k="Date" v={formatDayLabel(selected.start)} />
              <Row k="Time" v={`${formatTimeOnly(selected.start)} – ${formatTimeOnly(selected.end)}`} />
              {selected.reference ? <Row k="Reference" v={selected.reference} /> : null}
              <div className="flex items-center justify-between">
                <span className="text-subtle">Status</span>
                <StatusPill value={selected.status} />
              </div>
              <div className="flex justify-end pt-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={selected.kind === "booking" ? "/customer/bookings" : "/customer/my-classes"}>
                    {selected.kind === "booking" ? "Manage booking" : "Open my classes"}
                  </Link>
                </Button>
              </div>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-subtle">{k}</span>
      <span className="text-right font-medium text-ink">{v}</span>
    </div>
  );
}
