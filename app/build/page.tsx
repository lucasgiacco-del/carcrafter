"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import stanceAngleExample from "../../stance_bagged_airedout.webp";
import { useAuth } from "../shared/auth";
import type {
  PartFinderSearchResponse,
  VehicleFormState,
} from "../shared/part-finder";
import {
  FitmentProfileCard,
  formatUsd,
  getSearchSectionHeading,
  PartFinderResultsPanel,
  parsePriceAmount,
  VehicleSelectionFields,
  usePartFinderExperience,
  type FinderModKey,
  type PartCatalogMap,
  type SelectedPartFinderMods,
} from "../shared/part-finder-live";
import {
  createSavedBuild,
  type SavedBuildBuilderSnapshot,
  type SavedBuildPartFinderResult,
} from "../shared/saved-builds";
import { getSupabaseBrowserClient } from "../shared/supabase-browser";

// ============================================================================
// TYPES
// ============================================================================

type ModId =
  | "chrome_delete"
  | "wheels"
  | "suspension"
  | "front_lip"
  | "tint"
  | "spoiler"
  | "diffuser";

type SelectedModState = {
  enabled: boolean;
  optionId: string | null;
};

type ModsState = Record<ModId, SelectedModState>;

type StepId = "upload" | "mods" | "generate";
type BuildPackId = "oem_plus" | "slammed" | "murdered" | "track";
type PackSide = "front" | "rear";

type RenderCostDebug = {
  estimatedUsd: number;
  model: string;
  size: string;
  quality: string;
  note: string;
};

type FirstShownEstimateLine = {
  key: FinderModKey;
  label: string;
  itemTitle: string;
  amount: number;
};

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_MODS: ModsState = {
  chrome_delete: { enabled: false, optionId: null },
  wheels: { enabled: false, optionId: null },
  suspension: { enabled: false, optionId: null },
  front_lip: { enabled: false, optionId: null },
  tint: { enabled: false, optionId: null },
  spoiler: { enabled: false, optionId: null },
  diffuser: { enabled: false, optionId: null },
};

const DEFAULT_VEHICLE_FORM: VehicleFormState = {
  year: "",
  make: "",
  model: "",
  generation: "",
};

// Mod option definitions for the UI
const MOD_OPTIONS = {
  wheels: [
    { id: "chrome_deep_dish", label: "Chrome Deep Dish" },
    { id: "oem_rotor", label: "OEM-style Rotor" },
    { id: "gloss_black", label: "Gloss Black Multi-spoke" },
    { id: "gloss_black_rotor", label: "Gloss Black Rotor" },
    { id: "brushed_silver", label: "Brushed Silver Motorsport" },
    { id: "bronze_concave", label: "Bronze Concave" },
  ],
  suspension: [
    { id: "bagged_airedout", label: "Bagged / Aired Out" },
    { id: "lowering_springs", label: "Lowering Springs (mildly lowered)" },
    { id: "slammed", label: "Coilovers (static)" },
  ],
  chrome_delete: [
    { id: "window_trim_only", label: "Window Trim Only" },
    { id: "trim_and_grille", label: "Trim + Grille Surround" },
    { id: "full", label: "Gloss Black Chrome Delete" },
  ],
  front_lip: [
    { id: "oem_plus", label: "OEM Lip" },
    { id: "maxton_style", label: "Maxton-Style Extension" },
    { id: "carbon_splitter", label: "Carbon Splitter" },
    { id: "track_splitter_rods", label: "Track Splitter" },
  ],
  tint: [
    { id: "light", label: "Light Tint" },
    { id: "dark_sides_rear", label: "Limo Tint" },
  ],
  spoiler: [
    { id: "lip", label: "Lip Spoiler" },
    { id: "duckbill", label: "Duckbill (integrated)" },
  ],
  diffuser: [
    { id: "oem_plus_no_tips", label: "OEM+ Diffuser" },
    { id: "sport_with_quads", label: "Quad Tip Diffuser" },
  ],
} as const;

const MOD_LABELS: Record<ModId, string> = {
  wheels: "Wheels",
  suspension: "Suspension",
  chrome_delete: "Chrome Delete",
  front_lip: "Front Lip",
  tint: "Tint",
  spoiler: "Spoiler",
  diffuser: "Diffuser",
};

type ActivePack = {
  id: BuildPackId;
  name: string;
  side: PackSide | null;
  summary: string;
  angleTitle: string;
  angleDescription: string;
  showAngleExample: boolean;
  mods: ModsState;
};

function withSelectedMods(selected: Partial<Record<ModId, string>>): ModsState {
  return (Object.keys(DEFAULT_MODS) as ModId[]).reduce((acc, id) => {
    const optionId = selected[id] ?? null;
    acc[id] = {
      enabled: optionId !== null,
      optionId,
    };
    return acc;
  }, {} as ModsState);
}

function parsePackId(value: string | null): BuildPackId | null {
  if (
    value === "oem_plus" ||
    value === "slammed" ||
    value === "murdered" ||
    value === "track"
  ) {
    return value;
  }
  return null;
}

function parsePackSide(value: string | null): PackSide {
  return value === "rear" ? "rear" : "front";
}

function resolveActivePack(
  packValue: string | null,
  sideValue: string | null,
): ActivePack | null {
  const packId = parsePackId(packValue);
  if (!packId) return null;

  const side = parsePackSide(sideValue);

  switch (packId) {
    case "slammed":
      return {
        id: packId,
        name: "Slammed Pack",
        side: null,
        summary:
          "Chrome deep dish wheels, bagged suspension, Maxton-style extension, and limo tint are preselected.",
        angleTitle: "Use a front 1/4 or 3/4 photo.",
        angleDescription:
          "This pack depends on a front-biased stance shot, so upload a front quarter angle like the example before moving on.",
        showAngleExample: true,
        mods: withSelectedMods({
          wheels: "chrome_deep_dish",
          suspension: "bagged_airedout",
          front_lip: "maxton_style",
          tint: "dark_sides_rear",
        }),
      };
    case "oem_plus":
      return {
        id: packId,
        name: "OEM+ Pack",
        side,
        summary:
          side === "rear"
            ? "OEM rotor wheels, lowering springs, light tint, OEM+ diffuser, and a lip spoiler are preselected."
            : "OEM rotor wheels, lowering springs, light tint, OEM lip, and OEM+ diffuser are preselected.",
        angleTitle:
          side === "rear" ? "Use a rear photo." : "Use a front photo.",
        angleDescription:
          side === "rear"
            ? "Rear OEM+ focuses on the spoiler and diffuser, so a rear-facing upload works best."
            : "Front OEM+ focuses on the lip, so a front-facing upload works best.",
        showAngleExample: side === "front",
        mods: withSelectedMods({
          wheels: "oem_rotor",
          suspension: "lowering_springs",
          tint: "light",
          diffuser: "oem_plus_no_tips",
          ...(side === "rear"
            ? { spoiler: "lip" }
            : { front_lip: "oem_plus" }),
        }),
      };
    case "murdered":
      return {
        id: packId,
        name: "Murdered Pack",
        side,
        summary:
          side === "rear"
            ? "Gloss black multi-spoke wheels, lowering springs, gloss black chrome delete, a lip spoiler, and a quad tip diffuser are preselected."
            : "Gloss black multi-spoke wheels, lowering springs, gloss black chrome delete, and a Maxton-style front lip are preselected.",
        angleTitle:
          side === "rear" ? "Use a rear photo." : "Use a front photo.",
        angleDescription:
          side === "rear"
            ? "Rear Murdered highlights the lip spoiler and diffuser, so upload a rear-facing shot."
            : "Front Murdered highlights the lip and blackout trim, so upload a front-facing shot.",
        showAngleExample: side === "front",
        mods: withSelectedMods({
          wheels: "gloss_black",
          suspension: "lowering_springs",
          chrome_delete: "full",
          ...(side === "rear"
            ? { spoiler: "lip", diffuser: "sport_with_quads" }
            : { front_lip: "maxton_style" }),
        }),
      };
    case "track":
      return {
        id: packId,
        name: "Track Pack",
        side: "front",
        summary:
          "Brushed silver motorsport wheels, coilovers, and a track splitter are preselected.",
        angleTitle: "Use a front photo.",
        angleDescription:
          "This pack is front-only because the splitter is mandatory, so upload a front-facing photo before continuing.",
        showAngleExample: true,
        mods: withSelectedMods({
          wheels: "brushed_silver",
          suspension: "slammed",
          front_lip: "track_splitter_rods",
        }),
      };
  }
}

// ============================================================================
// IMAGE UTILITIES
// ============================================================================

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

async function downscaleImageDataUrl(
  dataUrl: string,
  maxSide = 1024,
  format: "image/jpeg" | "image/png" = "image/jpeg",
  jpegQuality = 0.85,
): Promise<string> {
  const img = new Image();
  img.decoding = "async";

  const loaded = new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load image"));
  });

  img.src = dataUrl;
  await loaded;

  const w0 = img.naturalWidth || img.width;
  const h0 = img.naturalHeight || img.height;
  if (!w0 || !h0) throw new Error("Invalid image dimensions");

  // Always output a square canvas (maxSide x maxSide) WITHOUT stretching.
  // We letterbox/pad the image to preserve aspect ratio.
  const outW = Math.max(1, Math.round(maxSide));
  const outH = outW;

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  // Fill background. (Black looks natural for car photos and avoids weird transparent edges.)
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, outW, outH);

  // Contain-fit the image inside the square.
  const scale = Math.min(outW / w0, outH / h0);
  const drawW = Math.max(1, Math.round(w0 * scale));
  const drawH = Math.max(1, Math.round(h0 * scale));
  const dx = Math.round((outW - drawW) / 2);
  const dy = Math.round((outH - drawH) / 2);

  ctx.drawImage(img, dx, dy, drawW, drawH);

  if (format === "image/png") {
    return canvas.toDataURL("image/png");
  }

  // JPEG is much smaller than PNG and avoids "image too large" errors.
  return canvas.toDataURL("image/jpeg", jpegQuality);
}

function getImageFileExtension(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "png";
}

async function buildShareableImageFile(imageUrl: string): Promise<File> {
  const response = await fetch(imageUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Could not prepare that render for sharing.");
  }

  const blob = await response.blob();
  const mime =
    blob.type || response.headers.get("content-type")?.split(";")[0] || "image/png";

  return new File([blob], `car-crafter-render.${getImageFileExtension(mime)}`, {
    type: mime,
  });
}

function triggerFileDownload(file: File) {
  const objectUrl = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = file.name;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

// ============================================================================
// PROMPT BUILDING
// ============================================================================

function clampText(s: string, max = 150) {
  if (!s) return "";
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max) : t;
}

type EditModes = {
  onlyModId: ModId | null;
  spoilerOnly: boolean;
  tintOnly: boolean;
  wheelsOnly: boolean;
  suspensionOnly: boolean;
  chromeDeleteOnly: boolean;
  frontLipOnly: boolean;
  diffuserOnly: boolean;
};

function computeEditModes(current: ModsState): EditModes {
  const enabled = (Object.keys(current) as ModId[]).filter(
    (k) => current[k].enabled,
  );
  const onlyModId = enabled.length === 1 ? enabled[0] : null;

  return {
    onlyModId,
    spoilerOnly: onlyModId === "spoiler",
    tintOnly: onlyModId === "tint",
    wheelsOnly: onlyModId === "wheels",
    suspensionOnly: onlyModId === "suspension",
    chromeDeleteOnly: onlyModId === "chrome_delete",
    frontLipOnly: onlyModId === "front_lip",
    diffuserOnly: onlyModId === "diffuser",
  };
}

function buildModsText(current: ModsState): string {
  const parts: string[] = [];

  // Wheels
  if (current.wheels.enabled) {
    switch (current.wheels.optionId) {
      case "chrome_deep_dish":
        parts.push(
          "Wheels (required): shiny chrome deep-dish 5-spoke wheels with a polished step lip.",
        );
        break;
      case "oem_rotor":
        parts.push("Wheels: silver B8.5 Audi-style rotor wheels with thick angular 5-spoke arms, keep them clean.");
        break;
      case "gloss_black":
        parts.push("Wheels: high-gloss black alloy wheels with a finish designed for a luxurious and performance look.");
        break;
      case "gloss_black_rotor":
        parts.push("Wheels: BLACK B8.5 Audi-style rotor wheels with thick angular 5-spoke arms, keep them clean.");
        break;
      case "brushed_silver":
        parts.push("Wheels: brushed silver motorsport wheel with a clean aggressive split spoke design deep sharp sculpted lines and a race inspired look.");
        break;
      case "bronze_concave":
        parts.push("BRONZE GLOSS WHEELS: multi-spoke concave bronze alloy wheels with thin spokes and a deep center profile, wrapped in performance tires");
        break;
    }
    parts.push("Match F/R");
  }

  // Diffuser
  if (current.diffuser.enabled) {
    switch (current.diffuser.optionId) {
      case "oem_plus_no_tips":
        parts.push(
          "OEM+ style Diffuser (required): OEM+ valance with fins; factory fit; factory exhaust tips unchanged",
        );
        break;
      case "sport_with_quads":
        parts.push(
          "Diffuser (required): OEM+ valance w/ QUAD tips; keep trunk lines/taillights/plate unchanged",
        );
        break;
    }
  }

  // Chrome delete
  if (current.chrome_delete.enabled) {
    switch (current.chrome_delete.optionId) {
      case "window_trim_only":
        parts.push(
          "Chrome Delete: window trim only(keep grille, wheels, etc UNCHANGED)",
        );
        break;
      case "trim_and_grille":
        parts.push("Chrome Delete: window trim and grille ONLY");
        break;
      case "full":
        parts.push(
          "Chrome Delete: exterior chrome trimmed out in gloss black; keep body color unchanged.",
        );
        break;
    }
  }

  // Suspension
  if (current.suspension.enabled) {
    switch (current.suspension.optionId) {
      case "bagged_airedout":
        parts.push("Stance: aired out.");
        break;
      case "lowering_springs":
        parts.push("Stance: subtle drop ~1 inch (lowering springs)");
        break;
      default:
        parts.push("Suspension: lowered on coilovers.");
        break;
    }
  }

  // Front lip
  if (current.front_lip.enabled) {
    switch (current.front_lip.optionId) {
      case "oem_plus":
        parts.push("Front Lip: OEM-style lip.");
        break;
      case "maxton_style":
        parts.push("Front Lip: Maxton-style extension.");
        break;
      case "carbon_splitter":
        parts.push("Front Lip: carbon fiber front splitter.");
        break;
      case "track_splitter_rods":
        parts.push("Front Lip: track splitter.");
        break;
    }
  }

  // Tint
  if (current.tint.enabled) {
    parts.push(
      current.tint.optionId === "light"
        ? "Light Tint: on the car window glass only! (Don't tint the whole car!)."
        : "Dark Limo Tint: on the car window glass only !(Don't tint the whole car!).",
    );
  }

  // Spoiler
  if (current.spoiler.enabled) {
    switch (current.spoiler.optionId) {
      case "lip":
        // Keep subtle: basically a straight, low-profile lip.
        parts.push(
          "Spoiler: subtle straight trunk lip, low-profile, clean straight line.",
        );
        break;
      case "duckbill":
        // More pronounced, like an integrated duckbill (wider + thicker than lip), but do NOT change trunk/taillights.
        parts.push(
          "Spoiler: integrated DUCKBILL, wider and thicker than lip, gentle upward kick, smooth transitions.",
        );
        break;
    }
  }

  const cleaned = parts.map((p) => p.trim()).filter(Boolean);
  if (!cleaned.length) return "";
  return cleaned.join("; ");
}

function buildClientIntent(current: ModsState, extraNote: string): string {
  const modsText = buildModsText(current);
  const note = clampText(extraNote, 120);

  const parts = ["Only apply these selected mods: "];

  if (modsText) {
    parts.push(`${modsText}.`);
  }

  if (note) {
    parts.push(`User note: ${note}.`);
  }

  return clampText(parts.join(" "), 360);
}

function buildSelectedModsPayload(current: ModsState) {
  return {
    chrome_delete: {
      enabled: Boolean(current.chrome_delete.enabled),
      optionId: current.chrome_delete.optionId,
    },
    wheels: {
      enabled: Boolean(current.wheels.enabled),
      optionId: current.wheels.optionId,
    },
    suspension: {
      enabled: Boolean(current.suspension.enabled),
      optionId: current.suspension.optionId,
    },
    front_lip: {
      enabled: Boolean(current.front_lip.enabled),
      optionId: current.front_lip.optionId,
    },
    tint: {
      enabled: Boolean(current.tint.enabled),
      optionId: current.tint.optionId,
    },
    spoiler: {
      enabled: Boolean(current.spoiler.enabled),
      optionId: current.spoiler.optionId,
    },
    diffuser: {
      enabled: Boolean(current.diffuser.enabled),
      optionId: current.diffuser.optionId,
    },
  };
}

function buildPartFinderUrl(
  current: ModsState,
  vehicleForm: VehicleFormState,
): string {
  const params = new URLSearchParams();

  for (const [id, mod] of Object.entries(current) as Array<
    [ModId, SelectedModState]
  >) {
    if (!mod.enabled || !mod.optionId) continue;
    params.set(id, mod.optionId);
  }

  for (const [key, value] of Object.entries(vehicleForm)) {
    const trimmed = value.trim();
    if (trimmed) {
      params.set(key, trimmed);
    }
  }

  const query = params.toString();
  return query ? `/partfinder?${query}` : "/partfinder";
}

function buildSavedPartFinderResults(
  activeModKeys: FinderModKey[],
  partCatalogs: PartCatalogMap,
): SavedBuildPartFinderResult[] {
  return activeModKeys.flatMap((modKey) => {
    const catalog = partCatalogs[modKey];
    if (!catalog) return [];

    const normalizedQuery = catalog.query.trim();
    if (!normalizedQuery && !catalog.items.length) return [];

    return [
      {
        modKey,
        query: normalizedQuery,
        items: catalog.items,
      },
    ];
  });
}

function buildSavedBuilderSnapshot(
  current: ModsState,
  extraPrompt: string,
): SavedBuildBuilderSnapshot | null {
  const selectedMods = (Object.entries(current) as Array<[ModId, SelectedModState]>)
    .filter(([, mod]) => mod.enabled)
    .map(([modId, mod]) => {
      const optionLabel =
        mod.optionId == null
          ? null
          : MOD_OPTIONS[modId].find((option) => option.id === mod.optionId)
              ?.label ?? mod.optionId;

      return {
        modId,
        modLabel: MOD_LABELS[modId],
        optionId: mod.optionId,
        optionLabel,
      };
    });

  const trimmedExtraPrompt = extraPrompt.trim();
  if (!selectedMods.length && !trimmedExtraPrompt) {
    return null;
  }

  return {
    extraPrompt: trimmedExtraPrompt,
    selectedMods,
  };
}

// ============================================================================
// UI HELPERS
// ============================================================================

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function stepIndex(step: StepId): number {
  if (step === "upload") return 0;
  if (step === "mods") return 1;
  return 2;
}

// ============================================================================
// COMPONENTS
// ============================================================================

function BeforeAfterSlider({
  before,
  after,
}: {
  before: string;
  after: string;
}) {
  const [pct, setPct] = useState(0);
  const beforeOpacity = Math.max(0, 1 - pct / 18);
  const afterOpacity = Math.min(1, Math.max(0, (pct - 8) / 18));

  return (
    <div className="render-frame w-full">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black">
        <img src={before} alt="Before" className="w-full block" />
        <div
          className="pointer-events-none absolute left-3 top-3 z-10 rounded-full border border-white/15 bg-black/70 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur transition-opacity duration-200"
          style={{ opacity: beforeOpacity }}
        >
          Before
        </div>
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
        >
          <img
            src={after}
            alt="After"
            className="w-full h-full object-cover block"
          />
          <div
            className="pointer-events-none absolute right-3 top-3 rounded-full border border-white/15 bg-black/70 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur transition-opacity duration-200"
            style={{ opacity: afterOpacity }}
          >
            After
          </div>
        </div>
        <div
          className="pointer-events-none absolute top-0 bottom-0 z-10"
          style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
        >
          <div className="h-full w-[2px] bg-white/80 shadow-[0_0_18px_rgba(255,255,255,0.35)]" />
          <div className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/75 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur">
            <div className="flex h-full items-center justify-center text-white/90">
              <span className="text-sm">↔</span>
            </div>
          </div>
        </div>
      </div>
      <input
        className="mt-4 w-full accent-purple-500"
        type="range"
        min={0}
        max={100}
        value={pct}
        onChange={(e) => setPct(Number(e.target.value))}
      />
    </div>
  );
}

interface ModToggleProps {
  label: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  options?: { id: string; label: string }[];
  selectedOption?: string | null;
  onOptionChange?: (optionId: string) => void;
  children?: React.ReactNode;
}

function ModToggle({
  label,
  enabled,
  onToggle,
  options,
  selectedOption,
  onOptionChange,
  children,
}: ModToggleProps) {
  return (
    <div
      className={cx(
        "rounded-2xl border p-4 sm:p-5 transition-colors",
        enabled
          ? "border-purple-500/50 bg-purple-500/10"
          : "border-white/10 bg-white/[0.02]",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-base font-medium text-white">{label}</span>
        <button
          type="button"
          onClick={() => onToggle(!enabled)}
          className={cx(
            "relative h-7 w-14 rounded-full transition-colors",
            enabled ? "bg-purple-500" : "bg-white/20",
          )}
        >
          <span
            className={cx(
              "absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform",
              enabled ? "translate-x-7" : "translate-x-0",
            )}
          />
        </button>
      </div>

      {enabled && options && options.length > 0 && (
        <div className="mt-3">
          <label className="mb-2 block text-xs text-white/60 sm:text-sm">Style</label>
          <select
            value={selectedOption || ""}
            onChange={(e) => onOptionChange?.(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white outline-none focus:border-purple-500/50 sm:text-sm"
          >
            {options.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {enabled && children}
    </div>
  );
}

function FeatureToggle({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4">
      <div className="space-y-1">
        <p className="text-base font-medium text-white">{label}</p>
        <p className="text-sm leading-relaxed text-white/60">{description}</p>
      </div>
      <button
        type="button"
        aria-pressed={enabled}
        onClick={() => onToggle(!enabled)}
        className={cx(
          "relative mt-0.5 h-7 w-14 shrink-0 rounded-full transition-colors",
          enabled ? "bg-purple-500" : "bg-white/20",
        )}
      >
        <span
          className={cx(
            "absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform",
            enabled ? "translate-x-7" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}

// ============================================================================
// MAIN
// ============================================================================

export default function BuildPage() {
  const router = useRouter();
  const { user, isConfigured } = useAuth();
  const requestSeq = useRef(0);
  const appliedPackSignatureRef = useRef<string | null>(null);

  // Core state
  const [step, setStep] = useState<StepId>("upload");
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [lastGeneratedPrompt, setLastGeneratedPrompt] = useState<string | null>(
    null,
  );

  // Mod state
  const [mods, setMods] = useState<ModsState>(DEFAULT_MODS);
  const [extraPrompt, setExtraPrompt] = useState("");
  const [vehicleForm, setVehicleForm] =
    useState<VehicleFormState>(DEFAULT_VEHICLE_FORM);
  const [searchPartsWhileRendering, setSearchPartsWhileRendering] =
    useState(true);
  const [partSearchRequested, setPartSearchRequested] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showUploadTips, setShowUploadTips] = useState(false);
  const [showResultLightbox, setShowResultLightbox] = useState(false);
  const [isExportingResult, setIsExportingResult] = useState(false);
  const [resultActionMessage, setResultActionMessage] = useState<string | null>(
    null,
  );
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [renderCostDebug, setRenderCostDebug] = useState<RenderCostDebug | null>(
    null,
  );
  const [packQuery, setPackQuery] = useState<{
    pack: string | null;
    side: string | null;
  }>({
    pack: null,
    side: null,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activePack = useMemo(
    () => resolveActivePack(packQuery.pack, packQuery.side),
    [packQuery],
  );

  // Computed
  const hasAnyMod = useMemo(
    () => Object.values(mods).some((m) => m.enabled),
    [mods],
  );
  const selectedPartFinderMods = useMemo(
    () =>
      (Object.entries(mods) as Array<[ModId, SelectedModState]>).reduce(
        (acc, [id, mod]) => {
          if (mod.enabled && mod.optionId) {
            acc[id] = mod.optionId;
          }
          return acc;
        },
        {} as SelectedPartFinderMods,
      ),
    [mods],
  );
  const {
    activeModKeys,
    availableGenerations,
    availableMakes,
    availableModels,
    buildTags,
    car,
    fitmentLookup,
    hasSearchVehicleInfo,
    hasVehicleInfo,
    liveBuildPricing,
    partCatalogs,
    vehicleLabel,
  } = usePartFinderExperience({
    vehicleForm,
    setVehicleForm,
    selectedMods: selectedPartFinderMods,
    enabledSearch: partSearchRequested && searchPartsWhileRendering,
  });
  const firstShownEstimate = useMemo(() => {
    const lines = activeModKeys
      .map((key) => {
        const firstItem = partCatalogs[key]?.items[0];
        if (!firstItem) return null;

        const unitPrice = parsePriceAmount(firstItem.price);
        if (unitPrice === null) return null;

        return {
          key,
          label: getSearchSectionHeading(key),
          itemTitle: firstItem.title,
          amount: key === "wheels" ? unitPrice * 4 : unitPrice,
        } satisfies FirstShownEstimateLine;
      })
      .filter(Boolean) as FirstShownEstimateLine[];

    return {
      lines,
      total: lines.reduce((sum, line) => sum + line.amount, 0),
      missingCount: activeModKeys.length - lines.length,
    };
  }, [activeModKeys, partCatalogs]);

  useEffect(() => {
    if (step !== "generate" && partSearchRequested) {
      setPartSearchRequested(false);
    }
  }, [partSearchRequested, step]);

  useEffect(() => {
    if (resultImage) return;
    setShowResultLightbox(false);
    setResultActionMessage(null);
  }, [resultImage]);

  useEffect(() => {
    if (!showResultLightbox) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowResultLightbox(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showResultLightbox]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPackQuery({
      pack: params.get("pack"),
      side: params.get("side"),
    });
  }, []);

  useEffect(() => {
    const nextSignature = activePack
      ? `${activePack.id}:${activePack.side ?? "none"}`
      : "none";

    if (appliedPackSignatureRef.current === nextSignature) {
      return;
    }

    appliedPackSignatureRef.current = nextSignature;

    if (activePack) {
      setMods(activePack.mods);
      setError(null);
    }
  }, [activePack]);

  function setModEnabled(id: ModId, enabled: boolean) {
    setMods((prev) => {
      const next = { ...prev };
      const defaults: Record<ModId, string> = {
        chrome_delete: "trim_and_grille",
        wheels: "chrome_deep_dish",
        suspension: "bagged_airedout",
        front_lip: "oem_plus",
        tint: "dark_sides_rear",
        spoiler: "lip",
        diffuser: "oem_plus_no_tips",
      };
      next[id] = { enabled, optionId: enabled ? defaults[id] : null };
      return next;
    });
  }

  function setModOption(id: ModId, optionId: string) {
    if (!optionId) return;
    setMods((prev) => ({
      ...prev,
      [id]: { ...prev[id], optionId },
    }));
  }

  const handleUpload = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      setResultImage(null);
      setLastGeneratedPrompt(null);
      setSaveMessage(null);
      setResultActionMessage(null);
      setDebug(null);
      setRenderCostDebug(null);
      setPartSearchRequested(false);
      const raw = await fileToDataUrl(file);
      const normalized = await downscaleImageDataUrl(
        raw,
        1024,
        "image/jpeg",
        0.85,
      );
      setInputImage(normalized);
    } catch (err: any) {
      setError(err?.message || "Failed to process image");
    }
  }, []);

  function openUploadTips() {
    setShowUploadTips(true);
  }

  function closeUploadTips() {
    setShowUploadTips(false);
  }

  function openFilePicker() {
    setShowUploadTips(false);
    fileInputRef.current?.click();
  }

  async function handleDropFile(file: File) {
    try {
      setError(null);
      setResultImage(null);
      setLastGeneratedPrompt(null);
      setSaveMessage(null);
      setResultActionMessage(null);
      setDebug(null);
      setRenderCostDebug(null);
      setPartSearchRequested(false);
      const raw = await fileToDataUrl(file);
      const normalized = await downscaleImageDataUrl(
        raw,
        1024,
        "image/jpeg",
        0.85,
      );
      setInputImage(normalized);
    } catch (err: any) {
      setError(err?.message || "Failed to process image");
    }
  }

  async function handleGenerate() {
    if (!inputImage) {
      setError("Upload a photo first");
      setStep("upload");
      return;
    }

    const modsText = buildModsText(mods);
    if (!modsText) {
      setError("Select at least one modification before generating");
      return;
    }

    const mySeq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    setDebug(null);
    setResultImage(null);
    setLastGeneratedPrompt(null);
    setResultActionMessage(null);
    setSaveMessage(null);
    setRenderCostDebug(null);
    if (searchPartsWhileRendering) {
      setPartSearchRequested(true);
    }

    try {
      const finalPrompt = buildClientIntent(mods, extraPrompt);
      const requestId = `build_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const modes = computeEditModes(mods);
      const enabledModIds = (Object.keys(mods) as ModId[])
        .filter((id) => mods[id].enabled)
        .join(",");

      setDebug(
        [
          `request=${requestId}`,
          `mods=${enabledModIds || "none"}`,
          `intent_len=${finalPrompt.length}`,
          `intent=${finalPrompt}`,
          "",
          "Waiting for exact server prompt...",
        ].join("\n"),
      );

      const response = await fetch(`/api/generate?ts=${Date.now()}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          imageDataUrl: inputImage,
          size: "1024x1024",
          selectedMods: buildSelectedModsPayload(mods),
          clientRequestId: requestId,
          modes,
          spoilerOnly: modes.spoilerOnly,
          onlyModId: modes.onlyModId,
        }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data?.error || `Generation failed (HTTP ${response.status})`,
        );
      if (!data?.url) throw new Error("No image returned");

      if (requestSeq.current === mySeq) {
        setRenderCostDebug({
          estimatedUsd: data?.costEstimate?.estimatedUsd ?? 0.034,
          model: data?.costEstimate?.model || "gpt-image-1.5",
          size: data?.costEstimate?.size || "1024x1024",
          quality: data?.costEstimate?.quality || "medium",
          note:
            data?.costEstimate?.note ||
            "Assumes the current default GPT Image 1.5 quality for 1024x1024 edits.",
        });
        setDebug(
          [
            `request=${requestId}`,
            `mods=${enabledModIds || "none"}`,
            `intent_len=${finalPrompt.length}`,
            `intent=${finalPrompt}`,
            "",
            `render_model=${data?.costEstimate?.model || "gpt-image-1.5"}`,
            `render_size=${data?.costEstimate?.size || "1024x1024"}`,
            `render_quality_assumption=${data?.costEstimate?.quality || "medium"}`,
            `render_estimated_cost=${formatDebugUsd(data?.costEstimate?.estimatedUsd ?? 0.034)}`,
            `render_cost_note=${data?.costEstimate?.note || "Assumes the current default GPT Image 1.5 quality for 1024x1024 edits."}`,
            "",
            `server_prompt_len=${data?.finalPrompt?.length || 0}`,
            "server_prompt:",
            data?.finalPrompt || "(missing finalPrompt in API response)",
          ].join("\n"),
        );
        setLastGeneratedPrompt(finalPrompt);
        setResultImage(data.url);
      }
    } catch (err: any) {
      if (requestSeq.current === mySeq) {
        setError(err?.message || "Generation failed");
      }
    } finally {
      if (requestSeq.current === mySeq) {
        setLoading(false);
      }
    }
  }

  async function handleSaveBuild() {
    if (!resultImage || !lastGeneratedPrompt) {
      setSaveMessage("Generate a render first before saving.");
      return;
    }

    if (!isConfigured) {
      setSaveMessage("Add real Supabase keys first to turn on account-based saves.");
      return;
    }

    if (!user) {
      sessionStorage.setItem("carcrafter_auth_next", "/library");
      router.push("/sign-in?next=/library");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setSaveMessage("Supabase is not configured yet.");
      return;
    }

    try {
      await createSavedBuild(supabase, {
        prompt: lastGeneratedPrompt,
        originalImage: inputImage,
        resultImage,
        vehicleLabel: hasVehicleInfo ? vehicleLabel : null,
        vehicleForm: hasVehicleInfo ? vehicleForm : null,
        builderSnapshot: buildSavedBuilderSnapshot(mods, extraPrompt),
        partFinderResults: buildSavedPartFinderResults(
          activeModKeys,
          partCatalogs,
        ),
      });
      setSaveMessage("Saved to Library! Opening Library…");
      window.setTimeout(() => {
        router.push("/library");
      }, 350);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save this build.";
      setSaveMessage(message);
    }
  }

  function openResultLightbox() {
    if (!resultImage) return;
    setShowResultLightbox(true);
  }

  function closeResultLightbox() {
    setShowResultLightbox(false);
  }

  async function handleShareResult() {
    if (!resultImage) return;

    setIsExportingResult(true);
    setResultActionMessage(null);

    try {
      const file = await buildShareableImageFile(resultImage);
      const shareData = {
        files: [file],
        title: "Car Crafter render",
        text: "Rendered with Car Crafter",
      };

      if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData);
        setResultActionMessage(
          "Use Save Image in the share sheet to add it to Photos.",
        );
        return;
      }

      triggerFileDownload(file);
      setResultActionMessage(
        "Image downloaded. Open it from Downloads to save or share it.",
      );
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }

      if (navigator.share) {
        try {
          await navigator.share({
            title: "Car Crafter render",
            text: "Rendered with Car Crafter",
            url: resultImage,
          });
          setResultActionMessage("Share sheet opened.");
          return;
        } catch (shareErr: unknown) {
          if (shareErr instanceof DOMException && shareErr.name === "AbortError") {
            return;
          }
        }
      }

      window.open(resultImage, "_blank", "noopener,noreferrer");
      setResultActionMessage(
        "Opened the image in a new tab. Press and hold it there to save it.",
      );
    } finally {
      setIsExportingResult(false);
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <main
      className="min-h-screen bg-black text-white flex flex-col"
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragActive(false);
      }}
      onDrop={async (e) => {
        e.preventDefault();
        setDragActive(false);
        const f = e.dataTransfer.files?.[0];
        if (f) await handleDropFile(f);
      }}
    >
      {/* Header */}
      <header className="border-b border-white/5 bg-gradient-to-b from-purple-900/20 to-black">
        <div className="app-shell-wide py-5 flex items-center gap-3 sm:gap-4">
          <div className="w-11 h-11 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center sm:w-12 sm:h-12">
            <svg
              className="w-6 h-6 text-purple-400 sm:w-7 sm:h-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold sm:text-2xl">Car Crafter</h1>
            <p className="text-sm text-white/60">
              Visualize your build before you spend
            </p>
          </div>
        </div>
      </header>

      {/* Drag overlay */}
      {dragActive && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center">
          <div className="rounded-2xl border-2 border-dashed border-purple-500 bg-purple-500/10 px-8 py-6 text-center">
            <p className="text-lg font-semibold text-purple-300">
              Drop image to upload
            </p>
          </div>
        </div>
      )}

      {showUploadTips && (
        <div className="fixed inset-0 z-50 bg-black/80 px-4 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0c0c15] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.8)]">
              <p className="text-[11px] uppercase tracking-[0.22em] text-purple-200/80">
                {activePack ? `${activePack.name} tips` : "Upload tips"}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-white">
                {activePack
                  ? activePack.angleTitle
                  : "Use a photo that matches the mods you want."}
              </h3>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-gray-300">
                {activePack ? (
                  <p>{activePack.angleDescription}</p>
                ) : (
                  <>
                    <p>Front-facing shots work best for front lips.</p>
                    <p>Rear-facing shots work best for spoilers and diffusers.</p>
                    <p>Side or 3/4 angles work best for wheels, tint, and stance.</p>
                  </>
                )}
              </div>
              {activePack?.showAngleExample && (
                <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/25">
                  <img
                    src={stanceAngleExample.src}
                    alt="Example front 3/4 angle"
                    className="block w-full object-cover"
                  />
                  <p className="px-4 py-3 text-xs leading-relaxed text-gray-300">
                    Example angle for this pack. Keep the front corner of the car visible
                    and framed like this when possible.
                  </p>
                </div>
              )}
              {activePack && (
                <div className="mt-4 rounded-2xl border border-purple-400/20 bg-purple-500/10 px-4 py-3 text-sm text-purple-100">
                  Auto-selected mods: {activePack.summary}
                </div>
              )}
              {!activePack && (
                <div className="mt-4 rounded-2xl border border-purple-400/20 bg-purple-500/10 px-4 py-3 text-sm text-purple-100">
                  Match the camera angle to the main mod you care about most for the cleanest render.
                </div>
              )}
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={closeUploadTips}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-gray-200 transition hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="flex-1 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(123,97,255,0.35)] transition hover:from-purple-400 hover:to-purple-600"
                >
                  Choose photo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex justify-center">
        <div className="app-shell-wide w-full py-6 flex flex-col gap-6 sm:py-8">
          {/* Step indicator */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm text-white/60">
              <span>Step {stepIndex(step) + 1} of 3</span>
              <span>
                {step === "upload"
                  ? "Upload"
                  : step === "mods"
                    ? "Mods"
                    : "Generate"}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-300"
                style={{ width: `${((stepIndex(step) + 1) / 3) * 100}%` }}
              />
            </div>
          </div>

          {/* ========== STEP 1: UPLOAD ========== */}
          {step === "upload" && (
            <div className="space-y-4">
              {activePack && (
                <div className="rounded-3xl border border-purple-400/20 bg-purple-500/10 p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-purple-200/80">
                        Pack loaded
                      </p>
                      <h2 className="text-lg font-semibold text-white">
                        {activePack.name}
                        {activePack.side
                          ? ` · ${activePack.side === "front" ? "Front" : "Rear"}`
                          : ""}
                      </h2>
                      <p className="text-sm leading-relaxed text-purple-100/90">
                        {activePack.summary}
                      </p>
                      <p className="text-sm text-purple-200/80">
                        {activePack.angleTitle} {activePack.angleDescription}
                      </p>
                    </div>

                    {activePack.showAngleExample && (
                      <div className="w-full max-w-xs overflow-hidden rounded-2xl border border-white/10 bg-black/25">
                        <img
                          src={stanceAngleExample.src}
                          alt="Example front 3/4 angle"
                          className="block w-full object-cover"
                        />
                        <p className="px-4 py-3 text-xs text-gray-300">
                          Angle example
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-7">
                  <h2 className="mb-2 text-lg font-semibold sm:text-xl">
                    Upload your car
                  </h2>
                  <p className="mb-5 text-sm text-white/60 sm:text-base">
                    {activePack
                      ? "Upload a clean photo that matches this pack's required angle."
                      : "Upload a clean photo of your car to get started."}
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUpload}
                  />
                  <button
                    type="button"
                    onClick={openUploadTips}
                    className="block w-full cursor-pointer rounded-2xl border-2 border-dashed border-white/20 p-7 text-center transition hover:border-purple-500/50 hover:bg-purple-500/5 sm:p-8"
                  >
                    <div className="mb-1 text-base text-white/80 sm:text-lg">
                      Tap to upload or drag and drop
                    </div>
                    <div className="text-sm text-white/50">
                      JPG, PNG • Real photos work best
                    </div>
                  </button>

                  {inputImage && (
                    <img
                      src={inputImage}
                      alt="Preview"
                      className="render-frame mt-5 max-h-56 w-full rounded-xl border border-white/10 object-cover"
                    />
                  )}

                  {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-7">
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold sm:text-xl">
                      Car setup for parts search
                    </h2>
                    <p className="text-sm text-white/60 sm:text-base">
                      Add your car details here so live parts can start looking up
                      fitment and listings the moment you render.
                    </p>
                  </div>

                  <div className="mt-5 space-y-4">
                    <VehicleSelectionFields
                      vehicleForm={vehicleForm}
                      setVehicleForm={setVehicleForm}
                      availableMakes={availableMakes}
                      availableModels={availableModels}
                      availableGenerations={availableGenerations}
                      dense
                    />

                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-gray-300">
                      <span className="text-white/75">Current car:</span>{" "}
                      {hasVehicleInfo ? vehicleLabel : "Not set yet"}
                    </div>

                    <FeatureToggle
                      label="Search parts while rendering"
                      description="When this is on, the result page starts the live fitment and parts lookup at the same time as your AI render."
                      enabled={searchPartsWhileRendering}
                      onToggle={setSearchPartsWhileRendering}
                    />

                    <FitmentProfileCard
                      car={car}
                      vehicleReady={hasSearchVehicleInfo}
                      lookup={fitmentLookup}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========== STEP 2: MODS ========== */}
          {step === "mods" && inputImage && (
            <div className="grid gap-4 xl:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)] xl:items-start">
              {/* Photo preview */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 xl:sticky xl:top-6">
                <p className="mb-3 text-sm font-medium text-white/60">
                  Your photo
                </p>
                <img
                  src={inputImage}
                  alt="Your car"
                  className="render-frame rounded-xl w-full max-h-72 object-cover border border-white/10"
                />
              </div>

              {/* Manual mod selection */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
                <h2 className="mb-2 text-lg font-semibold sm:text-xl">Manual</h2>
                <p className="mb-5 text-sm text-white/60 sm:text-base">
                  {activePack
                    ? "This pack already selected the matching mods. You can tweak them below."
                    : "Select the modifications you want."}
                </p>

                {activePack && (
                  <div className="mb-5 rounded-2xl border border-purple-400/20 bg-purple-500/10 px-4 py-3 text-sm leading-relaxed text-purple-100">
                    <span className="font-semibold text-white">
                      {activePack.name}
                      {activePack.side
                        ? ` · ${activePack.side === "front" ? "Front" : "Rear"}`
                        : ""}
                    </span>
                    {" · "}
                    {activePack.summary}
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  {/* Wheels */}
                  <ModToggle
                    label="Wheels"
                    enabled={mods.wheels.enabled}
                    onToggle={(e) => setModEnabled("wheels", e)}
                    options={[...MOD_OPTIONS.wheels]}
                    selectedOption={mods.wheels.optionId}
                    onOptionChange={(id) => setModOption("wheels", id)}
                  />

                  {/* Suspension */}
                  <ModToggle
                    label="Suspension / stance"
                    enabled={mods.suspension.enabled}
                    onToggle={(e) => setModEnabled("suspension", e)}
                    options={[...MOD_OPTIONS.suspension]}
                    selectedOption={mods.suspension.optionId}
                    onOptionChange={(id) => setModOption("suspension", id)}
                  />

                  {/* Chrome delete */}
                  <ModToggle
                    label="Chrome delete"
                    enabled={mods.chrome_delete.enabled}
                    onToggle={(e) => setModEnabled("chrome_delete", e)}
                    options={[...MOD_OPTIONS.chrome_delete]}
                    selectedOption={mods.chrome_delete.optionId}
                    onOptionChange={(id) => setModOption("chrome_delete", id)}
                  />

                  {/* Tint */}
                  <ModToggle
                    label="Tint"
                    enabled={mods.tint.enabled}
                    onToggle={(e) => setModEnabled("tint", e)}
                    options={[...MOD_OPTIONS.tint]}
                    selectedOption={mods.tint.optionId}
                    onOptionChange={(id) => setModOption("tint", id)}
                  />

                  {/* Spoiler */}
                  <ModToggle
                    label="Spoiler"
                    enabled={mods.spoiler.enabled}
                    onToggle={(e) => setModEnabled("spoiler", e)}
                    options={[...MOD_OPTIONS.spoiler]}
                    selectedOption={mods.spoiler.optionId}
                    onOptionChange={(id) => setModOption("spoiler", id)}
                  />

                  {/* Diffuser */}
                  <ModToggle
                    label="Diffuser"
                    enabled={mods.diffuser.enabled}
                    onToggle={(e) => setModEnabled("diffuser", e)}
                    options={[...MOD_OPTIONS.diffuser]}
                    selectedOption={mods.diffuser.optionId}
                    onOptionChange={(id) => setModOption("diffuser", id)}
                  />

                  {/* Front lip */}
                  <ModToggle
                    label="Front lip"
                    enabled={mods.front_lip.enabled}
                    onToggle={(e) => setModEnabled("front_lip", e)}
                    options={[...MOD_OPTIONS.front_lip]}
                    selectedOption={mods.front_lip.optionId}
                    onOptionChange={(id) => setModOption("front_lip", id)}
                  />
                </div>

              </div>

              {error && <p className="text-sm text-red-400 xl:col-span-2">{error}</p>}
            </div>
          )}

          {/* ========== STEP 3: GENERATE ========== */}
          {step === "generate" && (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,34rem)_minmax(18rem,1fr)] xl:items-start">
              {/* Result */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 min-h-[280px] xl:sticky xl:top-6">
                <h2 className="mb-4 text-lg font-semibold sm:text-xl">Result</h2>

                {resultImage ? (
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={openResultLightbox}
                      className="render-frame group block w-full overflow-hidden rounded-[1.35rem] border border-white/10 bg-black text-left transition hover:border-purple-400/50"
                    >
                      <div className="relative">
                        <img
                          src={resultImage}
                          alt="Generated"
                          className="block max-h-[32rem] w-full object-contain"
                        />
                        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 rounded-full border border-white/10 bg-black/75 px-4 py-2 text-xs font-medium text-white/90 backdrop-blur">
                          <span>Tap to view full screen</span>
                          <span className="text-purple-200 transition group-hover:text-white">
                            Share now →
                          </span>
                        </div>
                      </div>
                    </button>

                    {inputImage && (
                      <BeforeAfterSlider
                        before={inputImage}
                        after={resultImage}
                      />
                    )}
                  </div>
                ) : loading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-base text-purple-300 animate-pulse">
                        Generating your render…
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-16">
                    <p className="text-base text-white/50">
                      Your generated image will appear here.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4">
                {/* Generate button */}
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full rounded-xl bg-purple-600 py-3.5 text-base font-semibold transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Generating…"
                    : resultImage
                      ? "Regenerate"
                      : "Generate"}
                </button>

                <button
                  type="button"
                  onClick={handleSaveBuild}
                  disabled={!resultImage || loading}
                  className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 py-3.5 text-base font-semibold text-white shadow-[0_14px_40px_rgba(123,97,255,0.35)] transition hover:from-purple-400 hover:to-purple-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {user ? "Save to Library" : "Sign in to Save"}
                </button>

                {error && <p className="text-sm text-red-400">{error}</p>}
                {saveMessage && <p className="text-sm text-emerald-300">{saveMessage}</p>}

                {debug && (
                  <details className="rounded-xl border border-white/10 bg-black/40 p-4">
                    <summary className="cursor-pointer text-sm text-white/60">
                      Debug info
                    </summary>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setPartSearchRequested(true)}
                        disabled={!hasAnyMod || loading}
                        className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-white/55 transition hover:border-purple-400/50 hover:text-purple-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Refresh search
                      </button>
                    </div>
                    <pre className="mt-3 whitespace-pre-wrap text-xs text-white/50">
                      {debug}
                    </pre>
                  </details>
                )}

                {hasAnyMod && (
                  <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-white">
                          Rough Price Estimate
                        </h3>
                        <p className="mt-1 text-sm text-white/60">
                          Estimated from the first priced listing currently shown for
                          each selected mod.
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.12em] text-purple-200/70">
                          Estimated total
                        </p>
                        <p className="text-xl font-semibold text-purple-300">
                          {firstShownEstimate.lines.length
                            ? formatUsd(firstShownEstimate.total)
                            : "Waiting on prices"}
                        </p>
                      </div>
                    </div>

                    {firstShownEstimate.lines.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        {firstShownEstimate.lines.map((line) => (
                          <div
                            key={line.key}
                            className="flex items-start justify-between gap-3 rounded-xl border border-purple-500/15 bg-purple-500/5 px-4 py-3"
                          >
                            <div className="min-w-0">
                              <p className="text-base text-white/85">
                                {line.label}
                              </p>
                              <p className="mt-0.5 line-clamp-2 text-xs text-white/45">
                                {line.itemTitle}
                              </p>
                            </div>
                            <span className="shrink-0 text-sm font-medium text-white/70">
                              {formatUsd(line.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-3 text-sm text-white/55">
                        Live listing prices will appear here once the first visible
                        results come back with numeric pricing.
                      </p>
                    )}

                    <p className="mt-3 text-sm text-white/45">
                      Total uses the first visible priced result for each mod shown on
                      this page, so labor, bundles, fitment, and brand choice can still
                      move the final real-world cost.
                    </p>
                    {firstShownEstimate.missingCount > 0 && (
                      <p className="mt-2 text-xs text-white/35">
                        {firstShownEstimate.missingCount} selected{" "}
                        {firstShownEstimate.missingCount === 1 ? "mod is" : "mods are"}{" "}
                        still waiting on a first priced listing.
                      </p>
                    )}
                  </div>
                )}

                <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-white">
                        Live Part Finder
                      </h3>
                      <p className="mt-1 text-sm text-white/60">
                        Vehicle:{" "}
                        <span className="text-white/85">
                          {hasVehicleInfo ? vehicleLabel : "not set yet"}
                        </span>
                      </p>
                      {buildTags.length > 0 && (
                        <p className="mt-1 text-sm text-purple-200/85">
                          Build tags: {buildTags.join(" · ")}
                        </p>
                      )}
                    </div>
                    <span
                      className={cx(
                        "rounded-full px-3 py-1 text-xs uppercase tracking-[0.14em]",
                        partSearchRequested && searchPartsWhileRendering
                          ? "border border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                          : searchPartsWhileRendering
                            ? "border border-purple-400/30 bg-purple-500/10 text-purple-100"
                            : "border border-white/10 bg-white/[0.03] text-white/60",
                      )}
                    >
                      {partSearchRequested && searchPartsWhileRendering
                        ? "Searching with render"
                        : searchPartsWhileRendering
                          ? "Auto-search armed"
                          : "Auto-search off"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-4">
                    <FeatureToggle
                      label="Search parts alongside the render"
                      description="Leave this on to kick off fitment and listings the second you hit Generate."
                      enabled={searchPartsWhileRendering}
                      onToggle={setSearchPartsWhileRendering}
                    />

                    <FitmentProfileCard
                      car={car}
                      vehicleReady={hasSearchVehicleInfo}
                      lookup={fitmentLookup}
                    />

                    <PartFinderResultsPanel
                      activeModKeys={activeModKeys}
                      selectedMods={selectedPartFinderMods}
                      partCatalogs={partCatalogs}
                      fitmentLookup={fitmentLookup}
                      hasSearchVehicleInfo={hasSearchVehicleInfo}
                      car={car}
                      liveBuildPricing={liveBuildPricing}
                      renderCostDebug={renderCostDebug}
                      emptyStateMessage={
                        partSearchRequested
                          ? "Pick at least one mod in step 2 to search matching parts."
                          : "Hit Generate with auto-search on, or use the inline search button above, to start pulling parts into this build."
                      }
                    />
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer navigation */}
      <footer className="border-t border-white/5 bg-black/90 backdrop-blur">
        <div className="app-shell-wide py-4 flex gap-3">
          <button
            onClick={() => {
              if (step === "mods") setStep("upload");
              else if (step === "generate") setStep("mods");
            }}
            disabled={step === "upload"}
            className="flex-1 rounded-xl border border-white/20 py-3.5 text-base font-medium text-white/80 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>
          <button
            onClick={() => {
              if (step === "upload" && inputImage) setStep("mods");
              else if (step === "mods") setStep("generate");
              else if (step === "generate") handleGenerate();
            }}
            disabled={
              (step === "upload" && !inputImage) ||
              (step === "mods" && !hasAnyMod) ||
              (step === "generate" && loading)
            }
            className="flex-1 rounded-xl bg-purple-600 py-3.5 text-base font-semibold transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {step === "generate"
              ? loading
                ? "Generating…"
                : "Generate"
              : "Next"}
          </button>
        </div>
      </footer>

      {showResultLightbox && resultImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 px-4 py-4 backdrop-blur-md"
          onClick={closeResultLightbox}
        >
          <div
            className="mx-auto flex min-h-full w-full max-w-6xl flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 pb-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-purple-200/80">
                  Fullscreen render
                </p>
                <h3 className="mt-1 text-lg font-semibold text-white">
                  Shareable preview
                </h3>
              </div>
              <button
                type="button"
                onClick={closeResultLightbox}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-purple-400/50 hover:bg-purple-500/10"
              >
                Close
              </button>
            </div>

            <div className="flex flex-1 items-center justify-center">
              <img
                src={resultImage}
                alt="Generated fullscreen preview"
                className="max-h-[calc(100vh-11rem)] w-auto max-w-full object-contain"
              />
            </div>

            <div className="mx-auto mt-4 flex w-full max-w-3xl flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleShareResult}
                disabled={isExportingResult}
                className="flex-1 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(123,97,255,0.35)] transition hover:from-purple-400 hover:to-purple-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isExportingResult ? "Preparing image…" : "Share / Save image"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function formatDebugUsd(amount: number) {
  return `$${amount.toFixed(amount >= 0.1 ? 3 : 4)}`;
}
