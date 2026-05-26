"use client";

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  buildPartSearchQuery,
  buildVehicleLabel,
  type PartFinderModType,
  type PartFinderSearchItem,
  type PartFinderSearchResponse,
  type VehicleFitmentLookupResponse,
  type VehicleFormState,
} from "./part-finder";

export type FinderModKey = PartFinderModType;
export type SelectedPartFinderMods = Partial<Record<FinderModKey, string>>;
export type PartCatalogMap = Record<FinderModKey, PartFinderSearchResponse>;

type VehicleLookupResponse = {
  makes?: string[];
  models?: string[];
  generations?: string[];
};

type UsePartFinderExperienceArgs = {
  vehicleForm: VehicleFormState;
  setVehicleForm: Dispatch<SetStateAction<VehicleFormState>>;
  selectedMods: SelectedPartFinderMods;
  enabledSearch?: boolean;
};

export const PART_FINDER_MOD_KEYS: FinderModKey[] = [
  "wheels",
  "tint",
  "spacers",
  "suspension",
  "spoiler",
  "chrome_delete",
  "front_lip",
  "diffuser",
];

export const YEAR_OPTIONS = Array.from(
  { length: new Date().getFullYear() - 1989 },
  (_, index) => String(new Date().getFullYear() - index),
);

const COMMON_MAKES = [
  "Acura",
  "Audi",
  "BMW",
  "Cadillac",
  "Chevrolet",
  "Dodge",
  "Ford",
  "Genesis",
  "Honda",
  "Hyundai",
  "Infiniti",
  "Kia",
  "Lexus",
  "Mazda",
  "Mercedes-Benz",
  "Nissan",
  "Porsche",
  "Subaru",
  "Tesla",
  "Toyota",
  "Volkswagen",
];

const ESTIMATED_PRICES: Record<FinderModKey, number> = {
  wheels: 1200,
  suspension: 900,
  tint: 300,
  spacers: 250,
  spoiler: 400,
  chrome_delete: 350,
  front_lip: 450,
  diffuser: 850,
};

export function usePartFinderExperience({
  vehicleForm,
  setVehicleForm,
  selectedMods,
  enabledSearch = true,
}: UsePartFinderExperienceArgs) {
  const [availableMakes, setAvailableMakes] = useState<string[]>(COMMON_MAKES);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [availableGenerations, setAvailableGenerations] = useState<string[]>(
    [],
  );
  const [partCatalogs, setPartCatalogs] = useState<PartCatalogMap>(() =>
    createEmptyCatalogMap(),
  );
  const [fitmentLookup, setFitmentLookup] =
    useState<VehicleFitmentLookupResponse>({
      status: "idle",
      profile: null,
    });

  const { year, make, model, generation } = vehicleForm;
  const activeModKeys = useMemo(
    () =>
      PART_FINDER_MOD_KEYS.filter((key) => {
        const value = selectedMods[key];
        return Boolean(value);
      }),
    [selectedMods],
  );
  const estimatedTotal = activeModKeys.reduce(
    (sum, key) => sum + (ESTIMATED_PRICES[key] || 0),
    0,
  );
  const hasAnyMods = activeModKeys.length > 0;
  const hasVehicleInfo = Boolean(year || make || model || generation);
  const hasSearchVehicleInfo = Boolean(year && make && model);
  const vehicleLabel = buildVehicleLabel(vehicleForm);
  const car = hasVehicleInfo ? vehicleLabel : "your car";
  const fitmentProfile = fitmentLookup.profile;
  const buildTags = activeModKeys
    .map((key) => describeSelectedMod(key, selectedMods[key] || null))
    .filter(Boolean) as string[];
  const liveBuildPricing = useMemo(() => {
    const pricedMods = activeModKeys
      .map((key) => {
        const catalog = partCatalogs[key];
        if (!catalog?.items.length) return null;

        const pricedItems = catalog.items
          .map((item) => ({
            item,
            amount: parsePriceAmount(item.price),
          }))
          .filter(
            (
              pricedItem,
            ): pricedItem is {
              item: PartFinderSearchItem;
              amount: number;
            } => pricedItem.amount !== null,
          );

        if (!pricedItems.length) return null;

        const bestPrice = pricedItems.reduce((lowest, current) =>
          current.amount < lowest.amount ? current : lowest,
        );

        return {
          key,
          label: getSearchSectionHeading(key),
          amount: key === "wheels" ? bestPrice.amount * 4 : bestPrice.amount,
          displayPrice: formatUsd(
            key === "wheels" ? bestPrice.amount * 4 : bestPrice.amount,
          ),
          itemTitle: bestPrice.item.title,
          unitPrice: bestPrice.amount,
        };
      })
      .filter(Boolean) as Array<{
      key: FinderModKey;
      label: string;
      amount: number;
      displayPrice: string;
      itemTitle: string;
      unitPrice: number;
    }>;

    return {
      pricedMods,
      total: pricedMods.reduce((sum, mod) => sum + mod.amount, 0),
      missingCount: activeModKeys.length - pricedMods.length,
    };
  }, [activeModKeys, partCatalogs]);

  useEffect(() => {
    let cancelled = false;

    async function loadMakes() {
      try {
        const response = await fetch("/api/part-finder/vehicles?type=makes", {
          cache: "force-cache",
        });
        if (!response.ok) return;

        const data = (await response.json()) as VehicleLookupResponse;
        if (!cancelled && data.makes?.length) {
          setAvailableMakes(data.makes);
        }
      } catch {
        // Keep the fallback make list if lookup fails.
      }
    }

    loadMakes();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!vehicleForm.year || !vehicleForm.make) {
      setAvailableModels([]);
      setAvailableGenerations([]);
      return;
    }

    let cancelled = false;

    async function loadModels() {
      try {
        const params = new URLSearchParams({
          type: "models",
          year: vehicleForm.year,
          make: vehicleForm.make,
        });

        const response = await fetch(`/api/part-finder/vehicles?${params}`, {
          cache: "force-cache",
        });

        if (!response.ok) {
          if (!cancelled) setAvailableModels([]);
          return;
        }

        const data = (await response.json()) as VehicleLookupResponse;
        if (!cancelled) {
          setAvailableModels(data.models || []);
        }
      } catch {
        if (!cancelled) {
          setAvailableModels([]);
        }
      }
    }

    loadModels();

    return () => {
      cancelled = true;
    };
  }, [vehicleForm.make, vehicleForm.year]);

  useEffect(() => {
    if (!vehicleForm.year || !vehicleForm.make || !vehicleForm.model) {
      setAvailableGenerations([]);
      return;
    }

    let cancelled = false;

    async function loadGenerations() {
      try {
        const params = new URLSearchParams({
          type: "generations",
          year: vehicleForm.year,
          make: vehicleForm.make,
          model: vehicleForm.model,
        });

        const response = await fetch(`/api/part-finder/vehicles?${params}`, {
          cache: "force-cache",
        });

        if (!response.ok) {
          if (!cancelled) setAvailableGenerations([]);
          return;
        }

        const data = (await response.json()) as VehicleLookupResponse;
        if (!cancelled) {
          const generations = data.generations || [];
          setAvailableGenerations(generations);
          setVehicleForm((current) => {
            if (
              current.generation &&
              generations.includes(current.generation)
            ) {
              return current;
            }

            return {
              ...current,
              generation: generations.length === 1 ? generations[0] : "",
            };
          });
        }
      } catch {
        if (!cancelled) {
          setAvailableGenerations([]);
        }
      }
    }

    loadGenerations();

    return () => {
      cancelled = true;
    };
  }, [setVehicleForm, vehicleForm.make, vehicleForm.model, vehicleForm.year]);

  useEffect(() => {
    if (!hasSearchVehicleInfo) {
      setFitmentLookup({
        status: "idle",
        profile: null,
      });
      return;
    }

    let cancelled = false;

    async function loadFitmentProfile() {
      setFitmentLookup((current) => ({
        ...current,
        status: "loading",
      }));

      try {
        const params = new URLSearchParams({
          year,
          make,
          model,
        });
        if (generation) {
          params.set("generation", generation);
        }

        const response = await fetch(`/api/part-finder/fitment?${params}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as VehicleFitmentLookupResponse;

        if (!cancelled) {
          setFitmentLookup(data);
        }
      } catch {
        if (!cancelled) {
          setFitmentLookup({
            status: "error",
            profile: null,
            error: "Fitment profile lookup failed.",
          });
        }
      }
    }

    loadFitmentProfile();

    return () => {
      cancelled = true;
    };
  }, [generation, hasSearchVehicleInfo, make, model, year]);

  useEffect(() => {
    if (!enabledSearch || !hasSearchVehicleInfo || !activeModKeys.length) {
      setPartCatalogs(createEmptyCatalogMap());
      return;
    }

    let cancelled = false;
    const fetchableKeys = activeModKeys.filter(
      (key) => key !== "wheels" || fitmentLookup.status !== "loading",
    );

    setPartCatalogs((current) => {
      const next = createEmptyCatalogMap();

      for (const key of PART_FINDER_MOD_KEYS) {
        const optionId = selectedMods[key];
        if (!optionId) {
          next[key] = createEmptyCatalog();
          continue;
        }

        const query = buildPartSearchQuery({
          year,
          make,
          model,
          generation,
          modType: key,
          optionId,
          fitmentProfile,
        });
        const existing = current[key] || createEmptyCatalog();

        next[key] = {
          ...existing,
          status: fetchableKeys.includes(key) ? "loading" : existing.status,
          query,
          source: "openai",
        };
      }

      return next;
    });

    async function loadCatalog(modKey: FinderModKey, optionId: string) {
      try {
        const params = new URLSearchParams({
          year,
          make,
          model,
          generation,
          modType: modKey,
          optionId,
        });
        const response = await fetch(`/api/part-finder/search?${params}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as PartFinderSearchResponse;

        if (!cancelled) {
          setPartCatalogs((current) => ({
            ...current,
            [modKey]: data,
          }));
        }
      } catch {
        if (!cancelled) {
          setPartCatalogs((current) => ({
            ...current,
            [modKey]: {
              status: "error",
              query: buildPartSearchQuery({
                year,
                make,
                model,
                generation,
                modType: modKey,
                optionId,
                fitmentProfile,
              }),
              items: [],
              source: "openai",
              error: "Part search lookup failed.",
            },
          }));
        }
      }
    }

    for (const modKey of fetchableKeys) {
      const optionId = selectedMods[modKey];
      if (!optionId) continue;
      void loadCatalog(modKey, optionId);
    }

    return () => {
      cancelled = true;
    };
  }, [
    activeModKeys,
    enabledSearch,
    fitmentLookup.status,
    fitmentProfile,
    generation,
    hasSearchVehicleInfo,
    make,
    model,
    selectedMods,
    year,
  ]);

  return {
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
  };
}

type VehicleSelectionFieldsProps = {
  vehicleForm: VehicleFormState;
  setVehicleForm: Dispatch<SetStateAction<VehicleFormState>>;
  availableMakes: string[];
  availableModels: string[];
  availableGenerations: string[];
  dense?: boolean;
};

export function VehicleSelectionFields({
  vehicleForm,
  setVehicleForm,
  availableMakes,
  availableModels,
  availableGenerations,
  dense = false,
}: VehicleSelectionFieldsProps) {
  const gapClass = dense ? "gap-2.5" : "gap-3";
  const labelClass = dense ? "text-[11px]" : "text-sm";
  const inputClass = dense
    ? "w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-purple-500/50"
    : "w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white placeholder:text-white/35 outline-none focus:border-purple-500/50 sm:text-sm";

  return (
    <div className={`grid ${gapClass} md:grid-cols-4`}>
      <label className="space-y-1.5">
        <span className={`${labelClass} text-gray-400`}>Year</span>
        <select
          value={vehicleForm.year}
          onChange={(event) =>
            setVehicleForm((current) => ({
              ...current,
              year: event.target.value,
              model: "",
              generation: "",
            }))
          }
          className={inputClass}
        >
          <option value="">Select year</option>
          {YEAR_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1.5">
        <span className={`${labelClass} text-gray-400`}>Make</span>
        <select
          value={vehicleForm.make}
          onChange={(event) =>
            setVehicleForm((current) => ({
              ...current,
              make: event.target.value,
              model: "",
              generation: "",
            }))
          }
          className={inputClass}
        >
          <option value="">Select make</option>
          {availableMakes.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1.5">
        <span className={`${labelClass} text-gray-400`}>Model</span>
        <select
          value={vehicleForm.model}
          onChange={(event) =>
            setVehicleForm((current) => ({
              ...current,
              model: event.target.value,
              generation: "",
            }))
          }
          disabled={!vehicleForm.year || !vehicleForm.make}
          className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <option value="">
            {vehicleForm.year && vehicleForm.make
              ? "Select model"
              : "Pick year + make first"}
          </option>
          {availableModels.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1.5">
        <span className={`${labelClass} text-gray-400`}>Generation</span>
        <select
          value={vehicleForm.generation}
          onChange={(event) =>
            setVehicleForm((current) => ({
              ...current,
              generation: event.target.value,
            }))
          }
          disabled={!vehicleForm.model || availableGenerations.length === 0}
          className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <option value="">
            {vehicleForm.model
              ? availableGenerations.length
                ? "Select generation"
                : "No known generations"
              : "Pick model first"}
          </option>
          {availableGenerations.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function FitmentProfileCard({
  car,
  vehicleReady,
  lookup,
}: {
  car: string;
  vehicleReady: boolean;
  lookup: VehicleFitmentLookupResponse;
}) {
  if (!vehicleReady) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-700 bg-[#151515] px-4 py-3 text-[11px] text-gray-400 sm:text-sm">
        Pick a year, make, and model to lock a fitment profile before wheel
        results load.
      </div>
    );
  }

  if (lookup.status === "loading" || lookup.status === "idle") {
    return (
      <div className="rounded-2xl border border-gray-800 bg-[#151515] px-4 py-3 text-[11px] text-gray-300 sm:text-sm">
        Locking in chassis fitment for {car}...
      </div>
    );
  }

  if (lookup.status === "error") {
    return (
      <div className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-[11px] text-red-100 sm:text-sm">
        {lookup.error || "Fitment profile lookup failed."}
      </div>
    );
  }

  if (lookup.status === "unsupported" || !lookup.profile) {
    return (
      <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-[11px] text-amber-100 sm:text-sm">
        We have your year, make, and model, but this chassis does not have a
        locked fitment profile in the app yet. Search will still use the car
        selection, but exact wheel fitment needs a profile source.
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 space-y-3">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-white">Fitment profile</h3>
        <p className="text-[11px] text-emerald-100/80 sm:text-sm">
          Wheel search is now anchored to a locked chassis profile for {car}.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs">
        <span className="rounded-full border border-emerald-300/20 bg-black/20 px-2.5 py-1 text-emerald-50">
          {lookup.profile.source.replace(/_/g, " ")}
        </span>
        <span className="rounded-full border border-emerald-300/20 bg-black/20 px-2.5 py-1 text-emerald-50">
          {lookup.profile.confidence} confidence
        </span>
      </div>

      {lookup.profile.notes && (
        <p className="text-[10px] text-emerald-100/70 sm:text-xs">
          {lookup.profile.notes}
        </p>
      )}
    </section>
  );
}

type PartFinderResultsPanelProps = {
  activeModKeys: FinderModKey[];
  selectedMods: SelectedPartFinderMods;
  partCatalogs: PartCatalogMap;
  fitmentLookup: VehicleFitmentLookupResponse;
  hasSearchVehicleInfo: boolean;
  car: string;
  liveBuildPricing: {
    pricedMods: Array<{
      key: FinderModKey;
      label: string;
      amount: number;
      displayPrice: string;
      itemTitle: string;
      unitPrice: number;
    }>;
    total: number;
    missingCount: number;
  };
  emptyStateMessage?: string;
  renderCostDebug?: {
    estimatedUsd: number;
    model: string;
    size: string;
    quality: string;
    note: string;
  } | null;
};

export function PartFinderResultsPanel({
  activeModKeys,
  selectedMods,
  partCatalogs,
  fitmentLookup,
  hasSearchVehicleInfo,
  car,
  liveBuildPricing,
  emptyStateMessage = "Choose some mods, then live part search results will show up here.",
  renderCostDebug = null,
}: PartFinderResultsPanelProps) {
  const combinedSearchDebug = useMemo(
    () =>
      activeModKeys
        .map((key) => {
          const catalog = partCatalogs[key];
          if (!catalog?.debug) return null;

          return {
            key,
            title: buildGroupTitle(
              getSearchSectionHeading(key),
              describeSelectedMod(key, selectedMods[key] || null),
            ),
            query: catalog.query,
            status: catalog.status,
            debug: catalog.debug,
          };
        })
        .filter(Boolean) as Array<{
        key: FinderModKey;
        title: string;
        query: string;
        status: PartFinderSearchResponse["status"];
        debug: NonNullable<PartFinderSearchResponse["debug"]>;
      }>,
    [activeModKeys, partCatalogs, selectedMods],
  );
  const combinedSearchCost = useMemo(
    () =>
      combinedSearchDebug.reduce(
        (totals, entry) => {
          const cost = entry.debug.cost;
          if (!cost) return totals;

          return {
            totalUsd: totals.totalUsd + cost.totalUsd,
            inputUsd: totals.inputUsd + cost.inputUsd,
            cachedInputUsd: totals.cachedInputUsd + cost.cachedInputUsd,
            outputUsd: totals.outputUsd + cost.outputUsd,
            webSearchUsd: totals.webSearchUsd + cost.webSearchUsd,
            inputTokens: totals.inputTokens + cost.inputTokens,
            cachedInputTokens:
              totals.cachedInputTokens + cost.cachedInputTokens,
            outputTokens: totals.outputTokens + cost.outputTokens,
            webSearchCalls: totals.webSearchCalls + cost.webSearchCalls,
          };
        },
        {
          totalUsd: 0,
          inputUsd: 0,
          cachedInputUsd: 0,
          outputUsd: 0,
          webSearchUsd: 0,
          inputTokens: 0,
          cachedInputTokens: 0,
          outputTokens: 0,
          webSearchCalls: 0,
        },
      ),
    [combinedSearchDebug],
  );
  const totalEstimatedDebugCost =
    combinedSearchCost.totalUsd + (renderCostDebug?.estimatedUsd ?? 0);
  const wheelSearchDebug =
    combinedSearchDebug.find((entry) => entry.key === "wheels") || null;
  const hasCombinedDebug = Boolean(
    renderCostDebug || combinedSearchDebug.length,
  );

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {activeModKeys.map((modKey) => (
          <PartCatalogSection
            key={modKey}
            title={buildGroupTitle(
              getSearchSectionHeading(modKey),
              describeSelectedMod(modKey, selectedMods[modKey] || null),
            )}
            subtitle={getSearchSectionSubtitle(modKey, car)}
            priceLabel={getCatalogPriceLabel(partCatalogs[modKey])}
            vehicleReady={hasSearchVehicleInfo}
            waitingOnFitment={
              modKey === "wheels" && fitmentLookup.status === "loading"
            }
            emptyMessage={getNoResultsMessage(modKey)}
            catalog={partCatalogs[modKey]}
          />
        ))}

        {!activeModKeys.length && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-gray-400">
            {emptyStateMessage}
          </div>
        )}
      </div>

      {activeModKeys.length > 0 && (
        <section className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 space-y-3">
          <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Build cost from live listings
              </h2>
              <p className="text-[11px] text-emerald-100/80 sm:text-sm">
                Totaled from the priced listings currently shown on this page.
              </p>
            </div>
            <p className="text-xl font-semibold text-emerald-50">
              {liveBuildPricing.pricedMods.length
                ? formatUsd(liveBuildPricing.total)
                : "Waiting on prices"}
            </p>
          </div>

          {liveBuildPricing.pricedMods.length > 0 ? (
            <div className="grid gap-2 md:grid-cols-2">
              {liveBuildPricing.pricedMods.map((mod) => (
                <div
                  key={mod.key}
                  className="rounded-xl border border-emerald-300/15 bg-black/20 px-3 py-2.5"
                >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-medium text-white sm:text-sm">
                          {mod.label}
                        </p>
                        <p className="text-[10px] text-emerald-100/70 line-clamp-2 sm:text-xs">
                          {mod.itemTitle}
                        </p>
                        {mod.key === "wheels" && (
                          <p className="text-[10px] text-emerald-100/60 sm:text-xs">
                            Wheel pricing uses 4 rims: {formatUsd(mod.unitPrice)} each
                          </p>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-50 sm:text-sm">
                        {mod.displayPrice}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-emerald-300/15 bg-black/20 px-3 py-3 text-[11px] text-emerald-100/75 sm:text-sm">
              Live prices will show up here as soon as the listings return
              numeric pricing.
            </p>
          )}

          {liveBuildPricing.missingCount > 0 && (
            <p className="text-[10px] text-emerald-100/65 sm:text-xs">
              {liveBuildPricing.missingCount} selected{" "}
              {liveBuildPricing.missingCount === 1 ? "mod is" : "mods are"} not
              included yet because no numeric live price is showing for them.
            </p>
          )}

          {hasCombinedDebug && (
            <details className="rounded-xl border border-white/10 bg-black/20 p-3 text-[11px] text-gray-300 sm:text-sm">
              <summary className="cursor-pointer text-white/85">
                Cost debug
              </summary>

              <div className="mt-3 grid gap-2">
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-[#111111] px-3 py-2">
                  <span className="text-gray-400">Render cost</span>
                  <span className="font-medium text-white">
                    {formatUsd(renderCostDebug?.estimatedUsd ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-[#111111] px-3 py-2">
                  <span className="text-gray-400">Prompt/search cost</span>
                  <span className="font-medium text-white">
                    {formatUsd(combinedSearchCost.totalUsd)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-emerald-300/20 bg-emerald-500/10 px-3 py-2">
                  <span className="text-emerald-100">Total estimated cost</span>
                  <span className="font-semibold text-emerald-50">
                    {formatUsd(totalEstimatedDebugCost)}
                  </span>
                </div>
              </div>

              {wheelSearchDebug && (
                <div className="mt-4 space-y-3">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-gray-500 sm:text-xs">
                      Wheel search prompt
                    </p>
                    <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-[#111111] p-3 text-[10px] leading-relaxed text-gray-200 sm:text-xs">
                      {wheelSearchDebug.debug.prompt}
                    </pre>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-gray-500 sm:text-xs">
                      Wheel search phrases
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {wheelSearchDebug.debug.searchQueries.map((query) => (
                        <span
                          key={query}
                          className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-gray-200 sm:text-xs"
                        >
                          {query}
                        </span>
                      ))}
                    </div>
                  </div>

                  {wheelSearchDebug.debug.relaxedFallbackUsed &&
                    wheelSearchDebug.debug.relaxedPrompt && (
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-amber-300/80 sm:text-xs">
                          Wheel relaxed fallback prompt
                        </p>
                        <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-amber-300/20 bg-amber-500/5 p-3 text-[10px] leading-relaxed text-amber-50 sm:text-xs">
                          {wheelSearchDebug.debug.relaxedPrompt}
                        </pre>
                      </div>
                    )}
                </div>
              )}
            </details>
          )}
        </section>
      )}
    </div>
  );
}

type PartCatalogSectionProps = {
  title: string;
  subtitle?: string;
  priceLabel?: string | null;
  vehicleReady: boolean;
  waitingOnFitment?: boolean;
  emptyMessage: string;
  catalog: PartFinderSearchResponse;
};

function PartCatalogSection({
  title,
  subtitle,
  priceLabel,
  vehicleReady,
  waitingOnFitment = false,
  emptyMessage,
  catalog,
}: PartCatalogSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-800 bg-[#101010] p-4 space-y-3">
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {priceLabel && (
            <span className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-50 sm:text-xs">
              {priceLabel}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="mt-0.5 text-[11px] text-gray-400 sm:text-sm">
            {subtitle}
          </p>
        )}
      </div>

      {!vehicleReady && (
        <p className="rounded-xl border border-dashed border-gray-700 bg-[#151515] px-3 py-3 text-[11px] text-gray-400 sm:text-sm">
          Pick a year, make, and model above, then choose a generation when
          available to unlock better live part listings.
        </p>
      )}

      {vehicleReady && waitingOnFitment && (
        <p className="rounded-xl border border-gray-700 bg-[#151515] px-3 py-3 text-[11px] text-gray-300 sm:text-sm">
          Locking in fitment context before pulling listings...
        </p>
      )}

      {vehicleReady && !waitingOnFitment && catalog.status === "loading" && (
        <p className="rounded-xl border border-gray-700 bg-[#151515] px-3 py-3 text-[11px] text-gray-300 sm:text-sm">
          Searching live parts results...
        </p>
      )}

      {vehicleReady && !waitingOnFitment && catalog.status === "idle" && (
        <p className="rounded-xl border border-dashed border-gray-700 bg-[#151515] px-3 py-3 text-[11px] text-gray-400 sm:text-sm">
          Live search is ready for this mod. Start a search to pull listings
          into the build.
        </p>
      )}

      {vehicleReady && catalog.status === "provider_not_configured" && (
        <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-3 text-[11px] text-amber-100 sm:text-sm">
          Live search is wired up, but the OpenAI API key is not configured on
          the server yet.
        </div>
      )}

      {vehicleReady && catalog.status === "error" && (
        <div className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-3 text-[11px] text-red-100 sm:text-sm">
          {catalog.error || "Live part lookup failed."}
        </div>
      )}

      {vehicleReady && catalog.status === "no_results" && (
        <div className="rounded-xl border border-gray-700 bg-[#151515] px-3 py-3 text-[11px] text-gray-300 sm:text-sm">
          {emptyMessage}
        </div>
      )}

      {vehicleReady && catalog.items.length > 0 && (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {catalog.items.map((item) => (
              <PartCatalogCard key={item.id} item={item} />
            ))}
          </div>

          <div className="flex flex-col gap-1 text-[10px] text-gray-500 sm:text-xs">
            <p>
              Live source: {catalog.source} results for "{catalog.query}".
            </p>
            <p>
              Always double-check exact fitment, finish, quantity, and hardware
              before buying.
            </p>
          </div>
        </>
      )}

    </section>
  );
}

function PartCatalogCard({ item }: { item: PartFinderSearchItem }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-gray-700 bg-[#151515]">
      <div className="aspect-[4/3] w-full bg-black/40">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[11px] text-gray-500 sm:text-sm">
            No image
          </div>
        )}
      </div>

      <div className="space-y-3 p-3">
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-3">
            <h4 className="line-clamp-2 text-sm font-semibold text-white">
              {item.title}
            </h4>
            <span className="rounded-full border border-purple-400/25 bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-100 sm:text-xs">
              {item.price}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 sm:text-sm">{item.subtitle}</p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] uppercase tracking-[0.16em] text-gray-500 sm:text-xs">
            {item.source}
          </span>
          <a
            href={item.linkUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-medium text-white/85 transition hover:bg-white/5 sm:text-sm"
          >
            View Listing
          </a>
        </div>
      </div>
    </article>
  );
}

export function createEmptyCatalog(): PartFinderSearchResponse {
  return {
    status: "idle",
    query: "",
    items: [],
    source: "openai",
  };
}

export function createEmptyCatalogMap(): PartCatalogMap {
  return PART_FINDER_MOD_KEYS.reduce((acc, key) => {
    acc[key] = createEmptyCatalog();
    return acc;
  }, {} as PartCatalogMap);
}

export function getCatalogPriceLabel(catalog: PartFinderSearchResponse) {
  const pricedAmounts = catalog.items
    .map((item) => parsePriceAmount(item.price))
    .filter((amount): amount is number => amount !== null);

  if (!pricedAmounts.length) return null;

  return `From ${formatUsd(Math.min(...pricedAmounts))}`;
}

export function parsePriceAmount(price: string) {
  const normalized = price.replace(/,/g, "");
  const match = normalized.match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
  if (!match) return null;

  const amount = Number(match[1]);
  return Number.isFinite(amount) ? amount : null;
}

export function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getSearchSectionHeading(key: FinderModKey) {
  switch (key) {
    case "wheels":
      return "Wheel options";
    case "tint":
      return "Tint options";
    case "spacers":
      return "Spacer kits";
    case "suspension":
      return "Suspension options";
    case "spoiler":
      return "Spoiler options";
    case "chrome_delete":
      return "Chrome delete options";
    case "front_lip":
      return "Front lip options";
    case "diffuser":
      return "Diffuser options";
    default:
      return "Part options";
  }
}

export function getSearchSectionSubtitle(key: FinderModKey, car: string) {
  switch (key) {
    case "wheels":
      return `Live wheel listings for ${car}, based on the wheel style you selected in the render.`;
    case "tint":
      return `Live tint-film and installer-friendly results tailored to ${car}.`;
    case "spacers":
      return `Live spacer listings sized around the fitment direction for ${car}.`;
    case "suspension":
      return `Live suspension listings matched to the stance style you selected for ${car}.`;
    case "spoiler":
      return `Live spoiler listings shaped around the rear-end style you picked for ${car}.`;
    case "chrome_delete":
      return `Live blackout trim results that line up with the chrome-delete look on ${car}.`;
    case "front_lip":
      return `Live front lip and splitter listings chosen around the front-end style on ${car}.`;
    case "diffuser":
      return `Live diffuser listings selected around the rear valance style on ${car}.`;
    default:
      return `Live parts results for ${car}.`;
  }
}

export function getNoResultsMessage(key: FinderModKey) {
  switch (key) {
    case "wheels":
      return "No direct wheel listings cleared the current filters yet.";
    case "tint":
      return "No direct tint listings cleared the current filters yet.";
    case "spacers":
      return "No direct spacer listings cleared the current filters yet.";
    case "suspension":
      return "No direct suspension listings cleared the current filters yet.";
    case "spoiler":
      return "No direct spoiler listings cleared the current filters yet.";
    case "chrome_delete":
      return "No direct chrome-delete listings cleared the current filters yet.";
    case "front_lip":
      return "No direct front-lip listings cleared the current filters yet.";
    case "diffuser":
      return "No direct diffuser listings cleared the current filters yet.";
    default:
      return "No direct part listings cleared the current filters yet.";
  }
}

export function buildGroupTitle(base: string, detail: string | null) {
  return detail ? `${base} for your ${detail}` : base;
}

export function describeSelectedMod(
  key: FinderModKey,
  value: string | null,
): string | null {
  if (!value) return null;

  switch (key) {
    case "tint":
      return describeTint(value);
    case "wheels":
      return describeWheels(value);
    case "spacers":
      return describeSpacers(value);
    case "suspension":
      return describeSuspension(value);
    case "spoiler":
      return describeSpoiler(value);
    case "chrome_delete":
      return describeChromeDelete(value);
    case "front_lip":
      return describeFrontLip(value);
    case "diffuser":
      return describeDiffuser(value);
    default:
      return null;
  }
}

function describeTint(value: string) {
  if (value === "light" || value === "50" || value === "75") {
    return "light tint";
  }
  if (value === "dark_sides_rear" || value === "20" || value === "5") {
    return "dark tint";
  }
  if (value === "35") {
    return "medium tint";
  }
  return "window tint";
}

function describeWheels(value: string) {
  switch (value) {
    case "chrome_deep_dish":
      return "chrome deep dish wheels";
    case "oem_rotor":
      return "OEM rotor wheels";
    case "gloss_black":
      return "gloss black multi-spokes";
    case "gloss_black_rotor":
      return "black rotor wheels";
    case "brushed_silver":
      return "brushed silver motorsport wheels";
    case "bronze_concave":
      return "bronze concave wheels";
    default:
      return "wheel setup";
  }
}

function describeSpacers(value: string) {
  switch (value) {
    case "flush":
      return "flush spacer setup";
    case "aggressive":
      return "aggressive spacer setup";
    default:
      return "spacer setup";
  }
}

function describeSuspension(value: string) {
  switch (value) {
    case "bagged_airedout":
      return "aired-out stance";
    case "lowering_springs":
      return "mild lowering springs stance";
    case "slammed":
      return "slammed static stance";
    default:
      return "suspension setup";
  }
}

function describeSpoiler(value: string) {
  switch (value) {
    case "lip":
      return "lip spoiler";
    case "duckbill":
      return "duckbill spoiler";
    default:
      return "spoiler setup";
  }
}

function describeChromeDelete(value: string) {
  switch (value) {
    case "window_trim_only":
      return "window trim blackout";
    case "trim_and_grille":
      return "trim and grille blackout";
    case "full":
      return "full chrome delete";
    default:
      return "chrome delete";
  }
}

function describeFrontLip(value: string) {
  switch (value) {
    case "oem_plus":
      return "OEM+ front lip";
    case "maxton_style":
      return "Maxton-style front lip";
    case "carbon_splitter":
      return "carbon splitter";
    case "track_splitter_rods":
      return "track splitter with rods";
    default:
      return "front lip setup";
  }
}

function describeDiffuser(value: string) {
  switch (value) {
    case "oem_plus_no_tips":
      return "OEM+ diffuser";
    case "sport_with_quads":
      return "quad-tip diffuser";
    default:
      return "diffuser setup";
  }
}
