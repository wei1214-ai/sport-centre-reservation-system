import type { FieldErrors } from "@/lib/validators";

/** Standard result shape returned by Server Actions to client forms. */
export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export function failure(error: string, fieldErrors?: FieldErrors): ActionResult {
  return fieldErrors ? { ok: false, error, fieldErrors } : { ok: false, error };
}

export function success(message?: string): ActionResult {
  return message ? { ok: true, message } : { ok: true };
}
