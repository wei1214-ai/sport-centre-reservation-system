import { LoginForm } from "@/components/auth/forms";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const { next } = await searchParams;
  void next; // post-login routing is decided server-side by the profile role.

  return (
    <div className="mx-auto w-full">
      <p className="eyebrow">Welcome back</p>
      <h1 className="display mt-3 text-[2.6rem] text-ink">Sign in</h1>
      <p className="mt-2.5 text-[0.9rem] leading-relaxed text-subtle">
        Choose your account role and sign in to continue.
      </p>
      <div className="mt-8">
        <LoginForm />
      </div>
    </div>
  );
}
