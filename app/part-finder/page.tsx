"use client";

export default function PartFinderPage() {
  const car = "2022 Audi A4 (B9.5)";

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
                <span className="font-medium text-white">
                  {car}
                </span>
              </p>
              <p className="text-xs md:text-sm text-gray-400 max-w-xl">
                Car Crafter Premium turns your render into a real shopping list:
                compatible parts, estimated costs, and vendors that fit your car.
              </p>
            </div>

            <div className="flex flex-col items-stretch gap-2 min-w-[220px]">
              <button
                className="w-full rounded-full bg-white text-black text-sm font-semibold py-2.5 px-5 hover:bg-gray-100 transition"
              >
                Unlock Part Finder (Premium)
              </button>
              <p className="text-[11px] text-gray-400 text-center">
                See real parts, rough total cost, and where to buy — all in one place.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px] text-purple-100/80">
            <span className="px-3 py-1 rounded-full border border-purple-400/40 bg-purple-900/40">
              🔒 Exact parts for your car
            </span>
            <span className="px-3 py-1 rounded-full border border-purple-400/40 bg-purple-900/40">
              🔒 Estimated total for your build
            </span>
            <span className="px-3 py-1 rounded-full border border-purple-400/40 bg-purple-900/40">
              🔒 Online + local vendor suggestions
            </span>
          </div>
        </section>

        {/* Locked preview sections */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-200">
            What Part Finder shows (Premium)
          </h2>

          {/* Locked row 1 */}
          <div className="grid gap-3 md:grid-cols-2">
            <LockedCard
              title="Parts & pricing breakdown"
              body="See a clean list of suggested parts for your exact car and build — wheels, suspension, exhaust, tint, aero, and more — with rough pricing so you know what you're getting into."
            />

            <LockedCard
              title="Best brands & vendors"
              body="Get recommended brands and vendors people actually use for builds like yours. Online stores, big brands, and trusted options — all in one view."
            />
          </div>

          {/* Locked row 2 */}
          <div className="grid gap-3 md:grid-cols-2">
            <LockedCard
              title="Build-level cost estimate"
              body="Instead of guessing, see an estimated total for the whole build — parts only — so you can plan what to do now vs later."
            />
            <LockedCard
              title="Install difficulty & next steps"
              body="See which mods are simple DIY and which are better left for a shop, plus notes on what to search for or ask your installer."
            />
          </div>
        </section>

        {/* Big Premium banner */}
        <section className="mt-4 rounded-2xl border border-dashed border-amber-300 bg-amber-50/10 p-4 text-xs text-amber-100">
          <p className="font-semibold text-sm mb-1">
            Part Finder is a Premium feature.
          </p>
          <p className="text-[11px] text-amber-100/90">
            Free users can preview builds with AI. Premium members unlock real-world
            parts and pricing so you can stop guessing and start ordering with confidence.
          </p>
        </section>
      </div>
    </main>
  )
}

/* ----- Small locked card component ----- */

type LockedCardProps = {
  title: string
  body: string
}

function LockedCard({ title, body }: LockedCardProps) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-gray-800 bg-[#101010] p-4 shadow-sm">
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-black/0 via-black/0 to-black/35" />
      <div className="flex items-center gap-2 text-[11px] font-semibold text-amber-300 mb-1">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/10 border border-amber-400/50">
          🔒
        </span>
        <span>Premium preview</span>
      </div>
      <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
      <p className="text-[11px] text-gray-300 leading-relaxed">
        {body}
      </p>
    </article>
  )
}