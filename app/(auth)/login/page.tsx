import { LoginForm } from "@/components/auth/forms";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const { next, deleted } = await searchParams;
  void next; // post-login routing is decided server-side by the profile role.

  return (
    <div className="mx-auto w-full">
      <p className="eyebrow">Welcome back</p>
      <h1 className="display mt-3 text-[2.6rem] text-ink">Sign in</h1>
      <p className="mt-2.5 text-[0.9rem] leading-relaxed text-subtle">
        Choose your account role and sign in to continue.
      </p>
      {deleted ? (
        <div className="mt-5 rounded-2xl bg-success-soft px-4 py-3 text-[0.82rem] leading-relaxed text-success">
          Your account has been deleted. Booking and payment history was kept for
          audit, and you have been signed out.
        </div>
      ) : null}
      <div className="mt-8">
        <LoginForm />
      </div>
    </div>
  );
}
