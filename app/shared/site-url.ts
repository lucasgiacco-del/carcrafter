const FALLBACK_SITE_URL = "https://www.carcrafter.app";

function normalizeSiteUrl(value: string | undefined) {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

export function getConfiguredSiteUrl() {
  return (
    normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeSiteUrl(process.env.NEXT_PUBLIC_APP_URL)
  );
}

export function getAuthCallbackUrl(nextPath: string, currentOrigin?: string) {
  const redirectUrl = new URL(
    "/auth/callback",
    getConfiguredSiteUrl() ||
      normalizeSiteUrl(currentOrigin) ||
      FALLBACK_SITE_URL,
  );
  redirectUrl.searchParams.set("next", nextPath);
  return redirectUrl.toString();
}
