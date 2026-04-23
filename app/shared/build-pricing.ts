export type PricingModId =
  | "chrome_delete"
  | "wheels"
  | "suspension"
  | "front_lip"
  | "tint"
  | "spoiler"
  | "diffuser";

export type PricingModState = {
  enabled: boolean;
  optionId: string | null;
};

export type PricingModsState = Record<PricingModId, PricingModState>;

type PriceRange = {
  min: number;
  max: number;
};

export type BuildPriceLine = {
  id: PricingModId;
  label: string;
  min: number;
  max: number;
};

export type BuildPriceEstimate = {
  lines: BuildPriceLine[];
  totalMin: number;
  totalMax: number;
};

const DEFAULT_PRICE_RANGES: Record<PricingModId, PriceRange> = {
  chrome_delete: { min: 250, max: 700 },
  wheels: { min: 1100, max: 2400 },
  suspension: { min: 350, max: 3200 },
  front_lip: { min: 180, max: 1100 },
  tint: { min: 200, max: 500 },
  spoiler: { min: 180, max: 900 },
  diffuser: { min: 250, max: 1800 },
};

const OPTION_PRICE_RANGES: Partial<
  Record<PricingModId, Record<string, PriceRange>>
> = {
  wheels: {
    chrome_deep_dish: { min: 1500, max: 2400 },
    oem_rotor: { min: 900, max: 1500 },
    gloss_black: { min: 1000, max: 1800 },
    gloss_black_rotor: { min: 1000, max: 1700 },
    brushed_silver: { min: 1100, max: 1900 },
    bronze_concave: { min: 1200, max: 2100 },
  },
  suspension: {
    bagged_airedout: { min: 2200, max: 3200 },
    lowering_springs: { min: 350, max: 900 },
    slammed: { min: 900, max: 1800 },
  },
  chrome_delete: {
    window_trim_only: { min: 250, max: 450 },
    trim_and_grille: { min: 350, max: 600 },
    full: { min: 500, max: 700 },
  },
  front_lip: {
    oem_plus: { min: 180, max: 350 },
    maxton_style: { min: 280, max: 600 },
    carbon_splitter: { min: 500, max: 900 },
    track_splitter_rods: { min: 650, max: 1100 },
  },
  tint: {
    light: { min: 200, max: 350 },
    dark_sides_rear: { min: 250, max: 500 },
  },
  spoiler: {
    lip: { min: 180, max: 450 },
    duckbill: { min: 350, max: 900 },
  },
  diffuser: {
    oem_plus_no_tips: { min: 250, max: 700 },
    sport_with_quads: { min: 700, max: 1800 },
  },
};

const MOD_LABELS: Record<PricingModId, string> = {
  chrome_delete: "Chrome delete",
  wheels: "Wheels",
  suspension: "Suspension / stance",
  front_lip: "Front lip",
  tint: "Tint",
  spoiler: "Spoiler",
  diffuser: "Diffuser",
};

function getRange(id: PricingModId, optionId: string | null): PriceRange {
  if (optionId) {
    const optionRange = OPTION_PRICE_RANGES[id]?.[optionId];
    if (optionRange) return optionRange;
  }
  return DEFAULT_PRICE_RANGES[id];
}

export function formatPrice(value: number): string {
  return `$${value.toLocaleString()}`;
}

export function getBuildPriceEstimate(
  mods: PricingModsState,
): BuildPriceEstimate {
  const lines: BuildPriceLine[] = [];

  for (const id of Object.keys(mods) as PricingModId[]) {
    const mod = mods[id];
    if (!mod?.enabled) continue;

    const range = getRange(id, mod.optionId);
    lines.push({
      id,
      label: MOD_LABELS[id],
      min: range.min,
      max: range.max,
    });
  }

  return {
    lines,
    totalMin: lines.reduce((sum, line) => sum + line.min, 0),
    totalMax: lines.reduce((sum, line) => sum + line.max, 0),
  };
}
