"use client";

import type { EmailOtpType } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { normalizeAuthRedirect } from "../../shared/auth-redirect";
import { getSupabaseBrowserClient } from "../../shared/supabase-browser";

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return Boolean(
    value &&
    [
      "signup",
      "invite",
      "magiclink",
      "recovery",
      "email_change",
      "email",
    ].includes(value),
  );
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase auth is not configured yet.");
      return;
    }
    const authClient = supabase.auth;

    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const tokenHash = url.searchParams.get("token_hash");
    const otpType = url.searchParams.get("type");
    const next = normalizeAuthRedirect(
      url.searchParams.get("next") ||
      sessionStorage.getItem("carcrafter_auth_next"),
    );

    async function finishSignIn() {
      if (code) {
        const { error: exchangeError } =
          await authClient.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }
      } else if (tokenHash && isEmailOtpType(otpType)) {
        const { error: verifyError } = await authClient.verifyOtp({
          token_hash: tokenHash,
          type: otpType,
        });
        if (verifyError) {
          setError(verifyError.message);
          return;
        }
      } else {
        const {
          data: { session },
        } = await authClient.getSession();
        if (!session) {
          setError(
            "This sign-in link is missing the auth data needed to finish signing in.",
          );
          return;
        }
      }

      sessionStorage.removeItem("carcrafter_auth_next");
      router.replace(next);
    }

    finishSignIn().catch((err: unknown) => {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't finish signing you in.",
      );
    });
  }, [router]);

  return (
    <main className="min-h-screen bg-[#05060a] text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h1 className="text-xl font-semibold">Finishing sign-in…</h1>
          <p className="mt-2 text-sm text-gray-400">
            Hang tight while we bring your session back into Car Crafter.
          </p>
          {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
        </div>
      </div>
    </main>
  );
}
