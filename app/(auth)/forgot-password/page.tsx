import { ForgotPasswordForm } from "@/components/auth/forms";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto w-full max-w-sm">
      <p className="eyebrow">Account recovery</p>
      <h1 className="display mt-3 text-[2.4rem] text-ink">Reset password</h1>
      <p className="mt-2.5 text-[0.9rem] leading-relaxed text-subtle">
        We&apos;ll email you a secure link to set a new password.
      </p>
      <div className="mt-8">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
