import { RegisterForm } from "@/components/auth/forms";

export const metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <div className="surface w-full max-w-lg p-6 md:p-7">
      <div className="mb-5">
        <h1 className="text-lg font-bold tracking-tight text-ink">Create your account</h1>
        <p className="mt-0.5 text-[0.85rem] text-subtle">
          Pick an account type, then fill in your details.
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
