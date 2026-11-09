import { ShieldAlert } from "lucide-react";

import { logoutAction } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Account suspended" };

export default function SuspendedPage() {
  return (
    <div className="hero-canvas flex min-h-dvh items-center justify-center px-5">
      <div className="surface w-full max-w-sm p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-warning-soft text-warning">
          <ShieldAlert className="size-5" />
        </span>
        <h1 className="display mt-5 text-[1.8rem] text-ink">Account suspended</h1>
        <p className="mt-2 text-[0.85rem] leading-relaxed text-subtle">
          This account is currently not active. Please contact an administrator.
        </p>
        <form action={logoutAction} className="mt-6">
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
