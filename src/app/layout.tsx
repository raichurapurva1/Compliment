import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export const metadata: Metadata = {
  title: "Complement",
  description: "Meet the people whose strengths cover your gaps. Philadelphia.",
};

async function Nav() {
  if (!env.isConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return (
      <Link href="/login" className="btn-secondary">
        Sign in
      </Link>
    );
  }
  return (
    <nav className="flex items-center gap-1 text-sm">
      <Link href="/leads" className="btn-ghost">
        Leads
      </Link>
      <Link href="/profile" className="btn-ghost">
        My profile
      </Link>
      <form action={signOut}>
        <button className="btn-ghost">Sign out</button>
      </form>
    </nav>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="border-b border-line bg-white/80 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span aria-hidden className="relative inline-block h-5 w-7">
                <span className="absolute left-0 top-0 h-5 w-5 rounded-full bg-accent" />
                <span className="absolute right-0 top-0 h-5 w-5 rounded-full bg-warm mix-blend-multiply" />
              </span>
              Complement
            </Link>
            <Nav />
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-line py-6 text-center text-xs text-muted">
          Complement · Philadelphia pilot ·{" "}
          <Link href="/privacy" className="underline">
            Privacy
          </Link>
        </footer>
      </body>
    </html>
  );
}
