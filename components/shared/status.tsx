import { Pill } from "@/components/ui/primitives";
import type {
  AttendanceStatus,
  BookingStatus,
  ClassStatus,
  EnrollmentStatus,
  InquiryStatus,
  SessionStatus,
} from "@/types/database";

type Tone = Parameters<typeof Pill>[0]["tone"];

const map: Record<string, { label: string; tone: Tone }> = {
  active: { label: "Active", tone: "success" },
  scheduled: { label: "Scheduled", tone: "brandSoft" },
  confirmed: { label: "Confirmed", tone: "success" },
  paid: { label: "Paid", tone: "success" },
  present: { label: "Present", tone: "success" },
  answered: { label: "Answered", tone: "success" },
  completed: { label: "Completed", tone: "success" },
  open: { label: "Open", tone: "energy" },
  not_marked: { label: "Not marked", tone: "neutral" },
  absent: { label: "Absent", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "danger" },
  failed: { label: "Failed", tone: "danger" },
  withdrawn: { label: "Withdrawn", tone: "danger" },
  unavailable: { label: "Unavailable", tone: "neutral" },
  maintenance: { label: "Maintenance", tone: "warning" },
  late: { label: "Late", tone: "warning" },
  pending: { label: "Pending", tone: "warning" },
  archived: { label: "Archived", tone: "neutral" },
  closed: { label: "Closed", tone: "neutral" },
  expired: { label: "Expired", tone: "neutral" },
  refunded: { label: "Refunded", tone: "neutral" },
  beginner: { label: "Beginner", tone: "brandSoft" },
  intermediate: { label: "Intermediate", tone: "brandSoft" },
  advanced: { label: "Advanced", tone: "energy" },
};

export function StatusPill({ value }: { value: string | null | undefined }) {
  if (!value) return <Pill tone="neutral">—</Pill>;
  const entry = map[value] ?? { label: value.replace(/_/g, " "), tone: "neutral" as Tone };
  return <Pill tone={entry.tone}>{entry.label}</Pill>;
}

export type { AttendanceStatus, BookingStatus, ClassStatus, EnrollmentStatus, InquiryStatus, SessionStatus };
