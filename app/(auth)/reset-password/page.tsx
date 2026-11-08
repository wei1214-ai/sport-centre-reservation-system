import { ResetPasswordForm } from "@/components/auth/forms";

export const metadata = { title: "Set new password" };

export default function ResetPasswordPage() {
  return (
    <div className="surface w-full max-w-sm p-6 md:p-7">
      <div className="mb-5">
        <h1 className="text-lg font-bold tracking-tight text-ink">Set a new password</h1>
        <p className="mt-0.5 text-[0.85rem] text-subtle">
          Choose a strong password you don&apos;t use elsewhere.
        </p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
