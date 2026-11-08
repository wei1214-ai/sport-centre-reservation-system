/**
 * Database types.
 *
 * These types were written from the ACTUAL Supabase schema (project
 * fjubbwtefxinsbaoegxi) by reading the live PostgREST API. Columns match the
 * real database; friendly TS names are kept in sync with the DB columns.
 */

export type UserRole = "customer" | "trainer" | "admin";

export type FacilityStatus = "available" | "unavailable" | "maintenance";
export type ClassDifficulty = "beginner" | "intermediate" | "advanced";
export type ClassStatus = "active" | "cancelled" | "archived";
export type SessionStatus = "scheduled" | "completed" | "cancelled";
export type BookingStatus = "confirmed" | "cancelled" | "completed";
export type EnrollmentStatus = "active" | "withdrawn" | "completed";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type AttendanceStatus = "present" | "absent" | "late";
export type InquiryStatus = "open" | "answered" | "closed";
export type MessageScheme = "message" | "announcement";
export type MembershipStatus = "active" | "expired" | "cancelled";
export type NotificationType =
  | "general"
  | "booking"
  | "class_reminder"
  | "announcement";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  // Database evolves with the project; relation tables are typed below.
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          auth_user_id: string | null;
          full_name: string;
          email: string;
          phone: string | null;
          role: UserRole;
          gender: string | null;
          date_of_birth: string | null;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          full_name: string;
          email: string;
          phone?: string | null;
          role: UserRole;
          gender?: string | null;
          date_of_birth?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_profiles"]["Insert"]>;
      };
      membership_tiers: {
        Row: {
          id: string;
          name: string;
          price: number;
          duration_days: number;
          description: string | null;
          benefits: string[] | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["membership_tiers"]["Row"], "id" | "created_at">> & {
          name: string;
          price: number;
        };
        Update: Partial<Database["public"]["Tables"]["membership_tiers"]["Insert"]>;
      };
      customer_memberships: {
        Row: {
          id: string;
          customer_id: string;
          membership_tier_id: string;
          start_date: string;
          end_date: string;
          status: MembershipStatus;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["customer_memberships"]["Row"], "id" | "created_at">>;
        Update: Partial<Database["public"]["Tables"]["customer_memberships"]["Insert"]>;
      };
      trainers: {
        Row: {
          id: string;
          user_id: string;
          specialization: string | null;
          qualifications: string | null;
          experience_years: number | null;
          bio: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["trainers"]["Row"], "id" | "created_at">>;
        Update: Partial<Database["public"]["Tables"]["trainers"]["Insert"]>;
      };
      facilities: {
        Row: {
          id: string;
          name: string;
          facility_type: string;
          description: string | null;
          location: string | null;
          capacity: number | null;
          hourly_rate: number;
          status: FacilityStatus;
          image_url: string | null;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["facilities"]["Row"], "id" | "created_at">>;
        Update: Partial<Database["public"]["Tables"]["facilities"]["Insert"]>;
      };
      facility_maintenance: {
        Row: {
          id: string;
          facility_id: string;
          start_time: string;
          end_time: string;
          reason: string | null;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["facility_maintenance"]["Row"], "id" | "created_at">>;
        Update: Partial<Database["public"]["Tables"]["facility_maintenance"]["Insert"]>;
      };
      sports_classes: {
        Row: {
          id: string;
          trainer_id: string;
          /** Legacy/default venue. New classes leave this null (chosen per session). */
          facility_id: string | null;
          title: string;
          sport_type: string;
          description: string | null;
          difficulty_level: ClassDifficulty;
          capacity: number;
          /** Monthly class fee in RM, set by the trainer. */
          fee: number;
          /** Sessions per month; per-session price = fee / sessions_per_month. */
          sessions_per_month: number;
          status: ClassStatus;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["sports_classes"]["Row"], "id" | "created_at">> & {
          trainer_id: string;
          title: string;
          capacity: number;
          fee: number;
        };
        Update: Partial<Database["public"]["Tables"]["sports_classes"]["Insert"]>;
      };
      class_sessions: {
        Row: {
          id: string;
          class_id: string;
          start_time: string;
          end_time: string;
          session_status: SessionStatus;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["class_sessions"]["Row"], "id" | "created_at">>;
        Update: Partial<Database["public"]["Tables"]["class_sessions"]["Insert"]>;
      };
      facility_bookings: {
        Row: {
          id: string;
          customer_id: string;
          facility_id: string;
          start_time: string;
          end_time: string;
          total_price: number;
          status: BookingStatus;
          booking_reference: string;
          cancellation_reason: string | null;
          /** Class this booking serves (null for plain customer bookings). */
          class_id: string | null;
          /** Session this booking reserves the facility for. */
          session_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["facility_bookings"]["Row"], "id" | "created_at" | "updated_at">> & {
          customer_id: string;
          facility_id: string;
          start_time: string;
          end_time: string;
        };
        Update: Partial<Database["public"]["Tables"]["facility_bookings"]["Insert"]>;
      };
      class_enrollments: {
        Row: {
          id: string;
          class_id: string;
          customer_id: string;
          enrolled_at: string;
          status: EnrollmentStatus;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["class_enrollments"]["Row"], "id">>;
        Update: Partial<Database["public"]["Tables"]["class_enrollments"]["Insert"]>;
      };
      payments: {
        Row: {
          id: string;
          customer_id: string;
          booking_id: string | null;
          enrollment_id: string | null;
          amount: number;
          payment_method: string;
          payment_status: PaymentStatus;
          transaction_reference: string | null;
          paid_at: string | null;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["payments"]["Row"], "id" | "created_at" | "paid_at">>;
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
      };
      attendance: {
        Row: {
          id: string;
          enrollment_id: string;
          session_id: string;
          attendance_status: AttendanceStatus;
          marked_at: string | null;
          marked_by: string | null;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["attendance"]["Row"], "id">>;
        Update: Partial<Database["public"]["Tables"]["attendance"]["Insert"]>;
      };
      chat_rooms: {
        Row: {
          id: string;
          class_id: string;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["chat_rooms"]["Row"], "id" | "created_at">>;
        Update: Partial<Database["public"]["Tables"]["chat_rooms"]["Insert"]>;
      };
      chat_messages: {
        Row: {
          id: string;
          chat_room_id: string;
          sender_id: string | null;
          message: string;
          message_type: MessageScheme;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["chat_messages"]["Row"], "id" | "created_at">>;
        Update: Partial<Database["public"]["Tables"]["chat_messages"]["Insert"]>;
      };
      class_inquiries: {
        Row: {
          id: string;
          class_id: string;
          customer_id: string;
          trainer_id: string;
          subject: string;
          message: string;
          reply: string | null;
          inquiry_status: InquiryStatus;
          created_at: string;
          replied_at: string | null;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["class_inquiries"]["Row"], "id" | "created_at" | "replied_at">>;
        Update: Partial<Database["public"]["Tables"]["class_inquiries"]["Insert"]>;
      };
      training_plans: {
        Row: {
          id: string;
          customer_id: string;
          age: number;
          gender: string;
          height_cm: number;
          weight_kg: number;
          fitness_level: string;
          fitness_goal: string;
          timeframe_weeks: number;
          plan_content: Json;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["training_plans"]["Row"], "id" | "created_at">>;
        Update: Partial<Database["public"]["Tables"]["training_plans"]["Insert"]>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          notification_type: NotificationType;
          is_read: boolean;
          scheduled_at: string | null;
          sent_at: string | null;
          created_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["notifications"]["Row"], "id" | "created_at">>;
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
      };
      booking_reschedule_history: {
        Row: {
          id: string;
          booking_id: string;
          old_start_time: string;
          old_end_time: string;
          new_start_time: string;
          new_end_time: string;
          changed_at: string;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["booking_reschedule_history"]["Row"], "id">>;
        Update: Partial<Database["public"]["Tables"]["booking_reschedule_history"]["Insert"]>;
      };
    };
  };
}

export type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"];
export type MembershipTier = Database["public"]["Tables"]["membership_tiers"]["Row"];
export type CustomerMembership = Database["public"]["Tables"]["customer_memberships"]["Row"];
export type Trainer = Database["public"]["Tables"]["trainers"]["Row"];
export type Facility = Database["public"]["Tables"]["facilities"]["Row"];
export type FacilityMaintenance = Database["public"]["Tables"]["facility_maintenance"]["Row"];
export type SportsClass = Database["public"]["Tables"]["sports_classes"]["Row"];
export type ClassSession = Database["public"]["Tables"]["class_sessions"]["Row"];
export type FacilityBooking = Database["public"]["Tables"]["facility_bookings"]["Row"];
export type ClassEnrollment = Database["public"]["Tables"]["class_enrollments"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type Attendance = Database["public"]["Tables"]["attendance"]["Row"];
export type ChatRoom = Database["public"]["Tables"]["chat_rooms"]["Row"];
export type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];
export type ClassInquiry = Database["public"]["Tables"]["class_inquiries"]["Row"];
export type TrainingPlan = Database["public"]["Tables"]["training_plans"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
