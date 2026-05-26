export type VehicleFormState = {
  year: string;
  make: string;
  model: string;
  generation: string;
};

export type PartFinderModType =
  | "wheels"
  | "tint"
  | "spacers"
  | "suspension"
  | "spoiler"
  | "chrome_delete"
  | "front_lip"
  | "diffuser";

export type PartFinderSearchStatus =
  | "idle"
  | "loading"
  | "ok"
  | "no_results"
  | "provider_not_configured"
  | "error";

export type PartFinderSearchItem = {
  id: string;
  title: string;
  subtitle: string;
  price: string;
  imageUrl: string | null;
  linkUrl: string;
  source: string;
  domain: string;
};

export type VehicleFitmentProfile = {
  car: string;
  boltPattern: string;
  hubBore: string;
  wheelSizes: string[];
  offsetRange: [number, number];
  source: "platform_profile";
  confidence: "high" | "medium";
  notes?: string;
};

export type VehicleFitmentLookupStatus =
  | "idle"
  | "loading"
  | "ok"
  | "unsupported"
  | "error";

export type VehicleFitmentLookupResponse = {
  status: VehicleFitmentLookupStatus;
  profile: VehicleFitmentProfile | null;
  error?: string;
};

export type PartFinderSearchResponse = {
  status: PartFinderSearchStatus;
  query: string;
  items: PartFinderSearchItem[];
  source: "openai";
  debug?: {
    model: string;
    searchQueries: string[];
    prompt: string;
    relaxedPrompt?: string;
    relaxedFallbackUsed: boolean;
    cost?: {
      totalUsd: number;
      inputUsd: number;
      cachedInputUsd: number;
      outputUsd: number;
      webSearchUsd: number;
      inputTokens: number;
      cachedInputTokens: number;
      outputTokens: number;
      webSearchCalls: number;
    };
  };
  error?: string;
};

export function buildVehicleLabel({
  year,
  make,
  model,
  generation,
}: VehicleFormState): string {
  const generationLabel = normalizeGenerationSearchText(
    generation,
    make,
    model,
  );

  return [year, make, model, generationLabel].filter(Boolean).join(" ");
}

export function buildPartSearchQuery({
  year,
  make,
  model,
  generation,
  modType,
  optionId,
  fitmentProfile,
}: {
  year: string;
  make: string;
  model: string;
  generation?: string;
  modType: PartFinderModType;
  optionId: string;
  fitmentProfile?: VehicleFitmentProfile | null;
}): string {
  const styleText = getPartStyleSearchText(modType, optionId);
  const buyerIntent = getBuyerIntentTerms(modType);
  const vehicleAnchor = buildVehicleSearchAnchor({
    year,
    make,
    model,
    generation,
  });

  if (modType === "wheels") {
    const wheelStyleText = getWheelBroadStyleSearchText(optionId);
    const preferredSizeText = buildPreferredWheelSizeSearchText(fitmentProfile);
    const sizeRangeText = buildWheelSizeRangeSearchText(fitmentProfile);
    const boltPatternText = fitmentProfile?.boltPattern || "";

    return [
      wheelStyleText,
      preferredSizeText || sizeRangeText,
      boltPatternText,
      "wheels",
      "for sale",
    ]
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  return [vehicleAnchor, styleText, buyerIntent]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export function buildPartSearchQueries({
  year,
  make,
  model,
  generation,
  modType,
  optionId,
  fitmentProfile,
}: {
  year: string;
  make: string;
  model: string;
  generation?: string;
  modType: PartFinderModType;
  optionId: string;
  fitmentProfile?: VehicleFitmentProfile | null;
}) {
  const primary = buildPartSearchQuery({
    year,
    make,
    model,
    generation,
    modType,
    optionId,
    fitmentProfile,
  });

  if (modType !== "wheels") {
    const vehicleAnchor = buildVehicleSearchAnchor({
      year,
      make,
      model,
      generation,
    });
    const styleText = getPartStyleSearchText(modType, optionId);
    const broadTypeText = getBroadPartTypeText(modType);

    return uniqueQueries([
      [vehicleAnchor, styleText].filter(Boolean).join(" ").trim(),
      [vehicleAnchor, broadTypeText, "for sale"]
        .filter(Boolean)
        .join(" ")
        .trim(),
      [vehicleAnchor, styleText, getBuyerIntentTerms(modType), "for sale"]
        .filter(Boolean)
        .join(" ")
        .trim(),
      primary,
    ]);
  }

  const broadStyleText = getWheelBroadStyleSearchText(optionId);
  const preferredSizeText = buildPreferredWheelSizeSearchText(fitmentProfile);
  const alternateSizeText = buildAlternateWheelSizeSearchText(fitmentProfile);
  const sizeRangeText = buildWheelSizeRangeSearchText(fitmentProfile);
  const boltPatternText = fitmentProfile?.boltPattern || "";

  return uniqueQueries([
    [broadStyleText, preferredSizeText, boltPatternText]
      .filter(Boolean)
      .join(" ")
      .trim(),
    [broadStyleText, sizeRangeText, boltPatternText, "wheels", "for sale"]
      .filter(Boolean)
      .join(" ")
      .trim(),
    [
      broadStyleText,
      alternateSizeText || preferredSizeText,
      boltPatternText,
      "wheels",
    ]
      .filter(Boolean)
      .join(" ")
      .trim(),
    primary,
  ]).slice(0, 4);
}

export function getSearchStyleTokens(
  modType: PartFinderModType,
  optionId: string,
): string[] {
  const text = getPartStyleSearchText(modType, optionId);
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

export function getFitmentSearchTokens(
  profile?: VehicleFitmentProfile | null,
): string[] {
  if (!profile) return [];

  return uniqueQueries([
    profile.boltPattern.toLowerCase(),
    profile.hubBore.toLowerCase(),
    `${profile.hubBore.toLowerCase()} hub bore`,
    ...profile.wheelSizes.flatMap((size) => [`${size}x`, `${size} inch`]),
  ]);
}

export function buildFitmentBadgeText(
  profile: VehicleFitmentProfile,
): string[] {
  return [
    profile.boltPattern,
    `${profile.hubBore} hub`,
    `${profile.wheelSizes.join(" / ")} in`,
    `ET${profile.offsetRange[0]}-${profile.offsetRange[1]}`,
  ];
}

export function buildWheelFitmentSearchText(
  profile?: VehicleFitmentProfile | null,
): string {
  if (!profile) return "";

  const sizesText = profile.wheelSizes.length
    ? `${profile.wheelSizes.join(" ")} inch`
    : "";
  const offsetText = profile.offsetRange.length
    ? `offset ${profile.offsetRange[0]} to ${profile.offsetRange[1]}`
    : "";

  return [
    profile.boltPattern,
    `${profile.hubBore} hub bore`,
    sizesText,
    offsetText,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function buildVehicleSearchAnchor({
  year,
  make,
  model,
  generation,
}: {
  year: string;
  make: string;
  model: string;
  generation?: string;
}) {
  const generationLabel = normalizeGenerationSearchText(
    generation || "",
    make,
    model,
  );

  if (generationLabel) {
    return [make, model, generationLabel].filter(Boolean).join(" ");
  }

  return [year, make, model].filter(Boolean).join(" ");
}

export function normalizeGenerationSearchText(
  generation: string,
  make: string,
  model: string,
) {
  const normalizedGeneration = generation.trim();
  const normalizedMake = make.trim();
  const normalizedModel = model.trim();

  if (!normalizedGeneration) return "";
  if (!normalizedMake || !normalizedModel) return normalizedGeneration;

  const prefixPattern = new RegExp(
    `^${escapeRegExp(normalizedMake)}\\s+${escapeRegExp(normalizedModel)}\\s*`,
    "i",
  );

  return normalizedGeneration.replace(prefixPattern, "").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildPreferredWheelSizeSearchText(
  profile?: VehicleFitmentProfile | null,
) {
  const preferredSize =
    profile?.wheelSizes.at(-2) || profile?.wheelSizes.at(-1);
  return preferredSize ? `${preferredSize} inch` : "";
}

function buildAlternateWheelSizeSearchText(
  profile?: VehicleFitmentProfile | null,
) {
  const alternateSize = profile?.wheelSizes.at(-1);
  return alternateSize ? `${alternateSize} inch` : "";
}

function buildWheelSizeRangeSearchText(profile?: VehicleFitmentProfile | null) {
  if (!profile?.wheelSizes.length) return "";

  const uniqueSizes = Array.from(new Set(profile.wheelSizes));
  if (uniqueSizes.length === 1) {
    return `${uniqueSizes[0]} inch`;
  }

  const first = uniqueSizes[0];
  const last = uniqueSizes.at(-1);
  return first && last ? `${first} to ${last} inch` : uniqueSizes.join(" ");
}

function getWheelBroadStyleSearchText(optionId: string) {
  switch (optionId) {
    case "chrome_deep_dish":
      return "chrome 5 spoke deep dish rims";
    case "oem_rotor":
      return "silver rotor";
    case "gloss_black":
      return "gloss black";
    case "gloss_black_rotor":
      return "gloss black rotor";
    case "brushed_silver":
      return "brushed silver";
    case "bronze_concave":
      return "bronze concave";
    default:
      return "aftermarket";
  }
}

function getBuyerIntentTerms(modType: PartFinderModType) {
  switch (modType) {
    case "wheels":
      return "wheels rim set buy fitment";
    case "suspension":
      return "coilovers springs suspension buy";
    case "tint":
      return "window tint ceramic film buy";
    case "spacers":
      return "wheel spacers hubcentric buy";
    case "front_lip":
      return "front lip splitter buy";
    case "spoiler":
      return "spoiler trunk lip buy";
    case "diffuser":
      return "rear diffuser buy";
    case "chrome_delete":
      return "chrome delete trim kit buy";
    default:
      return "buy";
  }
}

function getBroadPartTypeText(modType: PartFinderModType) {
  switch (modType) {
    case "wheels":
      return "wheels";
    case "suspension":
      return "suspension";
    case "tint":
      return "window tint";
    case "spacers":
      return "wheel spacers";
    case "front_lip":
      return "front lip";
    case "spoiler":
      return "spoiler";
    case "diffuser":
      return "rear diffuser";
    case "chrome_delete":
      return "chrome delete";
    default:
      return "aftermarket parts";
  }
}

function getPartStyleSearchText(
  modType: PartFinderModType,
  optionId: string,
): string {
  if (modType === "wheels") {
    switch (optionId) {
      case "chrome_deep_dish":
        return "chrome silver deep dish 5 spoke";
      case "oem_rotor":
        return "OEM rotor style silver";
      case "gloss_black":
        return "gloss black multi spoke";
      case "gloss_black_rotor":
        return "gloss black rotor style";
      case "brushed_silver":
        return "brushed silver motorsport";
      case "bronze_concave":
        return "bronze concave multi spoke";
      default:
        return "aftermarket wheel";
    }
  }

  if (modType === "suspension") {
    switch (optionId) {
      case "bagged_airedout":
        return "air suspension bagged aired out";
      case "lowering_springs":
        return "lowering springs";
      case "slammed":
        return "coilovers";
      default:
        return "suspension";
    }
  }

  if (modType === "front_lip") {
    switch (optionId) {
      case "oem_plus":
        return "OEM plus front lip";
      case "maxton_style":
        return "maxton style splitter";
      case "carbon_splitter":
        return "carbon front splitter";
      case "track_splitter_rods":
        return "track splitter rods";
      default:
        return "front lip";
    }
  }

  if (modType === "spoiler") {
    return optionId === "duckbill" ? "duckbill spoiler" : "lip spoiler";
  }

  if (modType === "diffuser") {
    return optionId === "sport_with_quads"
      ? "quad tip rear diffuser"
      : "OEM plus rear diffuser";
  }

  if (modType === "chrome_delete") {
    switch (optionId) {
      case "window_trim_only":
        return "window trim chrome delete kit";
      case "trim_and_grille":
        return "window trim grille chrome delete kit";
      case "full":
        return "full chrome delete kit";
      default:
        return "chrome delete kit";
    }
  }

  if (modType === "tint") {
    return optionId === "light" ? "light ceramic tint" : "dark ceramic tint";
  }

  if (modType === "spacers") {
    return "hubcentric wheel spacers";
  }

  return "aftermarket";
}

function uniqueQueries(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}
