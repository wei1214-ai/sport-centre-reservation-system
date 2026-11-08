import { ShieldAlert } from "lucide-react";

import { logoutAction } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Account suspended" };

export default function SuspendedPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-page px-4">
      <div className="surface max-w-sm p-7 text-center">
        <ShieldAlert className="mx-auto text-warning" />
        <h1 className="mt-3 text-lg font-bold text-ink">Account suspended</h1>
        <p className="mt-1 text-[0.85rem] text-subtle">
          This account is currently not active. Please contact an administrator.
        </p>
        <form action={logoutAction} className="mt-5">
          <Button type="submit" variant="outline">Sign out</Button>
        </form>
      </div>
    </div>
  );
}
