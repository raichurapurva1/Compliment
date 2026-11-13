import { env } from "@/lib/env";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const mode = params.mode === "signup" ? "signup" : "signin";
  const error = typeof params.error === "string" ? params.error : undefined;
  return (
    <div className="mx-auto max-w-sm py-8">
      <LoginForm
        initialMode={mode}
        initialError={error}
        linkedin={env.linkedinEnabled()}
        google={env.googleEnabled()}
      />
    </div>
  );
}
