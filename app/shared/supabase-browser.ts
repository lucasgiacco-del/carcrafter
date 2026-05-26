"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function getSupabasePublishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function isPlaceholder(value: string | undefined) {
  if (!value) return true;
  return (
    value.includes("your-project-id") ||
    value.includes("your_supabase_anon_key") ||
    value.includes("your_supabase_publishable_key")
  );
}

export function isSupabaseConfigured() {
  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();

  return Boolean(
    url &&
      publishableKey &&
      !isPlaceholder(url) &&
      !isPlaceholder(publishableKey),
  );
}

export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured()) return null;
  if (client) return client;

  client = createClient(getSupabaseUrl() as string, getSupabasePublishableKey() as string, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      // The app finishes auth inside /auth/callback, so global URL parsing only
      // adds duplicate session work on unrelated pages.
      detectSessionInUrl: false,
    },
  });

  return client;
}
