import { LoginForm } from "@/components/auth/forms";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const { next } = await searchParams;
  void next; // post-login routing is decided server-side by the profile role.

  return (
    <div className="surface w-full max-w-sm p-6 md:p-7">
      <div className="mb-5">
        <h1 className="text-lg font-bold tracking-tight text-ink">Welcome back</h1>
        <p className="mt-0.5 text-[0.85rem] text-subtle">
          Choose your account role and sign in.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
