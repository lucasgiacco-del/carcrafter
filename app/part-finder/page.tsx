"use client";

import { useSearchParams } from "next/navigation";

export default function PartFinderPage() {
  const searchParams = useSearchParams();

  const make = searchParams.get("make") || "";
  const model = searchParams.get("model") || "";
  const year = searchParams.get("year") || "";

  const wheels = searchParams.get("wheels"); // "chrome", "black_gloss", etc.
  const tint = searchParams.get("tint");     // "5", "20", etc.
  const spacers = searchParams.get("spacers");
  const suspension = searchParams.get("suspension");
  const spoiler = searchParams.get("spoiler");
  const chromeDelete = searchParams.get("chrome_delete");

  // super rough per-mod price map (same vibe as MakeItRealCard)
const ESTIMATED_PRICES: Record<string, number> = {
  wheels: 1200,
  suspension: 900,
  tint: 300,
  spacers: 250,
  spoiler: 400,
  chrome_delete: 350,
};

const activePriceKeys: string[] = [];
if (wheels) activePriceKeys.push("wheels");
if (suspension) activePriceKeys.push("suspension");
if (tint) activePriceKeys.push("tint");
if (spacers) activePriceKeys.push("spacers");
if (spoiler) activePriceKeys.push("spoiler");
if (chromeDelete) activePriceKeys.push("chrome_delete");

const estimatedTotal = activePriceKeys.reduce(
  (sum, key) => sum + (ESTIMATED_PRICES[key] || 0),
  0
);

  const hasAnyMods =
    wheels || tint || spacers || suspension || spoiler || chromeDelete;

  const car =
    [year, make, model].filter(Boolean).join(" ") || "your build";

  function describeTint(t: string | null) {
    if (!t) return null;
    if (t === "5") return "5% (limo) window tint";
    if (t === "20") return "20% (dark) window tint";
    if (t === "35") return "35% (medium) window tint";
    if (t === "50") return "50% (light) window tint";
    if (t === "75") return "75% (very light) window tint";
    return "window tint";
  }

  function describeWheels(w: string | null) {
    if (!w) return null;
    if (w === "chrome") return "chrome wheels";
    if (w === "black_gloss") return "gloss black wheels";
    if (w === "black_matte") return "matte black wheels";
    if (w === "silver") return "silver / OEM-style wheels";
    return "aftermarket wheels";
  }

  function describeSpacers(s: string | null) {
    if (!s) return null;
    if (s === "mild") return "mild wheel spacers";
    if (s === "flush") return "flush-fit wheel spacers";
    if (s === "aggressive") return "aggressive wheel spacers";
    return "wheel spacers";
  }

  function describeSuspension(s: string | null) {
    if (!s) return null;
    if (s === "springs") return "lowering springs";
    if (s === "coilovers") return "coilovers";
    if (s === "slammed") return "slammed / show-car stance";
    if (s === "stock") return "stock ride height";
    return "suspension setup";
  }

  const buildTags: string[] = [];

  const tintDesc = describeTint(tint);
  const wheelDesc = describeWheels(wheels);
  const spacerDesc = describeSpacers(spacers);
  const suspDesc = describeSuspension(suspension);

  if (tintDesc) buildTags.push(tintDesc);
  if (wheelDesc) buildTags.push(wheelDesc);
  if (spacerDesc) buildTags.push(spacerDesc);
  if (suspDesc) buildTags.push(suspDesc);
  if (spoiler) buildTags.push(spoiler === "ducktail" ? "ducktail spoiler" : "lip spoiler");
  if (chromeDelete) buildTags.push("blackout window trim");

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-4xl space-y-6">
        {/* Breadcrumb / label */}
        <p className="text-[11px] uppercase tracking-[0.15em] text-gray-500">
          Part Finder
        </p>

        {/* Hero: Make this build real */}
        <section className="rounded-3xl border border-purple-500/60 bg-gradient-to-br from-purple-900/40 via-[#111111] to-black p-5 md:p-7 shadow-[0_0_35px_rgba(168,85,247,0.45)] space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1.5">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                Make this build real
              </h1>
              <p className="text-xs md:text-sm text-gray-300">
                Build:&nbsp;
                <span className="font-medium text-white">{car}</span>
              </p>

              {hasAnyMods ? (
                <p className="text-[11px] md:text-xs text-purple-100/90">
                  Based on your render:&nbsp;
                  {buildTags.map((t, i) => (
                    <span key={t}>
                      {i > 0 && " · "}
                      {t}
                    </span>
                  ))}
                </p>
              ) : (
                <p className="text-[11px] md:text-xs text-gray-400">
                  When you render a build with wheels, tint, suspension, and more,
                  Part Finder will match real parts to those exact choices.
                </p>
              )}

              <p className="text-xs md:text-sm text-gray-400 max-w-xl mt-1.5">
                Car Crafter Premium turns your render into a real shopping list:
                compatible parts, estimated costs, and vendors that fit your car.
              </p>
            </div>

      {/* Estimated build total */}
      {estimatedTotal > 0 && (
        <p className="text-[11px] md:text-xs text-amber-100/90 mt-1.5">
          Rough parts budget for this build:{" "}
          <span className="font-semibold">
            ~${estimatedTotal.toLocaleString()}
          </span>{" "}
          (parts only, no labor).
        </p>
      )}
      
            <div className="flex flex-col items-stretch gap-2 min-w-[220px]">
              <button className="w-full rounded-full bg-white text-black text-sm font-semibold py-2.5 px-5 hover:bg-gray-100 transition">
                Unlock Part Finder (Premium)
              </button>
              <p className="text-[11px] text-gray-400 text-center">
                See real parts, rough total cost, and where to buy — all in one place.
              </p>
            </div>
          </div>

          {hasAnyMods && (
            <div className="flex flex-wrap gap-2 text-[11px] text-purple-100/80 mt-1">
              {buildTags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full border border-purple-400/40 bg-purple-900/40"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {!hasAnyMods && (
            <div className="flex flex-wrap gap-2 text-[11px] text-purple-100/80">
              <span className="px-3 py-1 rounded-full border border-purple-400/40 bg-purple-900/40">
                🔒 Exact parts for your build
              </span>
              <span className="px-3 py-1 rounded-full border border-purple-400/40 bg-purple-900/40">
                🔒 Estimated total for your build
              </span>
              <span className="px-3 py-1 rounded-full border border-purple-400/40 bg-purple-900/40">
                🔒 Online + local vendor suggestions
              </span>
            </div>
          )}
        </section>

        {/* Contextual sections based on selected mods */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-200">
            Based on this render, Part Finder would show…
          </h2>

          <div className="space-y-3">
            {/* Wheels section */}
            {wheels && (
              <ContextGroup
                title={
                  wheelDesc
                    ? `Wheel options matching your ${wheelDesc}`
                    : "Wheel options for this build"
                }
                subtitle="Sizes and offsets chosen to work with your stance and spacers."
                items={[
                  {
                    name: "Rotiform LAS-R (19x8.5)",
                    detail: "Chrome / high-polish finish, 5x112, ET35",
                    estPrice: "$1,400–$1,700 set",
                  },
                  {
                    name: "TSW Bathurst (19x8.5)",
                    detail: "Mirror-cut face, 5x112, ET35",
                    estPrice: "$1,200–$1,500 set",
                  },
                  {
                    name: "OEM-Plus Chrome Replica",
                    detail: "Stock-inspired design, 19x8.0, 5x112, ET40",
                    estPrice: "$950–$1,200 set",
                  },
                ]}
              />
            )}

            {/* Tint section */}
            {tint && (
              <ContextGroup
                title={
                  tintDesc
                    ? `Window tint kits similar to your ${tintDesc}`
                    : "Window tint options"
                }
                subtitle="Film quality and legal limits vary by state — this is just a rough guide."
                items={[
                  {
                    name: "3M Ceramic IR",
                    detail: "High-heat rejection ceramic film, lifetime warranty",
                    estPrice: "$400–$650 installed",
                  },
                  {
                    name: "XPEL XR Plus",
                    detail: "Premium ceramic, great heat rejection, color-stable",
                    estPrice: "$500–$800 installed",
                  },
                  {
                    name: "SunTek Carbon",
                    detail: "Budget-friendly carbon film, low reflectivity",
                    estPrice: "$250–$450 installed",
                  },
                ]}
              />
            )}

            {/* Spacers section */}
            {spacers && (
              <ContextGroup
                title={
                  spacerDesc
                    ? `Spacer kits to match your ${spacerDesc}`
                    : "Wheel spacer options"
                }
                subtitle="Hubcentric spacers matched to bolt pattern and hub bore."
                items={[
                  {
                    name: "ECS Tuning Flush Kit",
                    detail: "Front & rear spacers sized to sit flush with fenders",
                    estPrice: "$180–$260 kit",
                  },
                  {
                    name: "H&R Trak+ Spacers",
                    detail: "High-quality hubcentric spacers for VAG platforms",
                    estPrice: "$160–$230 pair",
                  },
                  {
                    name: "APR Wheel Spacer Set",
                    detail: "Track-tested spacer setup for street builds",
                    estPrice: "$190–$280 kit",
                  },
                ]}
              />
            )}

            {/* Suspension section */}
            {suspension && (
              <ContextGroup
                title={
                  suspDesc
                    ? `Suspension options for your ${suspDesc} stance`
                    : "Suspension options for this build"
                }
                subtitle="Matched to your wheel and spacer setup to avoid rubbing."
                items={[
                  {
                    name: "Bilstein B12 Pro Kit",
                    detail: "Matched shocks + springs, mild drop, daily drivable",
                    estPrice: "$900–$1,200",
                  },
                  {
                    name: "KW V2 Coilovers",
                    detail: "Height-adjustable, comfortable street ride",
                    estPrice: "$1,600–$2,000",
                  },
                  {
                    name: "BC Racing BR Series",
                    detail: "Budget-friendly coilovers with damping adjustment",
                    estPrice: "$1,100–$1,400",
                  },
                ]}
              />
            )}

            {/* Spoiler section */}
            {spoiler && (
              <ContextGroup
                title={
                  spoiler === "ducktail"
                    ? "Ducktail trunk spoilers sized for your car"
                    : "Lip spoilers that match your trunk shape"
                }
                subtitle="Paint-matched and carbon fiber options for your specific chassis."
                items={[
                  {
                    name: "Paint-Matched Lip Spoiler",
                    detail: "Subtle OEM+ look, tape-on install",
                    estPrice: "$180–$350",
                  },
                  {
                    name: "Carbon Fiber Ducktail",
                    detail: "Aggressive profile, gloss carbon finish",
                    estPrice: "$380–$650",
                  },
                  {
                    name: "High-Kick Trunk Spoiler",
                    detail: "More aggressive than OEM lip, still daily-friendly",
                    estPrice: "$240–$420",
                  },
                ]}
              />
            )}

            {/* Chrome delete section */}
            {chromeDelete && (
              <ContextGroup
                title="Chrome delete options for your window trim"
                subtitle="Vinyl wrap or replacement trim matched to your paint and tint."
                items={[
                  {
                    name: "Vinyl Chrome Delete Kit",
                    detail: "Pre-cut vinyl for window trim, gloss or satin black",
                    estPrice: "$150–$250 (DIY) / $350–$600 installed",
                  },
                  {
                    name: "Replacement Blackout Trim",
                    detail: "OEM or OEM-style black trim pieces",
                    estPrice: "$400–$800 parts",
                  },
                  {
                    name: "Pro Shop Chrome Delete",
                    detail: "Custom wrap by a local shop",
                    estPrice: "$400–$700 installed",
                  },
                ]}
              />
            )}

            {!hasAnyMods && (
              <p className="text-[11px] text-gray-500">
                Once you pick wheels, tint, suspension, spacers, and more in Car Crafter,
                this page will turn into a shopping roadmap matched to that build.
              </p>
            )}
          </div>
        </section>

        {/* Big Premium banner */}
        <section className="mt-4 rounded-2xl border border-dashed border-amber-300 bg-amber-50/10 p-4 text-xs text-amber-100">
          <p className="font-semibold text-sm mb-1">
            Part Finder is a Premium feature.
          </p>
          <p className="text-[11px] text-amber-100/90">
            Free users can preview builds with AI. Premium members unlock real-world
            parts and pricing matched to their render — so you can stop guessing and
            start ordering with confidence.
          </p>
        </section>
      </div>
    </main>
  );
}

/* ----- ContextGroup: a simple “section with 3 items” component ----- */

type ContextItem = {
  name: string;
  detail: string;
  estPrice: string;
};

type ContextGroupProps = {
  title: string;
  subtitle?: string;
  items: ContextItem[];
};

function ContextGroup({ title, subtitle, items }: ContextGroupProps) {
  return (
    <section className="rounded-2xl border border-gray-800 bg-[#101010] p-4 space-y-2">
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {subtitle && (
          <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="mt-2 space-y-2">
        {items.map((item) => (
          <article
            key={item.name}
            className="rounded-xl border border-gray-700 bg-[#151515] px-3 py-2.5 text-[11px] flex flex-col gap-0.5"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-gray-50">{item.name}</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-900 border border-gray-700 text-gray-200">
                {item.estPrice}
              </span>
            </div>
            <p className="text-[11px] text-gray-300">{item.detail}</p>
          </article>
        ))}
      </div>

      <p className="mt-1 text-[10px] text-gray-500">
        These are example ranges. Premium would show parts matched to your exact
        chassis, bolt pattern, and build.
      </p>
    </section>
  );
}