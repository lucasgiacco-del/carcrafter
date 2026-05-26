"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../shared/auth";
import { getSearchSectionHeading } from "../../shared/part-finder-live";
import {
  getSavedBuild,
  type SavedBuild,
  type SavedBuildPartFinderResult,
} from "../../shared/saved-builds";
import { getSupabaseBrowserClient } from "../../shared/supabase-browser";

function formatSavedAt(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Recently saved";

  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function SavedPartSearchBlock({
  result,
}: {
  result: SavedBuildPartFinderResult;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-[#0c0d13] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">
            {getSearchSectionHeading(result.modKey)}
          </h3>
          <p className="mt-1 text-xs text-gray-400">{result.query}</p>
        </div>
        <span className="rounded-full border border-purple-400/25 bg-purple-500/10 px-2.5 py-1 text-[10px] font-medium text-purple-100">
          {result.items.length} {result.items.length === 1 ? "listing" : "listings"}
        </span>
      </div>

      {result.items.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {result.items.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-[#11131a]"
            >
              <div className="aspect-[4/3] bg-black">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-gray-500">
                    No image saved
                  </div>
                )}
              </div>

              <div className="space-y-3 p-3">
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="line-clamp-2 text-sm font-semibold text-white">
                      {item.title}
                    </h4>
                    <span className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-50">
                      {item.price}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{item.subtitle}</p>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-gray-500">
                    {item.source}
                  </span>
                  <a
                    href={item.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-white/85 transition hover:bg-white/5"
                  >
                    Open listing
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-3 text-sm text-gray-400">
          This search query was saved, but no listings were attached to it yet.
        </div>
      )}
    </section>
  );
}

export default function SavedBuildDetailPage() {
  const params = useParams<{ buildId: string }>();
  const buildId = Array.isArray(params?.buildId) ? params.buildId[0] : params?.buildId;
  const router = useRouter();
  const { user, loading, isConfigured } = useAuth();
  const [item, setItem] = useState<SavedBuild | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (loading) return;

    if (!isConfigured) {
      setBusy(false);
      return;
    }

    if (!buildId) {
      setError("Saved build not found.");
      setBusy(false);
      return;
    }

    if (!user || !supabase) {
      router.replace(`/sign-in?next=/library/${buildId}`);
      return;
    }

    getSavedBuild(supabase, buildId)
      .then((saved) => {
        setItem(saved);
        setError(null);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Failed to load this saved build.";
        setError(message);
      })
      .finally(() => setBusy(false));
  }, [buildId, isConfigured, loading, router, user]);

  const selectedMods = useMemo(
    () => item?.builderSnapshot?.selectedMods ?? [],
    [item],
  );

  if (!isConfigured) {
    return (
      <main className="min-h-screen bg-[#04050a] text-white">
        <div className="app-shell-wide flex min-h-screen items-center justify-center py-10">
          <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
            <h1 className="text-2xl font-semibold">Auth needs real Supabase keys first.</h1>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#04050a] text-white">
      <div className="app-shell-wide flex min-h-screen flex-col py-8 sm:py-10">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => router.push("/library")}
              className="text-sm text-gray-400 transition hover:text-white"
            >
              ← Back to library
            </button>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-purple-200/70">
                Saved build
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                {item?.vehicleLabel || "Saved render"}
              </h1>
              {item && (
                <p className="mt-2 text-sm text-gray-400">
                  Saved {formatSavedAt(item.createdAt)}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm" />
        </div>

        {busy ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 text-base text-gray-400">
            Loading saved build...
          </div>
        ) : error || !item ? (
          <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-base text-red-200">
            {error || "Saved build not found."}
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,38rem)_minmax(18rem,1fr)]">
            <section className="space-y-4 rounded-3xl border border-white/10 bg-[#090a11] p-5">
              <div className={item.originalImage ? "grid gap-4 md:grid-cols-2" : "grid gap-4"}>
                {item.originalImage && (
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500">
                      Before
                    </p>
                    <img
                      src={item.originalImage}
                      alt="Original saved car"
                      className="render-frame w-full rounded-2xl border border-white/10 object-contain"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500">
                    Render
                  </p>
                  <img
                    src={item.resultImage}
                    alt="Saved build render"
                    className="render-frame w-full rounded-2xl border border-white/10 object-contain"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500">
                  Final render prompt
                </p>
                <p className="mt-2 text-sm leading-relaxed text-gray-200">
                  {item.prompt}
                </p>
              </div>
            </section>

            <aside className="space-y-4">
              <section className="rounded-3xl border border-white/10 bg-[#090a11] p-5">
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500">
                      Vehicle
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {item.vehicleLabel || "Not saved with vehicle details"}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500">
                        Selected mods
                      </p>
                      <span className="text-xs text-gray-500">
                        {selectedMods.length} {selectedMods.length === 1 ? "mod" : "mods"}
                      </span>
                    </div>

                    {selectedMods.length > 0 ? (
                      <div className="mt-3 grid gap-2">
                        {selectedMods.map((mod) => (
                          <div
                            key={`${mod.modId}-${mod.optionId || "none"}`}
                            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                          >
                            <p className="text-sm font-medium text-white">
                              {mod.modLabel}
                            </p>
                            <p className="mt-1 text-sm text-gray-300">
                              {mod.optionLabel || "Enabled"}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-3 text-sm text-gray-400">
                        This older saved build does not have a mod snapshot yet.
                      </div>
                    )}
                  </div>

                  {item.builderSnapshot?.extraPrompt && (
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500">
                        Extra note
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-gray-200">
                        {item.builderSnapshot.extraPrompt}
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-[#090a11] p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-white">
                    Saved parts finder results
                  </h2>
                  <span className="text-xs text-gray-500">
                    {item.partFinderResults.length}{" "}
                    {item.partFinderResults.length === 1 ? "search" : "searches"}
                  </span>
                </div>

                {item.partFinderResults.length > 0 ? (
                  <div className="mt-4 space-y-4">
                    {item.partFinderResults.map((result) => (
                      <SavedPartSearchBlock
                        key={`${result.modKey}-${result.query}`}
                        result={result}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-3 text-sm text-gray-400">
                    No saved part search results on this build.
                  </div>
                )}
              </section>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
