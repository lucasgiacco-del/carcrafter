"use client";

import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { normalizeAuthRedirect } from "./auth-redirect";
import { getAuthCallbackUrl } from "./site-url";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "./supabase-browser";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithEmail: (
    email: string,
    nextPath?: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;

      if (event === "INITIAL_SESSION" || event === "SIGNED_OUT") {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setLoading(false);
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signInWithEmail(email: string, nextPath?: string) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return { error: "Supabase is not configured yet." };
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: getAuthCallbackUrl(
            normalizeAuthRedirect(nextPath),
            window.location.origin,
          ),
        },
      });

      return { error: error?.message ?? null };
    } catch (error: unknown) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "We couldn't start sign-in right now.",
      };
    }
  }

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (error) {
      console.warn("Supabase sign-out failed.", error);
    } finally {
      setSession(null);
      setUser(null);
      setLoading(false);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: configured,
        signInWithEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
