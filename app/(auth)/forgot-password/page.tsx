import { ForgotPasswordForm } from "@/components/auth/forms";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="surface w-full max-w-sm p-6 md:p-7">
      <div className="mb-5">
        <h1 className="text-lg font-bold tracking-tight text-ink">Reset your password</h1>
        <p className="mt-0.5 text-[0.85rem] text-subtle">
          We&apos;ll email you a secure link to set a new password.
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
