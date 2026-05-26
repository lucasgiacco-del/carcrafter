"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "../shared/auth";
import { normalizeAuthRedirect } from "../shared/auth-redirect";

function SignInPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isConfigured, signInWithEmail, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const next = normalizeAuthRedirect(searchParams.get("next"));

  useEffect(() => {
    if (!loading && user) {
      router.replace(next);
    }
  }, [loading, next, router, user]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSending(true);

    const result = await signInWithEmail(email.trim(), next);
    setSending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    sessionStorage.setItem("carcrafter_auth_next", next);
    setSuccess(
      "Magic link sent. Open it on this device and we’ll drop you back into your garage.",
    );
  }

  return (
    <main className="min-h-screen bg-[#04050a] text-white">
      <div className="app-shell flex min-h-screen flex-col justify-center py-12 sm:py-16">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#18152d] via-[#090a12] to-[#05060a] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.55)] sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.22em] text-purple-200/80 sm:text-xs">
            Sign in
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-[2.2rem]">
            Save builds and come back to them later.
          </h1>
          <p className="mt-3 text-base leading-relaxed text-gray-400">
            This keeps your library tied to your account instead of just the
            current browser.
          </p>

          {!isConfigured ? (
            <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-base text-amber-100">
              Supabase auth is not configured yet. Add your real
              `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in
              `.env.local` to turn this on.
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium uppercase tracking-[0.16em] text-gray-400"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-base outline-none transition focus:border-purple-400/70"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full rounded-2xl bg-purple-600 px-4 py-4 text-base font-semibold transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? "Sending link..." : "Email me a magic link"}
              </button>

              {error && <p className="text-base text-red-300">{error}</p>}
              {success && <p className="text-base text-emerald-300">{success}</p>}
            </form>
          )}

          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-6 text-base text-gray-400 transition hover:text-white"
          >
            ← Back home
          </button>
        </div>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#04050a] text-white" />}>
      <SignInPageContent />
    </Suspense>
  );
}
