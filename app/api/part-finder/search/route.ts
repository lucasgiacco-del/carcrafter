import { type NextRequest, NextResponse } from "next/server";
import { resolveFascia } from "../../../server/car-data";
import { resolveVehicleFitmentProfile } from "../../../server/vehicle-fitment";
import {
  buildPartSearchQueries,
  buildPartSearchQuery,
  buildWheelFitmentSearchText,
  normalizeGenerationSearchText,
  type PartFinderModType,
  type PartFinderSearchItem,
  type PartFinderSearchResponse,
  type VehicleFitmentProfile,
} from "../../../shared/part-finder";

export const runtime = "nodejs";

type OpenAIResponsesApiResponse = {
  status?: string;
  incomplete_details?: {
    reason?: string;
  } | null;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    input_tokens_details?: {
      cached_tokens?: number;
    };
  };
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

type SearchResultPayload = {
  items?: Array<{
    title?: string;
    subtitle?: string;
    price?: string;
    imageUrl?: string | null;
    linkUrl?: string;
    source?: string;
    domain?: string;
  }>;
};

const SEARCH_RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          subtitle: { type: "string" },
          price: { type: "string" },
          imageUrl: {
            anyOf: [{ type: "string" }, { type: "null" }],
          },
          linkUrl: { type: "string" },
          source: { type: "string" },
          domain: { type: "string" },
        },
        required: [
          "title",
          "subtitle",
          "price",
          "imageUrl",
          "linkUrl",
          "source",
          "domain",
        ],
      },
    },
  },
  required: ["items"],
} as const;

const TRUSTED_VENDOR_DOMAINS = [
  "tirerack.com",
  "fitmentindustries.com",
  "discounttire.com",
  "customwheeloffset.com",
  "apexwheels.com",
  "aodhanwheels.com",
  "bbs-usa.com",
  "ecstuning.com",
  "turnermotorsport.com",
  "urotuning.com",
  "carid.com",
  "summitracing.com",
  "ebay.com",
] as const;

const LOW_SIGNAL_DOMAINS = [
  "youtube.com",
  "youtu.be",
  "reddit.com",
  "instagram.com",
  "facebook.com",
  "tiktok.com",
  "pinterest.com",
] as const;

const OPENAI_MAX_OUTPUT_TOKENS = 2200;
const OUTPUT_FORMAT_HINT =
  "Return up to 4 items. Keep subtitles short and practical.";
const IMAGE_FETCH_TIMEOUT_MS = 4000;
const GPT_55_INPUT_USD_PER_TOKEN = 5 / 1_000_000;
const GPT_55_CACHED_INPUT_USD_PER_TOKEN = 0.5 / 1_000_000;
const GPT_55_OUTPUT_USD_PER_TOKEN = 30 / 1_000_000;
const WEB_SEARCH_USD_PER_CALL = 10 / 1000;

type SearchCostBreakdown = {
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

type SearchWithOpenAIResult = {
  items: PartFinderSearchItem[];
  relaxedFallbackUsed: boolean;
  cost: SearchCostBreakdown;
};

export async function GET(req: NextRequest) {
  const year = req.nextUrl.searchParams.get("year") || "";
  const make = req.nextUrl.searchParams.get("make") || "";
  const model = req.nextUrl.searchParams.get("model") || "";
  const generation = req.nextUrl.searchParams.get("generation") || "";
  const modType = req.nextUrl.searchParams.get(
    "modType",
  ) as PartFinderModType | null;
  const optionId = req.nextUrl.searchParams.get("optionId") || "";

  if (!year || !make || !model || !modType || !optionId) {
    return NextResponse.json(
      { error: "Missing year, make, model, mod type, or option." },
      { status: 400 },
    );
  }

  const fitmentProfile = resolveVehicleFitmentProfile({
    year,
    make,
    model,
    generation,
  });
  const query = buildPartSearchQuery({
    year,
    make,
    model,
    generation,
    modType,
    optionId,
    fitmentProfile,
  });
  const searchQueries = buildPartSearchQueries({
    year,
    make,
    model,
    generation,
    modType,
    optionId,
    fitmentProfile,
  });
  const strictPrompt = buildOpenAISearchPrompt({
    year,
    make,
    model,
    generation,
    modType,
    optionId,
    fitmentProfile,
    displayQuery: query,
    searchQueries,
    relaxed: false,
  });
  const relaxedPrompt = buildOpenAISearchPrompt({
    year,
    make,
    model,
    generation,
    modType,
    optionId,
    fitmentProfile,
    displayQuery: query,
    searchQueries,
    relaxed: true,
  });

  if (!process.env.OPENAI_API_KEY) {
    const response: PartFinderSearchResponse = {
      status: "provider_not_configured",
      query,
      items: [],
      source: "openai",
      debug: {
        model: "gpt-5.5",
        searchQueries,
        prompt: strictPrompt,
        relaxedPrompt,
        relaxedFallbackUsed: false,
        cost: {
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
      },
    };

    return NextResponse.json(response);
  }

  try {
    const searchResult = await searchWithOpenAI({
      year,
      make,
      model,
      generation,
      modType,
      optionId,
      fitmentProfile,
      displayQuery: query,
      searchQueries,
    });

    const response: PartFinderSearchResponse = {
      status: searchResult.items.length ? "ok" : "no_results",
      query,
      items: searchResult.items,
      source: "openai",
      debug: {
        model: "gpt-5.5",
        searchQueries,
        prompt: strictPrompt,
        relaxedPrompt,
        relaxedFallbackUsed: searchResult.relaxedFallbackUsed,
        cost: searchResult.cost,
      },
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "OpenAI part search failed.";

    const response: PartFinderSearchResponse = {
      status: "error",
      query,
      items: [],
      source: "openai",
      debug: {
        model: "gpt-5.5",
        searchQueries,
        prompt: strictPrompt,
        relaxedPrompt,
        relaxedFallbackUsed: false,
        cost: {
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
      },
      error: message,
    };

    return NextResponse.json(response, { status: 500 });
  }
}

async function searchWithOpenAI({
  year,
  make,
  model,
  generation,
  modType,
  optionId,
  fitmentProfile,
  displayQuery,
  searchQueries,
  relaxed = false,
}: {
  year: string;
  make: string;
  model: string;
  generation: string;
  modType: PartFinderModType;
  optionId: string;
  fitmentProfile: VehicleFitmentProfile | null;
  displayQuery: string;
  searchQueries: string[];
  relaxed?: boolean;
}): Promise<SearchWithOpenAIResult> {
  const prompt = buildOpenAISearchPrompt({
    year,
    make,
    model,
    generation,
    modType,
    optionId,
    fitmentProfile,
    displayQuery,
    searchQueries,
    relaxed,
  });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    cache: "no-store",
    body: JSON.stringify({
      model: "gpt-5.5",
      reasoning: {
        effort: "low",
      },
      tools: [{ type: "web_search" }],
      tool_choice: "required",
      max_output_tokens: OPENAI_MAX_OUTPUT_TOKENS,
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "part_finder_results",
          strict: true,
          schema: SEARCH_RESULT_SCHEMA,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenAI Responses request failed (${response.status}): ${truncateText(errorText, 280)}`,
    );
  }

  const data = (await response.json()) as OpenAIResponsesApiResponse;
  const payloadText = getResponseOutputText(data);
  const payload = parseSearchPayload(payloadText);
  const items = await sanitizeSearchItems(payload.items || [], modType);
  const cost = estimateSearchCost(data);

  if (
    data.incomplete_details?.reason === "max_output_tokens" &&
    !items.length
  ) {
    throw new Error(
      "OpenAI search response was truncated before results could be parsed.",
    );
  }

  if (items.length || relaxed) {
    return {
      items,
      relaxedFallbackUsed: relaxed,
      cost,
    };
  }

  const fallback = await searchWithOpenAI({
    year,
    make,
    model,
    generation,
    modType,
    optionId,
    fitmentProfile,
    displayQuery,
    searchQueries,
    relaxed: true,
  });

  return {
    ...fallback,
    cost: mergeSearchCosts(cost, fallback.cost),
  };
}

function buildOpenAISearchPrompt({
  year,
  make,
  model,
  generation,
  modType,
  optionId,
  fitmentProfile,
  displayQuery,
  searchQueries,
  relaxed = false,
}: {
  year: string;
  make: string;
  model: string;
  generation: string;
  modType: PartFinderModType;
  optionId: string;
  fitmentProfile: VehicleFitmentProfile | null;
  displayQuery: string;
  searchQueries: string[];
  relaxed?: boolean;
}) {
  const isWheelSearch = modType === "wheels";
  const isFrontLipSearch = modType === "front_lip";
  const fasciaRule = isWheelSearch
    ? null
    : resolveFascia({ make, model, year });
  const generationLabel = normalizeGenerationSearchText(
    generation || fasciaRule?.name || "",
    make,
    model,
  );
  const vehicleLabel = generationLabel
    ? [make, model, generationLabel].filter(Boolean).join(" ")
    : [year, make, model].filter(Boolean).join(" ");

  if (isFrontLipSearch) {
    return buildFrontLipPrompt({
      vehicleLabel,
      generationLabel: generationLabel || `${year} ${make} ${model}`,
      lipDescription: describeFrontLipOption(optionId),
      relaxed,
    });
  }

  if (isWheelSearch) {
    return buildWheelPrompt({
      wheelDescription: describeWheelOption(optionId),
      sizeRangeText: buildWheelSizeRangeText(fitmentProfile),
      fitmentText: buildWheelFitmentSearchText(fitmentProfile),
      searchPhrase: searchQueries[0] || displayQuery,
      relaxed,
    });
  }

  return buildGenericModPrompt({
    vehicleLabel,
    generationLabel,
    modDescription: describeModOption(modType, optionId),
    searchPhrase: searchQueries[0] || displayQuery,
    relaxed,
  });
}

function buildFrontLipPrompt({
  vehicleLabel,
  generationLabel,
  lipDescription,
  relaxed,
}: {
  vehicleLabel: string;
  generationLabel: string;
  lipDescription: string;
  relaxed: boolean;
}) {
  return `
Find shoppable ${lipDescription} pages for ${vehicleLabel}.
Generation reference: ${generationLabel}.
Avoid guides, forums, and the wrong body style or generation.
${relaxed ? "Strong vendor collection or category pages are fine if exact products are thin." : "Prefer strong product or shoppable collection pages."}
${OUTPUT_FORMAT_HINT}
  `.trim();
}

function buildWheelPrompt({
  wheelDescription,
  sizeRangeText,
  fitmentText,
  searchPhrase,
  relaxed,
}: {
  wheelDescription: string;
  sizeRangeText: string;
  fitmentText: string;
  searchPhrase: string;
  relaxed: boolean;
}) {
  return `
Find shoppable ${wheelDescription} using "${searchPhrase}".
${fitmentText ? `Keep this fitment context attached: ${fitmentText}.` : ""}
${sizeRangeText ? `Potential wheel sizes for this car: ${sizeRangeText}.` : ""}
Style match matters most, but keep the wheel fitment context realistic for the selected car.
Product pages, collections, and category pages are all fine.
${relaxed ? "If exact products are sparse, return the strongest shoppable style matches anyway." : "Skip guides, forums, and social posts."}
${OUTPUT_FORMAT_HINT}
  `.trim();
}

function buildGenericModPrompt({
  vehicleLabel,
  generationLabel,
  modDescription,
  searchPhrase,
  relaxed,
}: {
  vehicleLabel: string;
  generationLabel: string;
  modDescription: string;
  searchPhrase: string;
  relaxed: boolean;
}) {
  return `
Find shoppable ${modDescription} pages for ${vehicleLabel} using "${searchPhrase}".
${generationLabel ? `Generation reference: ${generationLabel}.` : "Keep the exact car name as the main anchor."}
Product pages, collections, and category pages are all fine.
${relaxed ? "If exact products are sparse, return the strongest shoppable matches for that car anyway." : "Skip guides, forums, and social posts."}
${OUTPUT_FORMAT_HINT}
  `.trim();
}

function describeFrontLipOption(optionId: string) {
  switch (optionId) {
    case "oem_plus":
      return "OEM+ front lip";
    case "maxton_style":
      return "Maxton-style front lip / splitter";
    case "carbon_splitter":
      return "carbon front splitter";
    case "track_splitter_rods":
      return "track-style front splitter with rods";
    default:
      return "front lip";
  }
}

function describeWheelOption(optionId: string) {
  switch (optionId) {
    case "chrome_deep_dish":
      return "chrome 5 spoke deep dish rims";
    case "oem_rotor":
      return "OEM-style silver rotor";
    case "gloss_black":
      return "gloss black";
    case "gloss_black_rotor":
      return "gloss black rotor";
    case "brushed_silver":
      return "brushed silver motorsport";
    case "bronze_concave":
      return "bronze concave";
    default:
      return "aftermarket";
  }
}

function describeModOption(modType: PartFinderModType, optionId: string) {
  switch (modType) {
    case "tint":
      return optionId === "light" ? "light ceramic tint" : "ceramic tint";
    case "spacers":
      return "hubcentric wheel spacers";
    case "suspension":
      if (optionId === "bagged_airedout") return "air suspension";
      if (optionId === "lowering_springs") return "lowering springs";
      if (optionId === "slammed") return "coilovers";
      return "suspension";
    case "spoiler":
      return optionId === "duckbill" ? "duckbill spoiler" : "lip spoiler";
    case "diffuser":
      return optionId === "sport_with_quads"
        ? "quad tip rear diffuser"
        : "rear diffuser";
    case "chrome_delete":
      return "chrome delete kit";
    case "front_lip":
      return describeFrontLipOption(optionId);
    case "wheels":
      return describeWheelOption(optionId);
    default:
      return "aftermarket part";
  }
}

function buildWheelSizeRangeText(profile: VehicleFitmentProfile | null) {
  if (!profile?.wheelSizes.length) return "";

  const uniqueSizes = Array.from(new Set(profile.wheelSizes));
  if (uniqueSizes.length === 1) {
    return `${uniqueSizes[0]} inch`;
  }

  const first = uniqueSizes[0];
  const last = uniqueSizes.at(-1);
  return first && last ? `${first} to ${last} inch` : uniqueSizes.join(" ");
}

function parseSearchPayload(outputText: string): SearchResultPayload {
  const normalized = outputText.trim();
  if (!normalized) {
    return { items: [] };
  }

  const withoutCodeFence = normalized
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const start = withoutCodeFence.indexOf("{");
  const end = withoutCodeFence.lastIndexOf("}");
  const jsonText =
    start >= 0 && end > start
      ? withoutCodeFence.slice(start, end + 1)
      : withoutCodeFence;

  try {
    return JSON.parse(jsonText) as SearchResultPayload;
  } catch {
    return { items: [] };
  }
}

function getResponseOutputText(data: OpenAIResponsesApiResponse) {
  if (data.output_text?.trim()) {
    return data.output_text;
  }

  return (
    data.output
      ?.filter((item) => item.type === "message")
      .flatMap((item) => item.content || [])
      .filter((content) => content.type === "output_text")
      .map((content) => content.text || "")
      .join("\n") || ""
  );
}

function estimateSearchCost(data: OpenAIResponsesApiResponse) {
  const inputTokens = data.usage?.input_tokens || 0;
  const cachedInputTokens = data.usage?.input_tokens_details?.cached_tokens || 0;
  const uncachedInputTokens = Math.max(0, inputTokens - cachedInputTokens);
  const outputTokens = data.usage?.output_tokens || 0;
  const webSearchCalls = countWebSearchCalls(data);

  const inputUsd = uncachedInputTokens * GPT_55_INPUT_USD_PER_TOKEN;
  const cachedInputUsd =
    cachedInputTokens * GPT_55_CACHED_INPUT_USD_PER_TOKEN;
  const outputUsd = outputTokens * GPT_55_OUTPUT_USD_PER_TOKEN;
  const webSearchUsd = webSearchCalls * WEB_SEARCH_USD_PER_CALL;
  const totalUsd = inputUsd + cachedInputUsd + outputUsd + webSearchUsd;

  return {
    totalUsd,
    inputUsd,
    cachedInputUsd,
    outputUsd,
    webSearchUsd,
    inputTokens,
    cachedInputTokens,
    outputTokens,
    webSearchCalls,
  };
}

function countWebSearchCalls(data: OpenAIResponsesApiResponse) {
  return (
    data.output?.filter((item) => item.type === "web_search_call").length || 0
  );
}

function mergeSearchCosts(
  first: SearchCostBreakdown,
  second: SearchCostBreakdown,
) {
  return {
    totalUsd: first.totalUsd + second.totalUsd,
    inputUsd: first.inputUsd + second.inputUsd,
    cachedInputUsd: first.cachedInputUsd + second.cachedInputUsd,
    outputUsd: first.outputUsd + second.outputUsd,
    webSearchUsd: first.webSearchUsd + second.webSearchUsd,
    inputTokens: first.inputTokens + second.inputTokens,
    cachedInputTokens: first.cachedInputTokens + second.cachedInputTokens,
    outputTokens: first.outputTokens + second.outputTokens,
    webSearchCalls: first.webSearchCalls + second.webSearchCalls,
  };
}

async function sanitizeSearchItems(
  rawItems: NonNullable<SearchResultPayload["items"]>,
  modType: PartFinderModType,
): Promise<PartFinderSearchItem[]> {
  const seenUrls = new Set<string>();

  const items = rawItems
    .map((item, index) => sanitizeSearchItem(item, index))
    .filter((item): item is PartFinderSearchItem => Boolean(item))
    .filter((item) => {
      if (seenUrls.has(item.linkUrl)) return false;
      seenUrls.add(item.linkUrl);
      return true;
    })
    .filter((item) => !isLowSignalDomain(item.domain))
    .sort((a, b) => scoreItem(b, modType) - scoreItem(a, modType))
    .slice(0, 6);

  return hydrateMissingImages(items);
}

function sanitizeSearchItem(
  item: NonNullable<SearchResultPayload["items"]>[number],
  index: number,
): PartFinderSearchItem | null {
  const title = item.title?.trim() || "";
  const linkUrl = item.linkUrl?.trim() || "";

  if (!title || !isHttpUrl(linkUrl)) {
    return null;
  }

  const domain = normalizeDomain(item.domain || getDomain(linkUrl));
  if (!domain) {
    return null;
  }

  return {
    id: `${domain}-${index}`,
    title,
    subtitle: truncateText(
      item.subtitle?.trim() || formatDomainLabel(domain),
      140,
    ),
    price: normalizePrice(item.price),
    imageUrl: isHttpUrl(item.imageUrl) ? item.imageUrl : null,
    linkUrl,
    source: truncateText(item.source?.trim() || formatDomainLabel(domain), 40),
    domain,
  };
}

function scoreItem(item: PartFinderSearchItem, modType: PartFinderModType) {
  let score = 0;

  if (isTrustedVendor(item.domain)) score += 20;
  if (item.price !== "See site") score += 8;
  if (item.imageUrl) score += 4;

  const urlText =
    `${item.linkUrl} ${item.title} ${item.subtitle}`.toLowerCase();
  if (
    /product|products|item|listing|wheel_details|buy-wheel-offset|itm\//i.test(
      urlText,
    )
  ) {
    score += 8;
  }
  if (
    /blog|guide|forum|reddit|youtube|instagram|facebook|tiktok/i.test(urlText)
  ) {
    score -= 20;
  }

  if (modType === "wheels" && isTrustedVendor(item.domain)) {
    score += 10;
  }

  return score;
}

function normalizePrice(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return "See site";
  return truncateText(trimmed, 32);
}

function isTrustedVendor(domain: string) {
  return TRUSTED_VENDOR_DOMAINS.some((trusted) => domain.endsWith(trusted));
}

function isLowSignalDomain(domain: string) {
  return LOW_SIGNAL_DOMAINS.some((value) => domain.endsWith(value));
}

function normalizeDomain(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

async function hydrateMissingImages(items: PartFinderSearchItem[]) {
  return Promise.all(
    items.map(async (item) => {
      if (item.imageUrl) return item;

      const imageUrl = await extractImageUrlFromPage(item.linkUrl);
      if (!imageUrl) return item;

      return {
        ...item,
        imageUrl,
      };
    }),
  );
}

async function extractImageUrlFromPage(pageUrl: string) {
  try {
    const response = await fetch(pageUrl, {
      cache: "no-store",
      headers: {
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) return null;

    const html = await response.text();
    const candidates = [
      getMetaContent(html, "property", "og:image"),
      getMetaContent(html, "name", "twitter:image"),
      getMetaContent(html, "property", "twitter:image"),
      getMetaContent(html, "name", "og:image"),
      getProductImageCandidate(html),
    ];

    for (const candidate of candidates) {
      const normalized = normalizeImageCandidate(candidate, pageUrl);
      if (normalized) return normalized;
    }

    return null;
  } catch {
    return null;
  }
}

function getMetaContent(html: string, attribute: string, value: string) {
  const escaped = escapeRegExp(value);
  const patterns = [
    new RegExp(
      `<meta[^>]+${attribute}=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+${attribute}=["']${escaped}["'][^>]*>`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const content = match?.[1]?.trim();
    if (content) return decodeHtmlEntities(content);
  }

  return null;
}

function getProductImageCandidate(html: string) {
  const imagePatterns = [
    /<img[^>]+(?:class|id)=["'][^"']*(?:product|primary|gallery|hero|main)[^"']*["'][^>]+src=["']([^"']+)["'][^>]*>/i,
    /<img[^>]+src=["']([^"']+)["'][^>]+(?:class|id)=["'][^"']*(?:product|primary|gallery|hero|main)[^"']*["'][^>]*>/i,
    /<img[^>]+src=["']([^"']+)["'][^>]*>/i,
  ];

  for (const pattern of imagePatterns) {
    const match = html.match(pattern);
    const src = match?.[1]?.trim();
    if (src) return decodeHtmlEntities(src);
  }

  return null;
}

function normalizeImageCandidate(
  value: string | null,
  pageUrl: string,
): string | null {
  if (!value) return null;

  const cleaned = value.trim();
  if (!cleaned) return null;
  if (cleaned.startsWith("data:")) return null;
  if (cleaned.includes(".svg")) return null;

  try {
    const url = new URL(cleaned, pageUrl);
    const normalized = url.toString();
    return isHttpUrl(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isHttpUrl(value: string | null | undefined): value is string {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getDomain(value: string) {
  try {
    return normalizeDomain(new URL(value).hostname);
  } catch {
    return "";
  }
}

function formatDomainLabel(domain: string) {
  const host = normalizeDomain(domain);
  const [first = host] = host.split(".");
  return first
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}
