/** Domain constants shared by forms and validation. */

export const SPORT_TYPES = [
  "Badminton",
  "Basketball",
  "Fitness",
  "Swimming",
  "Tennis",
  "Table Tennis",
  "Futsal",
  "Yoga",
  "Pilates",
  "Kickboxing",
  "Squash",
  "Volleyball",
] as const;

export const CLASS_DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
export const FITNESS_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export const CLASS_STATUSES = ["active", "archived"] as const;

/** Facility catalogue shared by the admin form, filters and display. */
export const FACILITY_TYPES = [
  "Badminton Court",
  "Futsal Court",
  "Swimming Pool",
  "Gym",
  "Basketball Court",
  "Fitness Studio",
  "Tennis Court",
  "Table Tennis Court",
  "Squash Court",
  "Multi-Purpose Hall",
  "Other",
] as const;

export const FACILITY_STATUSES = ["available", "unavailable", "maintenance"] as const;
export const SESSION_STATUSES = ["scheduled", "completed", "cancelled"] as const;
export const ATTENDANCE_STATUSES = ["present", "absent", "late"] as const;
export const INQUIRY_STATUSES = ["open", "answered", "closed"] as const;
export const GENDERS = ["Male", "Female"] as const;
export const USER_ROLES = ["customer", "trainer", "admin"] as const;

export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
