"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../shared/auth";
import { getSearchSectionHeading } from "../shared/part-finder-live";
import {
  clearSavedBuilds,
  deleteSavedBuild,
  listSavedBuilds,
  type SavedBuild,
  type SavedBuildPartFinderResult,
} from "../shared/saved-builds";
import { getSupabaseBrowserClient } from "../shared/supabase-browser";

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

function countSavedSearches(items: SavedBuild[]) {
  return items.reduce((sum, item) => sum + item.partFinderResults.length, 0);
}

function countSavedListings(items: SavedBuild[]) {
  return items.reduce(
    (sum, item) =>
      sum +
      item.partFinderResults.reduce(
        (resultSum, result) => resultSum + result.items.length,
        0,
      ),
    0,
  );
}

function SavedSearchSection({
  result,
}: {
  result: SavedBuildPartFinderResult;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">
            {getSearchSectionHeading(result.modKey)}
          </p>
          <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500">
            Saved search
          </p>
        </div>
        <span className="rounded-full border border-purple-400/25 bg-purple-500/10 px-2.5 py-1 text-[10px] font-medium text-purple-100">
          {result.items.length} {result.items.length === 1 ? "link" : "links"}
        </span>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#101117] px-3 py-2">
        <p className="text-[10px] uppercase tracking-[0.14em] text-gray-500">
          Query used
        </p>
        <p className="mt-1 text-sm text-gray-200">{result.query}</p>
      </div>

      {result.items.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {result.items.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-[#101117]"
            >
              <div className="aspect-[4/3] w-full bg-black">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-4 text-center text-xs text-gray-500">
                    No product image saved
                  </div>
                )}
              </div>

              <div className="space-y-3 p-3">
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-2 text-sm font-semibold text-white">
                      {item.title}
                    </h3>
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

export default function LibraryPage() {
  const router = useRouter();
  const { user, loading, isConfigured, signOut } = useAuth();
  const [items, setItems] = useState<SavedBuild[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (loading) return;

    if (!isConfigured) {
      setBusy(false);
      return;
    }

    if (!user || !supabase) {
      router.replace("/sign-in?next=/library");
      return;
    }

    listSavedBuilds(supabase)
      .then((saved) => {
        setItems(saved);
        setError(null);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load your saved builds.";
        setError(message);
      })
      .finally(() => setBusy(false));
  }, [isConfigured, loading, router, user]);

  const withBefore = useMemo(
    () => items.filter((item) => item.originalImage && item.resultImage).length,
    [items],
  );
  const savedSearches = useMemo(() => countSavedSearches(items), [items]);
  const savedListings = useMemo(() => countSavedListings(items), [items]);

  async function handleDelete(id: string) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    await deleteSavedBuild(supabase, id);
    setItems((prev) => prev.filter((item) => item.id !== id));
    setDeleteMessage("Deleted!");
  }

  async function handleClearLibrary() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const ok = window.confirm("Clear all saved cars from this account?");
    if (!ok) return;

    await clearSavedBuilds(supabase);
    setItems([]);
  }

  if (!isConfigured) {
    return (
      <main className="min-h-screen bg-[#04050a] text-white">
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 text-center">
          <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6">
            <h1 className="text-2xl font-semibold">
              Auth needs real Supabase keys first.
            </h1>
            <p className="mt-3 text-sm text-amber-100/90">
              Add your actual `NEXT_PUBLIC_SUPABASE_URL` and
              `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`, then this library
              can become account-based and persistent.
            </p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-5 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/15"
            >
              Back home
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#04050a] text-white">
      <div className="app-shell-wide flex min-h-screen w-full flex-col py-8 sm:py-10">
        <div className="mb-7 flex items-start justify-between gap-3">
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-sm text-gray-400 transition hover:text-white"
            >
              ← Back home
            </button>
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-purple-200/70 sm:text-xs">
                Your garage
              </p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-[2.2rem]">
                Saved car library
              </h1>
              <p className="mt-2 max-w-2xl text-base text-gray-400">
                Signed in as {user?.email || "your account"}. Your saved render,
                linked parts, and search history all live here now.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                type="button"
                onClick={handleClearLibrary}
                className="rounded-xl border border-red-500/40 px-4 py-2.5 text-sm text-red-300 transition hover:bg-red-500/10"
              >
                Clear library
              </button>
            )}
            <button
              type="button"
              onClick={() => signOut()}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-gray-200 transition hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </div>

        <section className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500 sm:text-xs">
              Saved builds
            </p>
            <p className="mt-2 text-3xl font-semibold">{items.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500 sm:text-xs">
              Before / after sets
            </p>
            <p className="mt-2 text-3xl font-semibold">{withBefore}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500 sm:text-xs">
              Saved searches / links
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {savedSearches} / {savedListings}
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/build")}
            className="rounded-2xl border border-purple-500/40 bg-gradient-to-br from-purple-600/20 to-transparent p-4 text-left transition hover:border-purple-400 hover:bg-purple-600/15"
          >
            <p className="text-[11px] uppercase tracking-[0.18em] text-purple-200/80 sm:text-xs">
              Builder
            </p>
            <p className="mt-2 text-lg font-semibold">Start another build</p>
            <p className="mt-1 text-sm text-gray-300">
              Render something new and save it straight into this account.
            </p>
          </button>
        </section>

        {deleteMessage && (
          <p className="mb-4 text-sm text-emerald-300">{deleteMessage}</p>
        )}

        {busy ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 text-base text-gray-400">
            Loading your cloud library...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-base text-red-200">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#141428] via-[#080810] to-[#04050a] p-8 text-center">
            <p className="text-2xl font-semibold">No saved cars yet.</p>
            <p className="mx-auto mt-2 max-w-md text-base text-gray-400">
              Save a finished render from the builder and it will live here
              under your account.
            </p>
            <button
              type="button"
              onClick={() => router.push("/build")}
              className="mt-5 rounded-xl bg-purple-600 px-5 py-3 text-base font-semibold transition hover:bg-purple-500"
            >
              Create your first saved build
            </button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {items.map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-3xl border border-white/10 bg-[#090a11] shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
              >
                <div
                  className={`border-b border-white/10 ${
                    item.originalImage ? "grid grid-cols-2" : "grid grid-cols-1"
                  }`}
                >
                  {item.originalImage && (
                    <div className="relative aspect-[4/3] bg-black">
                      <img
                        src={item.originalImage}
                        alt="Original car"
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-white/85">
                        Before
                      </span>
                    </div>
                  )}
                  <div className="relative aspect-[4/3] bg-black">
                    <img
                      src={item.resultImage}
                      alt="Saved build render"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute bottom-2 left-2 rounded-full bg-purple-600/85 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-white">
                      Render
                    </span>
                  </div>
                </div>

                <div className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">
                        Saved build
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatSavedAt(item.createdAt)}
                      </p>
                      {item.vehicleLabel && (
                        <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-gray-200">
                          {item.vehicleLabel}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => router.push(`/library/${item.id}`)}
                        className="text-purple-300 transition hover:text-purple-200"
                      >
                        Open render
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="text-red-300 transition hover:text-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed text-gray-200">
                    {item.prompt || "Saved from Car Crafter builder."}
                  </p>

                  {item.partFinderResults.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="text-sm font-semibold text-white">
                          Saved parts finder results
                        </h2>
                        <span className="text-xs text-gray-500">
                          {item.partFinderResults.length}{" "}
                          {item.partFinderResults.length === 1
                            ? "search"
                            : "searches"}
                        </span>
                      </div>

                      {item.partFinderResults.map((result) => (
                        <SavedSearchSection
                          key={`${item.id}-${result.modKey}-${result.query}`}
                          result={result}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-3 text-sm text-gray-400">
                      This build was saved without part finder listings.
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
