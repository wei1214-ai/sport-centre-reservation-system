import { RegisterForm } from "@/components/auth/forms";

export const metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <div className="mx-auto w-full">
      <p className="eyebrow">Create account</p>
      <h1 className="display mt-3 text-[2.6rem] text-ink">Join the centre</h1>
      <p className="mt-2.5 text-[0.9rem] leading-relaxed text-subtle">
        Pick an account type, then fill in your details.
      </p>
      <div className="mt-4">
        <RegisterForm />
      </div>
    </div>
  );
}
