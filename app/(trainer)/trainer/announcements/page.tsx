import { requireTrainerRecord } from "@/lib/trainer";
import {
  countActiveEnrollments,
  listRecentAnnouncements,
  listTrainerClasses,
} from "@/lib/trainer";
import { PageHeader, EmptyState, Pill } from "@/components/ui/primitives";
import { AnnouncementComposer } from "@/components/trainer/announcement-composer";
import { formatDateTime } from "@/lib/format";
import { Megaphone } from "lucide-react";

export const metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  const { trainer, supabase } = await requireTrainerRecord();

  const [classes, announcements] = await Promise.all([
    listTrainerClasses(supabase, trainer.id),
    listRecentAnnouncements(supabase, trainer.id),
  ]);

  const counts = await countActiveEnrollments(supabase, classes.map((c) => c.id));

  const composerClasses = classes
    .filter((c) => c.status === "active")
    .map((c) => ({ id: c.id, title: c.title, studentCount: counts.get(c.id) ?? 0 }));

  return (
    <div className="grid gap-7">
      <PageHeader
        title="Announcements"
        subtitle="Broadcast a message to an enrolled class — it lands in the class chat and in each student's notifications."
      />

      <AnnouncementComposer classes={composerClasses} />

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Recent announcements</h2>
          <Pill tone="neutral">{announcements.length}</Pill>
        </div>
        {announcements.length ? (
          <div className="grid gap-2.5">
            {announcements.map((item) => (
              <div key={item.id} className="surface flex gap-3 px-4 py-3">
                <span className="mt-0.5 hidden sm:block">
                  <span className="grid size-9 place-items-center rounded-full bg-[linear-gradient(135deg,#e7efff,#f0e6ff)] text-ink/70">
                    <Megaphone className="size-4" />
                  </span>
                </span>
                <div className="min-w-0">
                  <p className="text-[0.85rem] font-semibold text-ink">
                    {item.classTitle ?? "Class"}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-[0.83rem] text-subtle">
                    {item.message}
                  </p>
                  <p className="mt-1 text-[0.72rem] text-subtle">
                    {formatDateTime(item.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            className="border-dashed"
            title="No announcements yet"
            description="Nothing has been broadcast to your classes so far."
          />
        )}
      </section>
    </div>
  );
}
