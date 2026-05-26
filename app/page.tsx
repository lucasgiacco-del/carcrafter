'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from './shared/auth'
import { listSavedBuilds, type SavedBuild } from './shared/saved-builds'
import { getSupabaseBrowserClient } from './shared/supabase-browser'

type ModPackId = 'oem_plus' | 'slammed' | 'murdered' | 'track'
type PackSide = 'front' | 'rear'

type ModPack = {
  id: ModPackId
  name: string
  label: string
  tagline: string
  description: string
  bestFor: string
  badge: string
  requiresSideSelection?: boolean
}

const MOD_PACKS: ModPack[] = [
  {
    id: 'oem_plus',
    name: 'OEM+ Pack',
    label: 'Clean factory-plus setup.',
    tagline: 'Rotor wheels, a light drop, and subtle OEM-style aero.',
    description:
      'Auto-selects OEM rotor wheels, lowering springs, light tint, OEM+ diffuser, plus an OEM lip for front shots or a lip spoiler for rear shots.',
    bestFor: 'Daily / OEM+ enjoyers',
    badge: 'OEM+',
    requiresSideSelection: true,
  },
  {
    id: 'slammed',
    name: 'Slammed Pack',
    label: 'Show car stance.',
    tagline: 'Front 1/4 or 3/4 photo required.',
    description:
      'Auto-selects chrome deep dish wheels, bagged suspension, a Maxton-style extension, and limo tint.',
    bestFor: 'Meets / shows / night drives',
    badge: 'Slammed',
  },
  {
    id: 'murdered',
    name: 'Murdered Pack',
    label: 'Blacked-out street spec.',
    tagline: 'Gloss black trim and wheels with front or rear variants.',
    description:
      'Auto-selects gloss black multi-spoke wheels, lowering springs, and gloss black chrome delete. Front adds a Maxton lip; rear adds a lip spoiler and quad-tip diffuser.',
    bestFor: 'Blackout / stealth builds',
    badge: 'Murdered',
    requiresSideSelection: true,
  },
  {
    id: 'track',
    name: 'Track Pack',
    label: 'Track-ready front setup.',
    tagline: 'Front photo required.',
    description:
      'Auto-selects brushed silver motorsport wheels, coilovers, and a track splitter.',
    bestFor: 'Track / canyon / spirited',
    badge: 'Track',
  },
]

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function FrontRearSlider({
  value,
  onChange,
}: {
  value: PackSide
  onChange: (value: PackSide) => void
}) {
  return (
    <div className="rounded-full border border-white/10 bg-black/40 p-1">
      <div className="relative grid grid-cols-2">
        <div
          className={cx(
            'absolute inset-y-0 left-0 w-1/2 rounded-full bg-purple-500/90 shadow-[0_12px_30px_rgba(123,97,255,0.35)] transition-transform duration-200',
            value === 'rear' && 'translate-x-full',
          )}
        />
        <button
          type="button"
          onClick={() => onChange('front')}
          className="relative z-10 rounded-full px-4 py-2 text-sm font-semibold text-white"
        >
          Front
        </button>
        <button
          type="button"
          onClick={() => onChange('rear')}
          className="relative z-10 rounded-full px-4 py-2 text-sm font-semibold text-white"
        >
          Rear
        </button>
      </div>
    </div>
  )
}

function formatShortDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

/* ---------- HERO BEFORE/AFTER EXAMPLES (hard-coded) ---------- */

type HeroExample = {
  id: string
  name: string
  beforeSrc: string
  afterSrc: string
  summary: string
  budget: string
  beforeImageClassName?: string
}

const HERO_EXAMPLES: HeroExample[] = [
  {
    id: 'c43',
    name: '2020 Mercedes C43 – wheels & lip',
    beforeSrc: '/hero-examples/amg-before.png',
    afterSrc: '/hero-examples/amg-after.png',
    summary: 'Chrome wheels, front lip, slightly lower ride height.',
    budget: '≈ $— in parts',
  },
  {
    id: 'a4',
    name: 'Audi A4 – lip, wheels & drop',
    beforeSrc: '/hero-examples/a4-before.jpg',
    afterSrc: '/hero-examples/a4-after.png',
    summary: 'Lowered stance, polished step-lip wheels, darker tint, front lip.',
    budget: '≈ $— in parts',
    beforeImageClassName: 'scale-[0.94]',
  },
]

function HeroExampleSlider({
  before,
  after,
  beforeImageClassName,
}: {
  before: string
  after: string
  beforeImageClassName?: string
}) {
  const [pct, setPct] = useState(0)
  const beforeOpacity = Math.max(0, 1 - pct / 18)
  const afterOpacity = Math.min(1, Math.max(0, (pct - 8) / 18))

  return (
    <div className="w-full">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black">
        <img
          src={before}
          alt="Before"
          className={cx('block w-full transition-transform duration-200', beforeImageClassName)}
        />
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
            className="block h-full w-full object-cover"
          />
          <div
            className="pointer-events-none absolute right-3 top-3 rounded-full border border-white/15 bg-black/70 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur transition-opacity duration-200"
            style={{ opacity: afterOpacity }}
          >
            After
          </div>
        </div>
        <div
          className="pointer-events-none absolute bottom-0 top-0 z-10"
          style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
        >
          <div className="h-full w-[2px] bg-white/80 shadow-[0_0_18px_rgba(255,255,255,0.35)]" />
          <div className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/75 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur">
            <div className="flex h-full items-center justify-center text-sm text-white/90">
              ↔
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
  )
}


export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading, signOut, isConfigured } = useAuth()
  const [library, setLibrary] = useState<SavedBuild[]>([])
  const [loaded, setLoaded] = useState(false)
  const [pendingPack, setPendingPack] = useState<ModPack | null>(null)
  const [pendingSide, setPendingSide] = useState<PackSide>('front')
  const [activeHeroExample, setActiveHeroExample] = useState<HeroExample | null>(null)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    if (authLoading) return
    if (!isConfigured || !user || !supabase) {
      setLibrary([])
      setLoaded(true)
      return
    }

    listSavedBuilds(supabase)
      .then((items) => setLibrary(items))
      .catch(() => setLibrary([]))
      .finally(() => setLoaded(true))
  }, [authLoading, isConfigured, user])

  const mostRecent = useMemo(() => library[0] ?? null, [library])
  const recentWithBefore = useMemo(
    () => library.filter((i) => i.originalImage && i.resultImage).slice(0, 3),
    [library],
  )

  const openPackFlow = (id: ModPackId, side?: PackSide) => {
    const params = new URLSearchParams()
    params.set('pack', id)
    if (side) {
      params.set('side', side)
    }
    router.push(`/build?${params.toString()}`)
  }

  const handlePackClick = (pack: ModPack) => {
    if (pack.requiresSideSelection) {
      setPendingPack(pack)
      setPendingSide('front')
      return
    }

    openPackFlow(pack.id)
  }

  return (
    <main className="min-h-screen bg-[#020308] text-white flex flex-col">
      {/* App header */}
      <header className="border-b border-white/5 bg-gradient-to-b from-[#141428] via-[#050509] to-transparent">
        <div className="app-shell-wide flex flex-wrap items-start justify-between gap-3 pt-5 pb-4 sm:gap-4">
          <div className="min-w-0 flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-black border border-white/10 overflow-hidden flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.8)] sm:h-11 sm:w-11">
              <img
                src="/carcrafter.png"
                alt="Car Crafter"
                className="h-10 w-10 object-contain sm:h-11 sm:w-11"
              />
            </div>
            <div className="min-w-0 flex flex-col leading-tight">
              <span className="text-xs font-semibold tracking-[0.14em] uppercase text-gray-200/90 sm:text-sm">
                Car Crafter
              </span>
              <span className="text-xs text-gray-400/90 sm:text-sm">
                Visualize before you spend.
              </span>
            </div>
          </div>

          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            {user ? (
              <button
                type="button"
                onClick={() => signOut()}
                className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-gray-200 tracking-[0.14em] uppercase sm:text-xs"
              >
                Sign Out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => router.push('/sign-in')}
                className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-gray-200 tracking-[0.14em] uppercase sm:text-xs"
              >
                Sign In
              </button>
            )}
            <button
              type="button"
              onClick={() => router.push('/library')}
              className="whitespace-nowrap rounded-full border border-purple-400/60 bg-purple-500/15 px-3 py-1.5 text-[11px] font-medium text-purple-100 tracking-[0.18em] uppercase transition hover:bg-purple-500/25 sm:text-xs"
            >
              My Garage
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex justify-center">
        <div className="app-shell-wide w-full pb-8 pt-4 flex flex-col gap-6 sm:gap-7">
          {/* HERO – build studio + hero examples */}
          <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#22123f] via-[#0a0716] to-[#050509] shadow-[0_26px_60px_rgba(0,0,0,0.9)] px-5 py-5 space-y-5 sm:px-6 sm:py-6">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.22em] text-purple-200/80 sm:text-xs">
                  Your build studio
                </p>
                <h1 className="text-[1.8rem] font-semibold tracking-tight text-white sm:text-[2.2rem]">
                  Build, visualize, and source your dream car.
                </h1>
                <p className="max-w-2xl text-sm leading-relaxed text-gray-200/80 sm:text-base">
                  Upload your car and stack mods to see the before / after of your
                  build instantly. Then price it out and find the right parts with ease.
                </p>
              </div>
              {mostRecent && mostRecent.resultImage && (
                <div className="hidden lg:block h-20 w-32 rounded-2xl overflow-hidden border border-white/15 bg-black/40">
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
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-600 font-semibold py-3.5 shadow-[0_14px_40px_rgba(123,97,255,0.45)] transition"
              >
                <span className="text-sm font-semibold sm:text-base">New build</span>
                <span className="text-[20px] leading-none sm:text-[22px]">＋</span>
              </button>
            </div>

            {/* HERO BEFORE / AFTER – made with Car Crafter */}
            <div className="mt-2 rounded-2xl border border-white/10 bg-black/25 px-4 py-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400 sm:text-xs">
                    Made with Car Crafter
                  </p>
                  <p className="text-base font-semibold sm:text-lg">
                    See what your car could look like.
                  </p>
                </div>
                <span className="rounded-full bg-purple-500/15 border border-purple-400/60 px-2.5 py-1 text-[11px] text-purple-100 uppercase tracking-[0.16em] sm:text-xs">
                  Before / After
                </span>
              </div>

              <p className="text-sm leading-relaxed text-gray-200/80 sm:text-base">
                Real examples rendered inside the app. Compare stock vs built — no
                Photoshop, no guessing.
              </p>

              <div className="space-y-3 xl:grid xl:grid-cols-2 xl:gap-4 xl:space-y-0">
                {HERO_EXAMPLES.map((example) => (
                  <div
                    key={example.id}
                    className="rounded-2xl border border-white/10 bg-[#050509] overflow-hidden text-left shadow-[0_18px_45px_rgba(0,0,0,0.85)] transition hover:border-purple-400/70 hover:bg-purple-950/20 hover:shadow-[0_18px_50px_rgba(123,97,255,0.18)]"
                  >
                    <div className="w-full flex">
                      <button
                        type="button"
                        onClick={() => setActiveHeroExample(example)}
                        className="relative h-28 w-1/2 border-r border-black/50 sm:h-32"
                      >
                        <img
                          src={example.beforeSrc}
                          alt={`${example.name} before`}
                          className={cx(
                            'h-full w-full object-cover transition-transform duration-200',
                            example.beforeImageClassName,
                          )}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                        <span className="absolute bottom-1.5 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-gray-100 uppercase tracking-[0.16em]">
                          Before
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveHeroExample(example)}
                        className="relative h-28 w-1/2 sm:h-32"
                      >
                        <img
                          src={example.afterSrc}
                          alt={`${example.name} after`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                        <span className="absolute bottom-1.5 left-2 rounded-full bg-purple-600/80 px-2 py-0.5 text-[10px] text-gray-50 uppercase tracking-[0.16em]">
                          After
                        </span>
                        {/* Watermark pill removed */}
                      </button>
                    </div>
                    <div className="px-4 py-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="text-sm font-semibold text-gray-50">{example.name}</p>
                        <p className="text-sm text-gray-200/80">{example.summary}</p>
                      </div>
                      <p className="text-gray-400 whitespace-nowrap">
                        {example.budget}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-500 sm:text-sm">
                In the builder you can upload your own car, drag a slider to compare
                before / after, and save every setup to your Library.
              </p>
            </div>
          </section>

          {/* MOD PACKS */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-200/90 sm:text-sm">
                  Mod packs
                </h2>
                <p className="text-xs text-gray-500 sm:text-sm">
                  One-tap starting points tailored to different scenes.
                </p>
              </div>
            </div>

            <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 xl:grid xl:grid-cols-4 xl:overflow-visible">
              {MOD_PACKS.map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => handlePackClick(pack)}
                  className="group relative flex h-36 min-w-[220px] snap-start flex-col justify-between overflow-hidden rounded-2xl border border-gray-800 bg-gradient-to-br from-[#1c1034] via-[#090812] to-[#050509] p-4 text-left transition hover:border-purple-500/80 hover:shadow-[0_18px_50px_rgba(123,97,255,0.45)] xl:min-w-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold">{pack.name}</p>
                      <p className="text-xs text-gray-300 line-clamp-2">
                        {pack.tagline}
                      </p>
                    </div>
                    <span className="rounded-full bg-purple-500/20 border border-purple-400/70 px-2 py-0.5 text-[10px] text-purple-100 uppercase tracking-[0.16em]">
                      {pack.badge}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-400 line-clamp-2">
                    {pack.description}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-gray-500">
                      Best for: {pack.bestFor}
                    </span>
                    <span className="text-[10px] text-purple-200 group-hover:text-purple-50">
                      Load pack →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* BEFORE / AFTER EXAMPLES FROM USER LIBRARY */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-200/90 sm:text-sm">
                  Before & after examples
                </h2>
                <p className="text-xs text-gray-500 sm:text-sm">
                  Your own saved builds, shown like case studies.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push('/library')}
                className="text-sm text-purple-300 hover:text-purple-100"
              >
                View all →
              </button>
            </div>

            {recentWithBefore.length > 0 ? (
              <div className="space-y-3 xl:grid xl:grid-cols-2 xl:gap-4 xl:space-y-0">
                {recentWithBefore.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => router.push('/library')}
                    className="w-full rounded-3xl border border-gray-850 bg-[#080812] overflow-hidden shadow-[0_18px_54px_rgba(0,0,0,0.9)] text-left hover:border-purple-500/80 hover:bg-purple-950/40 transition"
                  >
                    <div className="w-full flex">
                      <div className="w-1/2 relative h-32 sm:h-36 border-r border-black/40">
                        <img
                          src={item.originalImage || item.resultImage}
                          alt="Before"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                        <span className="absolute bottom-1.5 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-gray-100 uppercase tracking-[0.16em]">
                          Before
                        </span>
                      </div>
                      <div className="w-1/2 relative h-32 sm:h-36">
                        <img
                          src={item.resultImage}
                          alt="After"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                        <span className="absolute bottom-1.5 left-2 rounded-full bg-purple-600/80 px-2 py-0.5 text-[10px] text-gray-50 uppercase tracking-[0.16em]">
                          After
                        </span>
                      </div>
                    </div>
                    <div className="px-4 py-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">
                            Saved build · AI render
                          </p>
                          <p className="text-xs text-gray-300 line-clamp-2 sm:text-sm">
                            {item.prompt || 'Saved from Car Crafter builder.'}
                          </p>
                        </div>
                        {item.createdAt && (
                          <span className="text-xs text-gray-500">
                            {formatShortDate(item.createdAt)}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-2 text-xs">
                        <span className="text-gray-400">
                          Tap to see this build in your Library
                        </span>
                        <span className="text-purple-300">
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

        </div>
      </div>

      {pendingPack && (
        <div className="fixed inset-0 z-50 bg-black/80 px-4 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0c0c15] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.8)]">
              <p className="text-[11px] uppercase tracking-[0.22em] text-purple-200/80">
                Pack direction
              </p>
              <h3 className="mt-2 text-xl font-semibold text-white">
                {pendingPack.name}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-300">
                Pick the shot you want before entering the flow. This decides which
                auto-selected mods we load for the pack.
              </p>

              <div className="mt-5 space-y-3">
                <FrontRearSlider value={pendingSide} onChange={setPendingSide} />
                <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-gray-300">
                  {pendingSide === 'front'
                    ? 'Front loads the front lip version of this pack.'
                    : 'Rear loads the spoiler-focused rear version of this pack.'}
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setPendingPack(null)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-gray-200 transition hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    openPackFlow(pendingPack.id, pendingSide)
                    setPendingPack(null)
                  }}
                  className="flex-1 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(123,97,255,0.35)] transition hover:from-purple-400 hover:to-purple-600"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeHeroExample && (
        <div
          className="fixed inset-0 z-50 bg-black/60 px-4 backdrop-blur-md"
          onClick={() => setActiveHeroExample(null)}
        >
          <div className="flex min-h-full items-center justify-center py-8">
            <div
              className="w-full max-w-3xl rounded-3xl border border-white/10 bg-[#0b0a12]/95 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.8)] sm:p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <HeroExampleSlider
                before={activeHeroExample.beforeSrc}
                after={activeHeroExample.afterSrc}
                beforeImageClassName={activeHeroExample.beforeImageClassName}
              />
              <p className="mt-4 text-sm leading-relaxed text-gray-200 sm:text-base">
                {activeHeroExample.summary}
              </p>
              <button
                type="button"
                onClick={() => setActiveHeroExample(null)}
                className="mt-5 inline-flex rounded-xl border border-purple-400/60 bg-purple-500/15 px-4 py-2.5 text-sm font-medium text-purple-100 transition hover:bg-purple-500/25"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS style home bar */}
      <footer className="border-t border-white/5 bg-[#050509]/95 backdrop-blur">
        <div className="app-shell-wide py-4 flex items-center justify-center">
          <div className="w-24 h-1.5 rounded-full bg-white/12" />
        </div>
      </footer>
    </main>
  )
}
