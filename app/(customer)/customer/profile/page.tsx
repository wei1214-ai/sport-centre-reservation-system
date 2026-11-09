import { UserRound } from "lucide-react";

import { PageHeader, EmptyState } from "@/components/ui/primitives";

export const metadata = { title: "Profile" };

export default function CustomerProfilePage() {
  return (
    <div className="grid gap-7">
      <PageHeader title="Profile" subtitle="Your personal details and preferences." />
      <EmptyState
        icon={<UserRound className="size-6" />}
        title="Profile module coming soon"
        description="Account details and preferences will be editable here in the next milestone."
      />
    </div>
  );
}
