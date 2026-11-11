"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  addMonths,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subYears,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const POPUP_WIDTH = 304;
const POPUP_HEIGHT = 400;

function parseValue(value?: string | null): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toValue(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function digitsOnly(input: string): string {
  return input.replace(/\D/g, "").slice(0, 8);
}

function formatDigits(digits: string): string {
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function dateFromDigits(digits: string): Date | null {
  if (digits.length !== 8) return null;
  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4));
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function DatePicker({
  value,
  onChange,
  onValidityChange,
  onBlur,
  id,
  placeholder = "DD/MM/YYYY",
  disabled,
  min,
  max,
  className,
  "data-error": dataError,
}: {
  /** ISO calendar date, `yyyy-MM-dd`. */
  value?: string;
  onChange: (value: string) => void;
  /** Reports whether the typed text is empty or a complete, in-range date. */
  onValidityChange?: (valid: boolean) => void;
  onBlur?: () => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
  className?: string;
  "data-error"?: boolean;
}) {
  const selected = React.useMemo(() => parseValue(value), [value]);
  const minDate = React.useMemo(() => parseValue(min), [min]);
  const maxDate = React.useMemo(() => parseValue(max), [max]);

  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState<"days" | "months" | "years">("days");
  const [cursor, setCursor] = React.useState<Date>(() => selected ?? new Date());
  const [position, setPosition] = React.useState<{ top: number; left: number } | null>(null);
  const selectedText = selected ? format(selected, "dd/MM/yyyy") : "";
  const [text, setText] = React.useState(selectedText);
  const [invalid, setInvalid] = React.useState(false);

  const typingRef = React.useRef(false);
  const containerRef = React.useRef<HTMLSpanElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const popupRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (typingRef.current) return;
    setText(selectedText);
    setInvalid(false);
  }, [selectedText]);

  const placePopup = React.useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    const rect = input.getBoundingClientRect();
    const left = Math.min(
      Math.max(8, rect.left),
      Math.max(8, window.innerWidth - POPUP_WIDTH - 8),
    );
    const below = rect.bottom + 8;
    const top =
      below + POPUP_HEIGHT > window.innerHeight - 8
        ? Math.max(8, rect.top - POPUP_HEIGHT - 8)
        : below;
    setPosition({ top, left });
  }, []);

  const openCalendar = () => {
    if (open) return;
    typingRef.current = false;
    setCursor(selected ?? new Date());
    setView("days");
    placePopup();
    setOpen(true);
  };

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || popupRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Close only the calendar, never a parent dialog that also listens for Escape.
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      inputRef.current?.focus();
    };
    const onReflow = () => placePopup();

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open, placePopup]);

  const isDisabled = (day: Date) => {
    if (minDate && isBefore(day, startOfDay(minDate))) return true;
    if (maxDate && isAfter(day, startOfDay(maxDate))) return true;
    return false;
  };

  const selectDay = (day: Date) => {
    if (isDisabled(day)) return;
    typingRef.current = false;
    setText(format(day, "dd/MM/yyyy"));
    setInvalid(false);
    onValidityChange?.(true);
    onChange(toValue(day));
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const digits = digitsOnly(event.target.value);
    typingRef.current = true;
    setText(formatDigits(digits));
    setInvalid(false);

    if (digits.length === 0) {
      onValidityChange?.(true);
      onChange("");
      return;
    }

    if (digits.length < 8) {
      onChange("");
      return;
    }

    const date = dateFromDigits(digits);
    if (!date || isDisabled(date)) {
      setInvalid(true);
      onValidityChange?.(false);
      onChange("");
      return;
    }

    setCursor(date);
    onValidityChange?.(true);
    onChange(toValue(date));
  };

  const handleBlur = () => {
    typingRef.current = false;
    const digits = digitsOnly(text);
    const date = dateFromDigits(digits);
    if (digits.length === 0) {
      setInvalid(false);
      onValidityChange?.(true);
    } else if (date && !isDisabled(date)) {
      setText(format(date, "dd/MM/yyyy"));
      setInvalid(false);
      onValidityChange?.(true);
    } else {
      // Keep what the user typed so the error is visible instead of silently clearing it.
      setInvalid(true);
      onValidityChange?.(false);
    }
    onBlur?.();
  };

  const today = startOfDay(new Date());
  const monthStart = startOfMonth(cursor);
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
  });
  const decadeStart = Math.floor(cursor.getFullYear() / 12) * 12;
  const years = Array.from({ length: 12 }, (_, i) => decadeStart + i);

  const goPrev = () => {
    if (view === "days") setCursor((d) => subMonths(d, 1));
    else if (view === "months") setCursor((d) => subYears(d, 1));
    else setCursor((d) => subYears(d, 12));
  };

  const goNext = () => {
    if (view === "days") setCursor((d) => addMonths(d, 1));
    else if (view === "months") setCursor((d) => addYears(d, 1));
    else setCursor((d) => addYears(d, 12));
  };

  const heading =
    view === "days"
      ? format(cursor, "MMMM yyyy")
      : view === "months"
        ? format(cursor, "yyyy")
        : `${decadeStart} – ${decadeStart + 11}`;

  return (
    <>
      <span ref={containerRef} className="relative block w-full min-w-0">
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={text}
          disabled={disabled}
          data-error={dataError || invalid}
          aria-invalid={dataError || invalid || undefined}
          onChange={handleInput}
          onBlur={handleBlur}
          onClick={openCalendar}
          onFocus={openCalendar}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              openCalendar();
            }
            if (event.key === "Enter") {
              const digits = digitsOnly(text);
              const date = dateFromDigits(digits);
              const valid = digits.length === 0 || (!!date && !isDisabled(date));
              if (!valid) {
                event.preventDefault();
                setInvalid(true);
                onValidityChange?.(false);
              }
            }
          }}
          className={cn("input pr-10", className)}
        />
        <button
          type="button"
          aria-label={open ? "Close calendar" : "Open calendar"}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => (open ? setOpen(false) : openCalendar())}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-[var(--radius-sm)] p-1.5 text-subtle transition-colors hover:bg-page hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <CalendarDays className="size-4" aria-hidden />
        </button>
      </span>

      {open && position
        ? createPortal(
            <div
              ref={popupRef}
              role="dialog"
              aria-label="Choose date"
              style={{ top: position.top, left: position.left, width: POPUP_WIDTH }}
              className="fixed z-[80] rounded-[1.4rem] border border-line bg-surface p-3.5 shadow-[0_30px_80px_rgba(12,12,13,0.22)]"
            >
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label={view === "days" ? "Previous month" : "Previous year"}
                  className="grid size-8 place-items-center rounded-full text-subtle transition-colors hover:bg-ink/[0.055] hover:text-ink"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setView((current) =>
                      current === "days" ? "months" : current === "months" ? "years" : "months",
                    )
                  }
                  className="rounded-full px-3 py-1 text-[0.9rem] font-medium text-ink transition-colors hover:bg-ink/[0.055]"
                >
                  {heading}
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label={view === "days" ? "Next month" : "Next year"}
                  className="grid size-8 place-items-center rounded-full text-subtle transition-colors hover:bg-ink/[0.055] hover:text-ink"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>

              {view === "days" ? (
                <>
                  <div className="grid grid-cols-7 pb-1">
                    {WEEKDAYS.map((day) => (
                      <span
                        key={day}
                        className="grid h-7 place-items-center text-[0.68rem] font-medium tracking-[0.08em] text-subtle uppercase"
                      >
                        {day}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-y-0.5">
                    {days.map((day) => {
                      const isSelected = !!selected && isSameDay(day, selected);
                      const isToday = isSameDay(day, today);
                      const outside = !isSameMonth(day, cursor);
                      const unavailable = isDisabled(day);
                      return (
                        <button
                          key={day.toISOString()}
                          type="button"
                          data-day
                          data-selected={isSelected}
                          data-today={isToday}
                          disabled={unavailable}
                          onClick={() => selectDay(day)}
                          className={cn(
                            "grid aspect-square place-items-center rounded-full text-[0.82rem] transition-colors",
                            isSelected
                              ? "bg-ink font-medium text-white"
                              : "hover:bg-ink/[0.06]",
                            outside && !isSelected && "text-subtle/40",
                            isToday && !isSelected && "ring-1 ring-ink/25 ring-inset",
                            unavailable && "pointer-events-none opacity-30",
                          )}
                        >
                          {format(day, "d")}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}

              {view === "months" ? (
                <div className="grid grid-cols-3 gap-1.5 py-1">
                  {MONTHS.map((month, index) => {
                    const active = cursor.getMonth() === index;
                    return (
                      <button
                        key={month}
                        type="button"
                        onClick={() => {
                          setCursor((d) => new Date(d.getFullYear(), index, 1));
                          setView("days");
                        }}
                        className={cn(
                          "rounded-xl py-2.5 text-[0.82rem] transition-colors",
                          active
                            ? "bg-ink font-medium text-white"
                            : "text-ink hover:bg-ink/[0.06]",
                        )}
                      >
                        {month.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {view === "years" ? (
                <div className="grid grid-cols-3 gap-1.5 py-1">
                  {years.map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => {
                        setCursor((d) => new Date(year, d.getMonth(), 1));
                        setView("months");
                      }}
                      className={cn(
                        "rounded-xl py-2.5 text-[0.82rem] transition-colors",
                        cursor.getFullYear() === year
                          ? "bg-ink font-medium text-white"
                          : "text-ink hover:bg-ink/[0.06]",
                      )}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2.5">
                <button
                  type="button"
                  onClick={() => {
                    typingRef.current = false;
                    setText("");
                    setInvalid(false);
                    onValidityChange?.(true);
                    onChange("");
                    setOpen(false);
                    inputRef.current?.focus();
                  }}
                  className="rounded-full px-2.5 py-1 text-[0.78rem] text-subtle transition-colors hover:bg-ink/[0.055] hover:text-ink"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => selectDay(today)}
                  disabled={isDisabled(today)}
                  className="rounded-full px-2.5 py-1 text-[0.78rem] font-medium text-ink transition-colors hover:bg-ink/[0.055] disabled:pointer-events-none disabled:opacity-40"
                >
                  Today
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
