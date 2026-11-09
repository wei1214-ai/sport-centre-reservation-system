import { ResetPasswordForm } from "@/components/auth/forms";

export const metadata = { title: "Set new password" };

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto w-full max-w-sm">
      <p className="eyebrow">Almost done</p>
      <h1 className="display mt-3 text-[2.4rem] text-ink">New password</h1>
      <p className="mt-2.5 text-[0.9rem] leading-relaxed text-subtle">
        Choose a strong password you don&apos;t use elsewhere.
      </p>
      <div className="mt-8">
        <ResetPasswordForm />
      </div>
    </div>
  );
}
