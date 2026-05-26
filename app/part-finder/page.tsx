"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, useTransition } from "react";
import {
  FitmentProfileCard,
  PART_FINDER_MOD_KEYS,
  PartFinderResultsPanel,
  VehicleSelectionFields,
  usePartFinderExperience,
  type FinderModKey,
  type SelectedPartFinderMods,
} from "../shared/part-finder-live";
import {
  buildVehicleLabel,
  type VehicleFormState,
} from "../shared/part-finder";

function getVehicleFormState(searchParams: Pick<URLSearchParams, "get">) {
  return {
    year: searchParams.get("year") || "",
    make: searchParams.get("make") || "",
    model: searchParams.get("model") || "",
    generation: searchParams.get("generation") || "",
  };
}

function setOrDeleteParam(params: URLSearchParams, key: string, value: string) {
  const trimmed = value.trim();
  if (trimmed) params.set(key, trimmed);
  else params.delete(key);
}

export default function PartFinderPage() {
  return (
    <Suspense fallback={<PartFinderPageFallback />}>
      <PartFinderPageContent />
    </Suspense>
  );
}

function PartFinderPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [vehicleForm, setVehicleForm] = useState<VehicleFormState>(() =>
    getVehicleFormState(searchParams),
  );

  useEffect(() => {
    setVehicleForm(getVehicleFormState(searchParams));
  }, [searchParams]);

  const selectedMods = useMemo(
    () =>
      PART_FINDER_MOD_KEYS.reduce((acc, key) => {
        const value = searchParams.get(key);
        if (value) acc[key] = value;
        return acc;
      }, {} as SelectedPartFinderMods),
    [searchParams],
  );

  const {
    activeModKeys,
    availableGenerations,
    availableMakes,
    availableModels,
    buildTags,
    car,
    estimatedTotal,
    fitmentLookup,
    hasAnyMods,
    hasSearchVehicleInfo,
    hasVehicleInfo,
    liveBuildPricing,
    partCatalogs,
    vehicleLabel,
  } = usePartFinderExperience({
    vehicleForm,
    setVehicleForm,
    selectedMods,
    enabledSearch: true,
  });

  function applyVehicleDetails() {
    const params = new URLSearchParams(searchParams.toString());
    setOrDeleteParam(params, "year", vehicleForm.year);
    setOrDeleteParam(params, "make", vehicleForm.make);
    setOrDeleteParam(params, "model", vehicleForm.model);
    setOrDeleteParam(params, "generation", vehicleForm.generation);

    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  }

  function clearVehicleDetails() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("year");
    params.delete("make");
    params.delete("model");
    params.delete("generation");
    setVehicleForm({
      year: "",
      make: "",
      model: "",
      generation: "",
    });

    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  }

  return (
    <main className="min-h-screen bg-[#0d0d0d] px-4 py-8 text-white sm:py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6 xl:max-w-6xl">
        <p className="text-xs uppercase tracking-[0.15em] text-gray-500">
          Part Finder
        </p>

        <section className="space-y-4 rounded-3xl border border-purple-500/60 bg-gradient-to-br from-purple-900/40 via-[#111111] to-black p-5 shadow-[0_0_35px_rgba(168,85,247,0.45)] md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1.5">
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Make this build real
              </h1>
              <p className="text-sm text-gray-300 md:text-base">
                Vehicle:&nbsp;
                <span className="font-medium text-white">{car}</span>
              </p>

              {hasAnyMods ? (
                <p className="text-[11px] text-purple-100/90 md:text-xs">
                  Pulled from your render:&nbsp;
                  {buildTags.map((tag, index) => (
                    <span key={tag}>
                      {index > 0 && " · "}
                      {tag}
                    </span>
                  ))}
                </p>
              ) : (
                <p className="text-[11px] text-gray-400 md:text-xs">
                  Add your car info below, then Part Finder can match wheels,
                  tint, aero, and stance parts to the exact build you want.
                </p>
              )}

              <p className="mt-1.5 max-w-2xl text-sm text-gray-400 md:text-base">
                The render flow stays focused on visuals. Your year, make,
                model, and generation live here so the shopping side can
                stay car specific.
              </p>
            </div>

            <div className="flex min-w-[220px] flex-col items-stretch gap-2">
              <button
                type="button"
                className="w-full rounded-full bg-white px-5 py-3 text-base font-semibold text-black transition hover:bg-gray-100"
              >
                Unlock Part Finder (Premium)
              </button>
              <p className="text-center text-sm text-gray-400">
                Live parts, rough totals, and vendor suggestions matched to your
                chassis.
              </p>
            </div>
          </div>

          {estimatedTotal > 0 && (
            <p className="text-[11px] text-amber-100/90 md:text-xs">
              Rough parts budget for this build:{" "}
              <span className="font-semibold">
                ~${estimatedTotal.toLocaleString()}
              </span>{" "}
              (parts only, no labor).
            </p>
          )}

          {hasAnyMods ? (
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-purple-100/80">
              {buildTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-purple-400/40 bg-purple-900/40 px-3 py-1"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 text-[11px] text-purple-100/80">
              <span className="rounded-full border border-purple-400/40 bg-purple-900/40 px-3 py-1">
                Exact parts for your build
              </span>
              <span className="rounded-full border border-purple-400/40 bg-purple-900/40 px-3 py-1">
                Estimated total for your build
              </span>
              <span className="rounded-full border border-purple-400/40 bg-purple-900/40 px-3 py-1">
                Online + local vendor suggestions
              </span>
            </div>
          )}
        </section>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-[#101010] p-4 md:p-5">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-white sm:text-lg">
              Car info for Part Finder
            </h2>
            <p className="text-sm text-gray-400">
              Keep this separate from the build flow. Pick the car here so the
              live parts side can narrow fitment correctly, then choose the
              generation when it matters.
            </p>
          </div>

          <VehicleSelectionFields
            vehicleForm={vehicleForm}
            setVehicleForm={setVehicleForm}
            availableMakes={availableMakes}
            availableModels={availableModels}
            availableGenerations={availableGenerations}
          />

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-gray-500">
              Current selection:{" "}
              <span className="text-gray-300">
                {hasVehicleInfo ? vehicleLabel : "No car selected yet"}
              </span>
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={clearVehicleDetails}
                className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white/80 transition hover:bg-white/[0.06]"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={applyVehicleDetails}
                disabled={isPending}
                className="rounded-full bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Use This Car"}
              </button>
            </div>
          </div>

          <FitmentProfileCard
            car={car}
            vehicleReady={hasSearchVehicleInfo}
            lookup={fitmentLookup}
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-semibold text-gray-200 sm:text-lg">
            Based on this render, Part Finder would show...
          </h2>

          <PartFinderResultsPanel
            activeModKeys={activeModKeys as FinderModKey[]}
            selectedMods={selectedMods}
            partCatalogs={partCatalogs}
            fitmentLookup={fitmentLookup}
            hasSearchVehicleInfo={hasSearchVehicleInfo}
            car={car}
            liveBuildPricing={liveBuildPricing}
            emptyStateMessage="Once a render sends its selected mods here, this page becomes a fitment-aware shopping roadmap for that exact build."
          />
        </section>

        <section className="mt-4 rounded-2xl border border-dashed border-amber-300 bg-amber-50/10 p-4 text-xs text-amber-100">
          <p className="mb-1 text-base font-semibold">
            Part Finder is a Premium feature.
          </p>
          <p className="text-sm text-amber-100/90">
            Free users can preview builds with AI. Premium members unlock
            real-world parts and pricing matched to their render so they can
            stop guessing and start ordering with confidence.
          </p>
        </section>
      </div>
    </main>
  );
}

function PartFinderPageFallback() {
  return (
    <main className="min-h-screen bg-[#0d0d0d] px-4 py-8 text-white sm:py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6 xl:max-w-6xl">
        <p className="text-xs uppercase tracking-[0.15em] text-gray-500">
          Part Finder
        </p>
        <section className="rounded-3xl border border-purple-500/60 bg-gradient-to-br from-purple-900/40 via-[#111111] to-black p-5 shadow-[0_0_35px_rgba(168,85,247,0.45)] md:p-7">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Make this build real
          </h1>
          <p className="mt-2 text-sm text-gray-400 md:text-base">
            Loading your build details...
          </p>
        </section>
      </div>
    </main>
  );
}
