import { z } from "zod";
import {
  CLASS_DIFFICULTIES,
  CLASS_STATUSES,
  GENDERS,
  INQUIRY_STATUSES,
  SPORT_TYPES,
  USER_ROLES,
} from "@/lib/constants";
import { combineLocalDateTime } from "@/lib/format";

/**
 * Demo rows in this project use UUID-shaped identifiers whose version/variant
 * nibbles are zero, which zod's strict `.uuid()` rejects. Accept any
 * 8-4-4-4-12 hexadecimal identifier instead (Postgres does the same).
 */
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Database row id validated by shape only (see ID_RE above). */
const idString = (message?: string) => z.string().regex(ID_RE, message ?? "Invalid record id");

/** Sized so Supabase public key + forms stay consistent everywhere. */
export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Password is too long");

export const roleSchema = z.enum(USER_ROLES);

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
  role: roleSchema,
});

/**
 * Malaysian numbers in national (`0…`) or international (`+60…`/`60…`) form.
 * Mobile numbers are 10 digits (`01X` + 7) or 11 digits (`011`/`015` + 8).
 * Landlines are `03` + 8, `04`–`09` + 7, or `08X` + 6 digits.
 */
function isValidMalaysianPhone(value: string) {
  const compact = value.replace(/[\s()-]/g, "");
  if (!/^\+?\d+$/.test(compact)) return false;

  let nsn: string;
  if (compact.startsWith("+60")) {
    nsn = compact.slice(3);
  } else if (compact.startsWith("60")) {
    nsn = compact.slice(2);
  } else if (compact.startsWith("0")) {
    nsn = compact.slice(1);
  } else {
    return false;
  }

  // Mobile: 011/015 use an 8-digit subscriber; other 01X codes use 7.
  if (/^1[15]\d{8}$/.test(nsn)) return true;
  if (/^1[02-46-9]\d{7}$/.test(nsn)) return true;

  // Landline: Klang Valley, other Peninsular codes, then East Malaysia.
  if (/^3\d{8}$/.test(nsn)) return true;
  if (/^8[2-9]\d{6}$/.test(nsn)) return true;
  return /^[4-79]\d{7}$/.test(nsn);
}

/** Real calendar date, not in the future and no more than 120 years old. */
function isValidDateOfBirth(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return false;
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (date.getTime() > today.getTime()) return false;

  const oldest = new Date();
  oldest.setFullYear(oldest.getFullYear() - 120);
  oldest.setHours(0, 0, 0, 0);
  return date.getTime() >= oldest.getTime();
}

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Enter your full name")
      .max(120, "Name is too long"),
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
    phone: z
      .string()
      .trim()
      .min(1, "Phone number is required")
      .refine(isValidMalaysianPhone, "Enter a valid Malaysian phone number"),
    gender: z.enum(GENDERS, { message: "Select a gender" }),
    dateOfBirth: z
      .string()
      .min(1, "Date of birth is required")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
      .refine(isValidDateOfBirth, "Enter a valid date of birth"),
    role: roleSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/* ---------------- Trainer module schemas ---------------- */

export const classSchema = z.object({
  title: z.string().trim().min(3, "Title is required").max(120, "Title is too long"),
  sportType: z.enum(SPORT_TYPES, "Select a sport"),
  description: z
    .string()
    .trim()
    .max(600, "Keep the description under 600 characters")
    .optional()
    .or(z.literal("")),
  difficulty: z.enum(CLASS_DIFFICULTIES, "Select a difficulty level"),
  capacity: z.coerce
    .number()
    .int("Capacity must be a whole number")
    .min(1, "Capacity must be at least 1")
    .max(200, "Capacity is too large"),
  /** Monthly class fee in RM (set by the trainer). */
  fee: z.coerce
    .number()
    .min(0, "Monthly fee must be zero or more")
    .max(99999, "Monthly fee is too large"),
  sessionsPerMonth: z.coerce
    .number()
    .int("Sessions per month must be a whole number")
    .min(1, "At least 1 session per month")
    .max(31, "At most 31 sessions per month"),
  status: z.enum(CLASS_STATUSES),
});

export const sessionSchema = z
  .object({
    classId: idString("Select a class"),
    /** Facility chosen at scheduling time; the session books this venue. */
    facilityId: idString("Select a facility"),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Pick a start time"),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Pick an end time"),
  })
  .superRefine((val, ctx) => {
    if (val.startTime >= val.endTime) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "End time must be after start time",
      });
    }
  });

export interface SessionWindow {
  classId: string;
  facilityId: string;
  startISO: string;
  endISO: string;
}

/** Builds a UTC window from the local session form values. */
export function sessionWindow(val: z.infer<typeof sessionSchema>): SessionWindow {
  return {
    classId: val.classId,
    facilityId: val.facilityId,
    startISO: combineLocalDateTime(val.date, val.startTime),
    endISO: combineLocalDateTime(val.date, val.endTime),
  };
}

export const replySchema = z.object({
  inquiryId: idString(),
  reply: z.string().trim().min(1, "Write a reply").max(1000, "Keep the reply under 1000 characters"),
});

export const inquiryStatusSchema = z.object({
  inquiryId: idString(),
  status: z.enum(INQUIRY_STATUSES),
});

export const attendanceSchema = z.object({
  sessionId: idString(),
  enrollmentId: idString(),
  status: z.enum(["present", "absent", "late", "not_marked"]),
});

export const announcementSchema = z.object({
  classId: idString(),
  message: z.string().trim().min(3, "Write a message").max(600, "Keep it under 600 characters"),
});

export const trainerProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Name is required").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{6,20}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
  specialization: z.string().trim().max(120).optional().or(z.literal("")),
  qualifications: z.string().trim().max(200).optional().or(z.literal("")),
  experienceYears: z.coerce
    .number()
    .int("Whole years only")
    .min(0, "Cannot be negative")
    .max(60, "Experience is too large"),
  bio: z.string().trim().max(600).optional().or(z.literal("")),
  contactEmail: z.string().trim().email("Enter a valid email").or(z.literal("")),
  contactPhone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{6,20}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
});

/** Flat field errors for forms. */
export type FieldErrors = Record<string, string>;

export function zodFieldErrors(err: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") ?? "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
