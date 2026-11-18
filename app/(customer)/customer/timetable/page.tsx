import { TimetableView } from "@/components/customer/timetable-view";
import { PageHeader } from "@/components/ui/primitives";
import { requireRole } from "@/lib/auth";
import { todayLocal } from "@/lib/booking";
import { listTimetableItems } from "@/lib/enrollment";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Timetable" };

export default async function TimetablePage() {
  const profile = await requireRole("customer");
  const supabase = await createSupabaseServerClient();
  const items = await listTimetableItems(supabase, profile.id);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Timetable"
        subtitle="Your facility bookings and class sessions by week or month. Select an item for details."
      />
      <TimetableView items={items} today={todayLocal()} />
    </div>
  );
}
