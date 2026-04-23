"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { formatPrice, getBuildPriceEstimate } from "../shared/build-pricing";

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
    { id: "slammed", label: "Slammed (static)" },
  ],
  chrome_delete: [
    { id: "window_trim_only", label: "Window Trim Only" },
    { id: "trim_and_grille", label: "Trim + Grille Surround" },
    { id: "full", label: "Full Chrome Delete" },
  ],
  front_lip: [
    { id: "oem_plus", label: "OEM+ (subtle)" },
    { id: "maxton_style", label: "Maxton-Style Extension" },
    { id: "carbon_splitter", label: "Carbon Splitter" },
    { id: "track_splitter_rods", label: "Track Splitter w/ Rods" },
  ],
  tint: [
    { id: "light", label: "Light Tint" },
    { id: "dark_sides_rear", label: "Dark (sides + rear)" },
  ],
  spoiler: [
    { id: "lip", label: "Lip Spoiler" },
    { id: "duckbill", label: "Duckbill (integrated)" },
  ],
  diffuser: [
    { id: "oem_plus_no_tips", label: "OEM+ (subtle fins, keep tips)" },
    { id: "sport_with_quads", label: "Sport + quad tips" },
  ],
} as const;

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
        parts.push("Wheels: rotor gloss blk");
        break;
      case "brushed_silver":
        parts.push("Wheels: brushed silver");
        break;
      case "bronze_concave":
        parts.push("BRONZE GLOSS WHEELS: multi-spoke concave alloy wheels with thin spokes and a deep center profile, wrapped in performance tires");
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
        parts.push("Chrome Delete: window trim, grille, wheels, etc.");
        break;
    }
  }

  // Suspension
  if (current.suspension.enabled) {
    switch (current.suspension.optionId) {
      case "bagged_airedout":
        parts.push("Stance: aired out");
        break;
      case "lowering_springs":
        parts.push("Stance: subtle drop ~1 inch (lowering springs)");
        break;
      default:
        parts.push("Stance: slammed");
        break;
    }
  }

  // Front lip
  if (current.front_lip.enabled) {
    switch (current.front_lip.optionId) {
      case "oem_plus":
        parts.push("Front Lip: OEM+");
        break;
      case "maxton_style":
        parts.push("Front Lip: Maxton");
        break;
      case "carbon_splitter":
        parts.push("Front Lip: carbon");
        break;
      case "track_splitter_rods":
        parts.push("Front Lip: track+rods");
        break;
    }
  }

  // Tint
  if (current.tint.enabled) {
    parts.push(
      current.tint.optionId === "light"
        ? "Tint: light"
        : "Window Tint: dark limo tint on car window glass only",
    );
  }

  // Spoiler
  if (current.spoiler.enabled) {
    switch (current.spoiler.optionId) {
      case "lip":
        // Keep subtle: basically a straight, low-profile lip.
        parts.push(
          "Spoiler: subtle straight trunk lip, low-profile, clean straight line",
        );
        break;
      case "duckbill":
        // More pronounced, like an integrated duckbill (wider + thicker than lip), but do NOT change trunk/taillights.
        parts.push(
          "Spoiler: integrated DUCKBILL, wider and thicker than lip, gentle upward kick, smooth transitions",
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
    parts.push(modsText + ".");
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
  const [pct, setPct] = useState(50);

  return (
    <div className="w-full">
      <div className="relative w-full overflow-hidden rounded-2xl bg-black border border-white/10">
        <img src={before} alt="Before" className="w-full block" />
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
        >
          <img
            src={after}
            alt="After"
            className="w-full h-full object-cover block"
          />
        </div>
        <div
          className="absolute top-0 bottom-0"
          style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
        >
          <div className="h-full w-[2px] bg-white/70" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/60 border border-white/30 px-3 py-2 text-xs">
            <span className="text-white/90">Before</span>
            <span className="mx-2 text-white/40">|</span>
            <span className="text-white/90">After</span>
          </div>
        </div>
      </div>
      <input
        className="mt-3 w-full accent-purple-500"
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
        "rounded-xl border p-4 transition-colors",
        enabled
          ? "border-purple-500/50 bg-purple-500/10"
          : "border-white/10 bg-white/[0.02]",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">{label}</span>
        <button
          type="button"
          onClick={() => onToggle(!enabled)}
          className={cx(
            "relative w-11 h-6 rounded-full transition-colors",
            enabled ? "bg-purple-500" : "bg-white/20",
          )}
        >
          <span
            className={cx(
              "absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform",
              enabled ? "translate-x-5" : "translate-x-0",
            )}
          />
        </button>
      </div>

      {enabled && options && options.length > 0 && (
        <div className="mt-3">
          <label className="block text-[11px] text-white/60 mb-2">Style</label>
          <select
            value={selectedOption || ""}
            onChange={(e) => onOptionChange?.(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50"
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

// ============================================================================
// MAIN
// ============================================================================

export default function BuildPage() {
  const requestSeq = useRef(0);

  // Core state
  const [step, setStep] = useState<StepId>("upload");
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);

  // Mod state
  const [mods, setMods] = useState<ModsState>(DEFAULT_MODS);
  const [extraPrompt, setExtraPrompt] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Computed
  const hasAnyMod = useMemo(
    () => Object.values(mods).some((m) => m.enabled),
    [mods],
  );
  const priceEstimate = useMemo(() => getBuildPriceEstimate(mods), [mods]);

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
      setDebug(null);
      const raw = await fileToDataUrl(file);
      const normalized = await downscaleImageDataUrl(
        raw,
        1024,
        "image/jpeg",
        0.85,
      );
      setInputImage(normalized);
      setStep("mods");
    } catch (err: any) {
      setError(err?.message || "Failed to process image");
    }
  }, []);

  async function handleDropFile(file: File) {
    try {
      setError(null);
      setResultImage(null);
      setDebug(null);
      const raw = await fileToDataUrl(file);
      const normalized = await downscaleImageDataUrl(
        raw,
        1024,
        "image/jpeg",
        0.85,
      );
      setInputImage(normalized);
      setStep("mods");
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
        ].join(" | "),
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
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-purple-400"
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
            <h1 className="text-lg font-semibold">Car Crafter</h1>
            <p className="text-xs text-white/60">
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

      {/* Main content */}
      <div className="flex-1 flex justify-center">
        <div className="w-full max-w-lg px-4 py-6 flex flex-col gap-5">
          {/* Step indicator */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-white/60">
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
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <h2 className="text-base font-semibold mb-1">Upload your car</h2>
              <p className="text-xs text-white/60 mb-4">
                Upload a photo of your car to get started.
              </p>

              <label className="block border-2 border-dashed border-white/20 rounded-xl p-6 text-center cursor-pointer hover:border-purple-500/50 hover:bg-purple-500/5 transition">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUpload}
                />
                <div className="text-white/80 text-sm mb-1">
                  Tap to upload or drag and drop
                </div>
                <div className="text-xs text-white/50">
                  JPG, PNG • Real photos work best
                </div>
              </label>

              {inputImage && (
                <img
                  src={inputImage}
                  alt="Preview"
                  className="mt-4 rounded-xl w-full max-h-48 object-cover border border-white/10"
                />
              )}

              {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
            </div>
          )}

          {/* ========== STEP 2: MODS ========== */}
          {step === "mods" && inputImage && (
            <div className="flex flex-col gap-4">
              {/* Photo preview */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-xs font-medium text-white/60 mb-2">
                  Your photo
                </p>
                <img
                  src={inputImage}
                  alt="Your car"
                  className="rounded-xl w-full max-h-40 object-cover border border-white/10"
                />
              </div>

              {/* Manual mod selection */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <h2 className="text-base font-semibold mb-1">Manual</h2>
                <p className="text-xs text-white/60 mb-4">
                  Select the modifications you want.
                </p>

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

                <div className="mt-4">
                  <label className="block text-xs font-medium text-white/60 mb-2">
                    Extra note
                  </label>
                  <textarea
                    value={extraPrompt}
                    onChange={(e) => setExtraPrompt(e.target.value)}
                    rows={2}
                    placeholder="Anything special? e.g., keep exhaust identical, don’t touch paint…"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-purple-500/50 resize-none"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          )}

          {/* ========== STEP 3: GENERATE ========== */}
          {step === "generate" && (
            <div className="flex flex-col gap-4">
              {/* Result */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 min-h-[280px]">
                <h2 className="text-base font-semibold mb-3">Result</h2>

                {resultImage ? (
                  <div className="space-y-4">
                    <img
                      src={resultImage}
                      alt="Generated"
                      className="rounded-xl w-full object-contain border border-white/10"
                    />

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
                      <p className="text-sm text-purple-300 animate-pulse">
                        Generating your render…
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-16">
                    <p className="text-sm text-white/50">
                      Your generated image will appear here.
                    </p>
                  </div>
                )}
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold transition"
              >
                {loading
                  ? "Generating…"
                  : resultImage
                    ? "Regenerate"
                    : "Generate"}
              </button>

              {error && <p className="text-xs text-red-400">{error}</p>}

              {debug && (
                <details className="rounded-xl border border-white/10 bg-black/40 p-3">
                  <summary className="text-xs text-white/60 cursor-pointer">
                    Debug info
                  </summary>
                  <pre className="mt-2 text-[10px] text-white/50 whitespace-pre-wrap">
                    {debug}
                  </pre>
                </details>
              )}

              {priceEstimate.lines.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        Rough Price Estimate
                      </h3>
                      <p className="mt-1 text-xs text-white/60">
                        Based on the mods you selected. Super rough parts-only
                        guesstimate.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-purple-200/70">
                        Estimated total
                      </p>
                      <p className="text-lg font-semibold text-purple-300">
                        {formatPrice(priceEstimate.totalMin)} -{" "}
                        {formatPrice(priceEstimate.totalMax)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {priceEstimate.lines.map((line) => (
                      <div
                        key={line.id}
                        className="flex items-center justify-between rounded-xl border border-purple-500/15 bg-purple-500/5 px-3 py-2"
                      >
                        <span className="text-sm text-white/85">
                          {line.label}
                        </span>
                        <span className="text-xs text-white/65">
                          {formatPrice(line.min)} - {formatPrice(line.max)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className="mt-3 text-[11px] text-white/45">
                    Turn this render into reality with our part finder!
                    Labor, paint, bodywork, fitment, and brand choice can swing
                    the real total a lot.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer navigation */}
      <footer className="border-t border-white/5 bg-black/90 backdrop-blur">
        <div className="max-w-lg mx-auto px-4 py-3 flex gap-3">
          <button
            onClick={() => {
              if (step === "mods") setStep("upload");
              else if (step === "generate") setStep("mods");
            }}
            disabled={step === "upload"}
            className="flex-1 py-2.5 rounded-xl border border-white/20 text-sm font-medium text-white/80 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition"
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
            className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {step === "generate"
              ? loading
                ? "Generating…"
                : "Generate"
              : "Next"}
          </button>
        </div>
      </footer>
    </main>
  );
}
