"use client";

import * as React from "react";

import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs-dialog";
import { EmptyState } from "@/components/ui/primitives";
import { StatusPill } from "@/components/shared/status";
import { SessionRowActions } from "@/components/trainer/session-row-actions";
import { SessionDialog } from "@/components/trainer/session-dialogs";
import { formatDayLabel, formatTimeOnly } from "@/lib/format";

export type SessionRowData = {
  id: string;
  start_time: string;
  end_time: string;
  session_status: string;
  classId: string;
  classTitle: string;
  facilityName: string | null;
  facilityId: string | null;
};

export type FacilityOption = {
  id: string;
  name: string;
  capacity: number | null;
  hourlyRate: number;
};

export function ClassSessionsList({
  groups,
  classOptions,
  facilities,
}: {
  groups: { upcoming: SessionRowData[]; past: SessionRowData[]; cancelled: SessionRowData[] };
  classOptions: { id: string; title: string; status: string }[];
  facilities: FacilityOption[];
}) {
  const router = useRouter();

  const renderRow = (session: SessionRowData) => (
    <div
      key={session.id}
      className="surface flex flex-wrap items-center justify-between gap-3 px-4 py-3"
    >
      <div className="min-w-0">
        <p className="truncate text-[0.9rem] font-semibold text-ink">
          {session.classTitle}
          {session.facilityName ? (
            <span className="ml-1.5 text-[0.75rem] font-medium text-subtle">
              · {session.facilityName}
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 text-[0.78rem] text-subtle">
          {formatDayLabel(session.start_time)} · {formatTimeOnly(session.start_time)} –{" "}
          {formatTimeOnly(session.end_time)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <StatusPill value={session.session_status} />
        <SessionRowActions
          session={{
            id: session.id,
            start_time: session.start_time,
            end_time: session.end_time,
            session_status: session.session_status,
          }}
          facilities={facilities}
          facilityId={session.facilityId}
        />
      </div>
    </div>
  );

  const upcomingEmpty = (
    <EmptyState
      className="border-dashed"
      title="No upcoming sessions"
      description={
        classOptions.length
          ? "Schedule the next session when the class is ready to run."
          : "Create a class first, then schedule its sessions."
      }
      action={<SessionDialog mode="create" classes={classOptions} facilities={facilities} triggerLabel="Schedule session" triggerSize="sm" />}
    />
  );

  return (
    <Tabs defaultValue="upcoming" onValueChange={() => router.refresh()}>
      <TabsList>
        <TabsTrigger value="upcoming">Upcoming ({groups.upcoming.length})</TabsTrigger>
        <TabsTrigger value="past">Past ({groups.past.length})</TabsTrigger>
        <TabsTrigger value="cancelled">Cancelled ({groups.cancelled.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="upcoming" className="grid gap-2.5">
        {groups.upcoming.length ? groups.upcoming.slice(0, 50).map(renderRow) : upcomingEmpty}
      </TabsContent>
      <TabsContent value="past" className="grid gap-2.5">
        {groups.past.length ? groups.past.slice(0, 50).map(renderRow) : (
          <EmptyState
            className="border-dashed"
            title="No past sessions"
            description="Completed sessions will appear here once their time has passed."
          />
        )}
      </TabsContent>
      <TabsContent value="cancelled" className="grid gap-2.5">
        {groups.cancelled.length ? groups.cancelled.slice(0, 50).map(renderRow) : (
          <EmptyState
            className="border-dashed"
            title="Nothing cancelled"
            description="Cancelled sessions are kept here for history."
          />
        )}
      </TabsContent>
    </Tabs>
  );
}
