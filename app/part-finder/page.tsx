'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type LibraryItem = {
  id: string
  prompt: string
  originalImage: string | null
  resultImage: string
  createdAt: string
}

type ModPackId = 'oem_plus' | 'slammed' | 'track' | 'street_monster'

type ModPack = {
  id: ModPackId
  name: string
  label: string
  tagline: string
  description: string
  bestFor: string
  badge: string
}

const MOD_PACKS: ModPack[] = [
  {
    id: 'oem_plus',
    name: 'OEM+ Pack',
    label: 'Daily driver, just better.',
    tagline: 'Clean, factory-plus street setup.',
    description:
      'Mild drop, tasteful tint, subtle aero. Looks like it could have come from the factory that way.',
    bestFor: 'Daily / OEM+ enjoyers',
    badge: 'OEM+',
  },
  {
    id: 'slammed',
    name: 'Slammed Pack',
    label: 'Show car, sidewalk scraper.',
    tagline: 'Ultra low, 5% tint, aggressive stance.',
    description:
      'Slammed ride height, 5% tint, aggressive spacers and show-car presence while still looking believable.',
    bestFor: 'Meets / shows / night drives',
    badge: 'Slammed',
  },
  {
    id: 'track',
    name: 'Track Pack',
    label: 'Time-attack ready.',
    tagline: 'Functional low, aero, and grip.',
    description:
      'Coilovers, functional ride height, mild aero and flush stance built for spirited driving.',
    bestFor: 'Track / canyon / spirited',
    badge: 'Track',
  },
  {
    id: 'street_monster',
    name: 'Street Monster Pack',
    label: 'Zero subtlety.',
    tagline: 'Loud stance, aggressive aero, deep tint.',
    description:
      'Low, loud, and in-your-face. Aggressive height, deep tint, spacers and aero that owns the street.',
    bestFor: 'Street presence / content',
    badge: 'Monster',
  },
]

function formatShortDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export default function DashboardPage() {
  const router = useRouter()
  const [library, setLibrary] = useState<LibraryItem[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem('carcrafter_library')
      if (!raw) {
        setLoaded(true)
        return
      }
      const parsed = JSON.parse(raw) as LibraryItem[]
      setLibrary(parsed)
    } catch (err) {
      console.error('Failed to read library from localStorage', err)
    } finally {
      setLoaded(true)
    }
  }, [])

  const mostRecent = useMemo(() => library[0] ?? null, [library])
  const recentWithBefore = useMemo(
    () => library.filter((i) => i.originalImage && i.resultImage).slice(0, 3),
    [library],
  )

  const handlePackClick = (id: ModPackId) => {
    const params = new URLSearchParams()
    params.set('pack', id)
    router.push(`/build?${params.toString()}`)
  }

  return (
    <main className="min-h-screen bg-[#020308] text-white flex flex-col">
      {/* App header */}
      <header className="border-b border-white/5 bg-gradient-to-b from-[#141428] via-[#050509] to-transparent">
        <div className="max-w-md mx-auto px-4 pt-4 pb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-black border border-white/10 overflow-hidden flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.8)]">
              <img
                src="/carcrafter.png"
                alt="Car Crafter"
                className="h-9 w-9 object-contain"
              />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-medium tracking-[0.18em] uppercase text-gray-400">
                Car Crafter
              </span>
              <span className="text-[11px] text-gray-400">
                Visualize before you spend.
              </span>
            </div>
          </div>

          <span className="text-[10px] px-2 py-1 rounded-full border border-purple-400/60 bg-purple-500/10 text-purple-200 tracking-[0.18em] uppercase">
            Alpha
          </span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex justify-center">
        <div className="w-full max-w-md px-4 pb-5 pt-2 flex flex-col gap-6">
          {/* HERO – build studio + featured build */}
          <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#22123f] via-[#0a0716] to-[#050509] shadow-[0_26px_60px_rgba(0,0,0,0.9)] px-4 py-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.22em] text-purple-200/80">
                  Your build studio
                </p>
                <h1 className="text-lg font-semibold tracking-tight">
                  Build your dream car in minutes.
                </h1>
                <p className="text-[11px] text-gray-300 max-w-xs">
                  Upload your car or start from a stock render, stack mods, and see the
                  before / after instantly. Then price it out before you spend a dollar.
                </p>
              </div>
              {mostRecent && mostRecent.resultImage && (
                <div className="hidden sm:block h-16 w-24 rounded-2xl overflow-hidden border border-white/15 bg-black/40">
                  <img
                    src={mostRecent.resultImage}
                    alt="Latest build"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={() => router.push('/build')}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-600 text-sm font-semibold py-2.5 shadow-[0_14px_40px_rgba(123,97,255,0.45)] transition"
              >
                <span className="text-[13px] font-semibold">New build</span>
                <span className="text-[18px] leading-none">＋</span>
              </button>

              {mostRecent && (
                <button
                  type="button"
                  onClick={() => router.push('/library')}
                  className="flex-1 inline-flex items-center justify-center rounded-xl border border-white/12 bg-white/5 text-[11px] font-medium text-gray-100 hover:border-purple-400/80 hover:bg-purple-900/25 transition"
                >
                  Continue last build
                </button>
              )}
            </div>

            {/* Featured pricing example */}
            <div className="mt-3 rounded-2xl border border-white/10 bg-black/25 px-3 py-3 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">
                    Featured build example
                  </p>
                  <p className="text-[13px] font-semibold">
                    Slammed Audi A4 · carbon & tint
                  </p>
                </div>
                <span className="text-[10px] px-2 py-1 rounded-full bg-purple-500/15 border border-purple-400/60 text-purple-100 uppercase tracking-[0.16em]">
                  Example
                </span>
              </div>
              <p className="text-[11px] text-gray-300">
                Coilovers, 5% tint, aggressive spacers, carbon lip & diffuser. The kind
                of build you actually see in the wild.
              </p>
              <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-gray-300">
                <div className="flex justify-between">
                  <span>Wheels</span>
                  <span>~$1,200</span>
                </div>
                <div className="flex justify-between">
                  <span>Suspension</span>
                  <span>~$900</span>
                </div>
                <div className="flex justify-between">
                  <span>Aero / carbon</span>
                  <span>~$800</span>
                </div>
                <div className="flex justify-between">
                  <span>Tint & misc</span>
                  <span>~$400</span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-1 pt-1 border-t border-white/10 text-[10px]">
                <span className="text-gray-400">Total parts ballpark</span>
                <span className="font-semibold text-gray-50">≈ $3,300</span>
              </div>
            </div>
          </section>

          {/* MOD PACKS */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-300">
                  Mod packs
                </h2>
                <p className="text-[10px] text-gray-500">
                  One-tap starting points tailored to different scenes.
                </p>
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
              {/* First tile: plain new build */}
              <button
                type="button"
                onClick={() => router.push('/build')}
                className="min-w-[150px] h-32 rounded-2xl border border-dashed border-gray-700 bg-[#07070d] flex flex-col items-center justify-center gap-2 hover:border-purple-500 hover:bg-purple-950/40 transition"
              >
                <div className="relative w-9 h-9">
                  <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1.5px] rounded-full bg-gray-400" />
                  <span className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1.5px] rounded-full bg-gray-400" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold">Blank canvas</p>
                  <p className="text-[10px] text-gray-400">Start from scratch</p>
                </div>
              </button>

              {MOD_PACKS.map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => handlePackClick(pack.id)}
                  className="min-w-[190px] h-32 rounded-2xl border border-gray-800 bg-gradient-to-br from-[#1c1034] via-[#090812] to-[#050509] overflow-hidden relative group text-left flex flex-col justify-between p-3 hover:border-purple-500/80 hover:shadow-[0_18px_50px_rgba(123,97,255,0.45)] transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-semibold">{pack.name}</p>
                      <p className="text-[10px] text-gray-300 line-clamp-2">
                        {pack.tagline}
                      </p>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/70 text-purple-100 uppercase tracking-[0.16em]">
                      {pack.badge}
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] text-gray-400 line-clamp-2">
                    {pack.description}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[9px] text-gray-500">
                      Best for: {pack.bestFor}
                    </span>
                    <span className="text-[9px] text-purple-200 group-hover:text-purple-50">
                      Load pack →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* BEFORE / AFTER EXAMPLES */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-300">
                  Before & after examples
                </h2>
                <p className="text-[10px] text-gray-500">
                  Real builds from your library, shown like case studies.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push('/library')}
                className="text-[11px] text-purple-300 hover:text-purple-100"
              >
                View all →
              </button>
            </div>

            {recentWithBefore.length > 0 ? (
              <div className="space-y-3">
                {recentWithBefore.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => router.push('/library')}
                    className="w-full rounded-3xl border border-gray-850 bg-[#080812] overflow-hidden shadow-[0_18px_54px_rgba(0,0,0,0.9)] text-left hover:border-purple-500/80 hover:bg-purple-950/40 transition"
                  >
                    <div className="w-full flex">
                      <div className="w-1/2 relative h-28 sm:h-32 border-r border-black/40">
                        <img
                          src={item.originalImage || item.resultImage}
                          alt="Before"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                        <span className="absolute bottom-1.5 left-2 text-[9px] px-2 py-0.5 rounded-full bg-black/60 text-gray-100 uppercase tracking-[0.16em]">
                          Before
                        </span>
                      </div>
                      <div className="w-1/2 relative h-28 sm:h-32">
                        <img
                          src={item.resultImage}
                          alt="After"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                        <span className="absolute bottom-1.5 left-2 text-[9px] px-2 py-0.5 rounded-full bg-purple-600/80 text-gray-50 uppercase tracking-[0.16em]">
                          After
                        </span>
                      </div>
                    </div>
                    <div className="px-3.5 py-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-semibold">
                            Saved build · AI render
                          </p>
                          <p className="text-[10px] text-gray-300 line-clamp-2">
                            {item.prompt || 'Saved from Car Crafter builder.'}
                          </p>
                        </div>
                        {item.createdAt && (
                          <span className="text-[10px] text-gray-500">
                            {formatShortDate(item.createdAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] mt-1 pt-1 border-t border-white/10">
                        <span className="text-gray-400">
                          Tap to see this build in your Library
                        </span>
                        <span className="text-purple-300 text-[10px]">
                          Open build →
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : loaded ? (
              <div className="rounded-2xl border border-gray-800 bg-[#070711] p-3 text-[11px] text-gray-300">
                Save a few builds from the builder and they’ll show up here as
                before/after examples.
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-800 bg-gradient-to-r from-[#090912] via-[#151525] to-[#090912] animate-pulse h-24" />
            )}
          </section>

          {/* MAKE THIS A REALITY – pricing example card */}
          <section className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => router.push('/library')}
                className="w-full rounded-3xl bg-[#0b0b14] border border-white/8 px-4 py-3 text-left shadow-[0_18px_54px_rgba(0,0,0,0.9)] hover:border-purple-500/80 hover:bg-purple-950/30 transition"
              >
                <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">
                  Make this a reality
                </p>
                <p className="text-sm font-semibold mt-1">
                  See your before / after examples with rough pricing.
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Open your Library to see every build you’ve saved, compare before /
                  after, and ballpark what it would cost to do in real life.
                </p>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-gray-300">
                  <span>Stance + wheels build: ≈ $2.1k</span>
                  <span>Full aero street monster: ≈ $3.8k</span>
                  <span>OEM+ tint + mild drop: ≈ $1.2k</span>
                  <span>Track-ready setup: ≈ $2.7k</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => router.push('/part-finder')}
                className="w-full rounded-3xl bg-[#0b0b14] border border-white/8 px-4 py-3 text-left shadow-[0_18px_54px_rgba(0,0,0,0.9)] hover:border-purple-500/80 hover:bg-purple-950/30 transition"
              >
                <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">
                  Part Finder
                </p>
                <p className="text-sm font-semibold mt-1">
                  Find parts with ease of mind in seconds.
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Match your digital build to real parts and rough pricing, without
                  digging through 20 tabs of forums, Facebook Marketplace, and random
                  vendors.
                </p>
                <p className="mt-2 text-[10px] text-purple-200">
                  Coming soon: direct links to wheels, coilovers, aero and tint for your
                  exact car.
                </p>
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* iOS style home bar */}
      <footer className="border-t border-white/5 bg-[#050509]/95 backdrop-blur">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-center">
          <div className="w-24 h-1.5 rounded-full bg-white/12" />
        </div>
      </footer>
    </main>
  )
}