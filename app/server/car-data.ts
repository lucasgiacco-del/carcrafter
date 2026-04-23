/* ---------- Generation lock (year-accurate) ---------- */


/**
 * This file is server-only because it contains prompt-building logic and large DB strings.
 * Keep it imported ONLY from server components / route handlers / server actions.
 */

/* ---------- Types ---------- */

export type ModId =
  | 'tint'
  | 'wheels'
  | 'spoiler'
  | 'chrome_delete'
  | 'carbon'
  | 'suspension'
  | 'spacers'

export type SelectedModState = {
  enabled: boolean
  optionId: string | null
}

export type PromptStyle = 'strict' | 'gemini'

export type GenRule = {
  from: number
  to: number
  name: string
  descriptor: string

  // optional so older DB rows don’t error
  platformCode?: string

  mustNotResemble?: string[]

  // Optional “delta” helpers (safe to add later)
  keyDifferencesVsPrevious?: string[]
  keyDifferencesVsNext?: string[]
  fasciaChecklist?: string[]
  greenhouseChecklist?: string[]
}

export type GenDB = Record<string, Record<string, GenRule[]>>

/* ---------- Gemini-safe text helpers ---------- */

function toGeminiSafe(text: string): string {
  return text
    // tone down hard language
    .replace(/HARD LOCK[:]?/gi, 'Year-accurate styling:')
    .replace(/HARD REQUIREMENT[:]?/gi, 'Important:')
    .replace(/NON-NEGOTIABLE[:]?/gi, 'Important:')
    .replace(/NEGATIVES[:]?/gi, 'Avoid:')
    .replace(/must NOT resemble/gi, 'avoid resembling')
    .replace(/Do NOT/gi, 'Avoid')
    .replace(/MUST/gi, 'Should')
    .replace(/EXACT/gi, 'accurate')
    // remove “security-ish” words that sometimes trip filters
    .replace(/bypass|evade|disable|surveillance|security/gi, 'avoid')
    // compress whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

function maybeStyle(text: string, style: PromptStyle): string {
  return style === 'gemini' ? toGeminiSafe(text) : text
}

function ruleToAnchor(rule: GenRule, style: PromptStyle): string {
  const base = `
Selected vehicle: ${rule.name}.
Key visual cues: ${rule.descriptor}
${rule.mustNotResemble?.length ? `Avoid resembling: ${rule.mustNotResemble.join(', ')}.` : ''}
`.replace(/\s+/g, ' ').trim()

  return maybeStyle(base, style)
}

/* ---------- Normalizers + model aliasing ---------- */

export function normalizeMakeKey(make: string): string {
  const m = make
    .trim()
    .toLowerCase()
    .replace(/[–—]/g, '-') // normalize fancy dashes
    .replace(/\s+/g, ' ')

  if (
    m === 'mercedes' ||
    m === 'mercedes benz' ||
    m === 'mercedes-benz' ||
    m === 'mercedesbenz'
  ) {
    return 'mercedes-benz'
  }

  return m
}

export function normalizeModelKey(model: string): string {
  return model.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Map "trimmy" dropdown models to the canonical keys used by GEN_DB.
 * This should be the only place that contains alias rules.
 */
export function modelAliasKey(make: string, model: string): string | null {
  const mk = normalizeMakeKey(make)
  const m = normalizeModelKey(model)

  // ---------- AUDI ----------
  if (mk === 'audi') {
    if (m.startsWith('a5')) return 'a5'
    if (m.startsWith('s5')) return 's5'
    if (m.startsWith('rs5')) return 'rs5'

    if (m.startsWith('a4')) {
      if (m.includes('allroad')) return 'a4 allroad'
      if (m.includes('quattro')) return 'a4 quattro'
      return 'a4'
    }

    if (m.startsWith('s4')) return 's4'
    if (m.startsWith('q5')) return 'q5'
  }

  // ---------- BMW ----------
  if (mk === 'bmw') {
    if (/\b(320i|328i|330i|330e|335i|340i|m340i|m3)\b/.test(m)) return '3 series'
    if (/\b(528i|530i|530e|535i|540i|550i|m550i|m5)\b/.test(m)) return '5 series'
  }

  // ---------- MERCEDES-BENZ ----------
  if (mk === 'mercedes-benz') {
    if (m.startsWith('c 300')) return 'c 300'
  }

  // ---------- HONDA ----------
  if (mk === 'honda') {
    if (m.startsWith('accord')) return 'accord'
    if (m.startsWith('civic')) return 'civic'
    if (m.startsWith('cr-v')) return 'cr-v'
    if (m.startsWith('hr-v')) return 'hr-v'
  }

  // ---------- TOYOTA ----------
  if (mk === 'toyota') {
    if (m.startsWith('camry')) return 'camry'
    if (m.startsWith('corolla')) return 'corolla'
    if (m.startsWith('rav4')) return 'rav4'
  }

  // ---------- TESLA ----------
  if (mk === 'tesla') {
    if (m.startsWith('model 3')) return 'model 3'
    if (m.startsWith('model y')) return 'model y'
  }

  return null
}

/**
 * Strips trims/body styles/drivetrain words so you can fall back to a base key.
 * Example: "C 300 4MATIC" -> "c 300"
 * Example: "Accord EX-L"  -> "accord"
 */
export function baseModelKey(model: string): string {
  const m = normalizeModelKey(model)

  const drivetrainTokens = ['quattro', '4matic', 'xdrive', 'sdrive', 'awd', 'fwd', 'rwd']
  const bodyStyleTokens = [
    'coupe',
    'sedan',
    'hatchback',
    'sportback',
    'gran coupe',
    'convertible',
    'cabriolet',
    'wagon',
    'avant',
  ]
  const trimTokens = [
    'lx',
    'ex',
    'ex-l',
    'sport',
    'touring',
    'hybrid',
    'si',
    'type r',
    'type s',
    'amg',
    'amg line',
    'm',
    'm sport',
    'n line',
    'gt',
    'gti',
    'gli',
    'se',
    'sel',
    'xse',
    'le',
    'limited',
    'premium',
    'platinum',
    'base',
    'performance',
    'long range',
    'r-line',
    'competition',
    'cs',
    'm40i',
    'm50i',
    'a-spec',
    'aspec',
  ]

  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const makeGroup = (arr: string[]) => new RegExp(`\\b(${arr.map(esc).join('|')})\\b`, 'gi')

  return m
    .replace(makeGroup(drivetrainTokens), '')
    .replace(makeGroup(bodyStyleTokens), '')
    .replace(makeGroup(trimTokens), '')
    .replace(/\s+/g, ' ')
    .trim()
}

/* ---------- Global generation lock rules ---------- */

export const GENERATION_LOCK_RULES = `
Identity lock:
- The car should match the exact year / make / model the user selected.
- The generation cues should be correct (headlights, taillights, grille, greenhouse shape, beltline, bumpers, proportions).
- If the model is uncertain, use the most common official factory styling for that exact year (avoid older generations).
- Avoid rounding or simplifying the front end; preserve the headlight housing shape and internal signature.
`
  .replace(/\s+/g, ' ')
  .trim()

/* ---------- Fascia resolver ---------- */

export type ResolveFasciaArgs = {
  make: string
  model: string
  year: number | string
}

export function resolveFascia({ make, model, year }: ResolveFasciaArgs): GenRule | null {
  const y = typeof year === 'string' ? Number(year) : year
  if (!make || !model || Number.isNaN(y) || y <= 0) return null

  const makeKey = normalizeMakeKey(make)
  const modelKey = normalizeModelKey(model)
  const baseKey = baseModelKey(model)

  const makeRules = GEN_DB[makeKey]
  const aliasKey = modelAliasKey(make, model)

  const rules =
    makeRules?.[modelKey] ||
    (aliasKey ? makeRules?.[aliasKey] : undefined) ||
    makeRules?.[baseKey]

  const hit = rules?.find((r) => y >= r.from && y <= r.to)
  return hit ?? null
}

/* ---------- Generation DB ---------- */

export const GEN_DB: GenDB = {
  // ---------------- HONDA ----------------
  honda: {
    accord: [
      {
        from: 2023,
        to: 2025,
        name: 'Honda Accord 11th gen (2023–present)',
        descriptor:
          '11th-gen Accord cues: razor-slim horizontal LED headlights, sharp inner headlight corners, wide simple grille opening, clean flat bumper surfacing (avoid rounded/bubbly), crisp shoulder line, long hood, slightly fastback-like roofline. The front should read 2023+ immediately. This generation replaces the taller, more aggressive 2018–2022 front end with a lower, flatter headlight line and simpler grille.',
        mustNotResemble: [
          'Accord 10th gen (2018–2022) with larger/rounder headlight housings',
          'Accord 9th gen (2013–2017) older softer nose',
          'Accord 8th gen (2008–2012) older proportions',
        ],
      },
      {
        from: 2018,
        to: 2022,
        name: 'Honda Accord 10th gen (2018–2022)',
        descriptor:
          '10th-gen Accord cues: more aggressive body surfacing and different greenhouse; 2018–2022 headlight and grille styling. Avoid the newer 11th-gen calm/simple face.',
      },
    ],

    civic: [
      {
        from: 2022,
        to: 2025,
        name: 'Honda Civic 11th gen (2022–present)',
        descriptor:
          '11th-gen Civic cues: clean/simple body, slim modern headlights, calmer upright grille and bumper design; less edgy than 10th gen. Should read as a 2022+ Civic.',
        mustNotResemble: ['Civic 10th gen (2016–2021)', 'Civic 9th gen (2012–2015)'],
      },
      {
        from: 2016,
        to: 2021,
        name: 'Honda Civic 10th gen (2016–2021)',
        descriptor:
          '10th-gen Civic cues: sharper/edgier body language and more aggressive front styling than 11th gen.',
      },
    ],

    'cr-v': [
      {
        from: 2023,
        to: 2025,
        name: 'Honda CR-V 6th gen (2023–present)',
        descriptor:
          '6th-gen CR-V cues: boxier/upright modern SUV proportions, slim headlights, clean straight lines. Avoid the more rounded 5th gen.',
        mustNotResemble: ['CR-V 5th gen (2017–2022)'],
      },
    ],
  },

  // ---------------- AUDI ----------------
  audi: {
    a4: [
      {
        from: 2021,
        to: 2025,
        name: 'Audi A4 B9.5 facelift (2021–2025)',
        descriptor:
          'Audi A4 B9.5 facelift sedan cues (2021–2025): sharper headlight housings with segmented LED “ticks” signature (not a single continuous swoosh); crisp inner corners; A4-sized Singleframe grille proportions (avoid A6 size); facelift-era lower intake geometry; preserve B9.5 hood cutlines and bumper creases; avoid rounding/simplifying the face.',
        mustNotResemble: [
          'Audi A4 B9 pre-facelift (2017–2020)',
          'Audi A4 B8.5 (2013–2016)',
          'Audi A6 / S6 (larger body proportions)',
          'Audi S4/S-line swapped bumper',
        ],
      },
      {
        from: 2017,
        to: 2020,
        name: 'Audi A4 B9 pre-facelift (2017–2020)',
        descriptor:
          'B9 pre-facelift cues: older headlight internal signature vs B9.5 and older bumper intake layout. Avoid “upgrading” to facelift details.',
        mustNotResemble: ['Audi A4 B9.5 facelift (2021–2025)', 'Audi A4 B8.5 (2013–2016)'],
      },
    ],

    'a4 quattro': [
      {
        from: 2021,
        to: 2025,
        name: 'Audi A4 B9.5 facelift (2021–2025)',
        descriptor:
          'Same cues as A4 B9.5 facelift: 2021+ facelift headlights + bumper details. Keep A4 sedan proportions; avoid morphing into an S4 or A6.',
        mustNotResemble: ['Audi A4 B9 pre-facelift (2017–2020)', 'Audi A6 (bigger body)'],
      },
    ],

    'a4 allroad': [
      {
        from: 2021,
        to: 2025,
        name: 'Audi A4 allroad B9.5 facelift (2021–2025)',
        descriptor:
          'A4 allroad B9.5 facelift cues: A4 B9.5 face plus allroad wagon body and cladding. Should clearly read as wagon/allroad, not sedan.',
        mustNotResemble: ['A4 sedan', 'A6 allroad (bigger wagon proportions)'],
      },
    ],

    a5: [
      {
        from: 2013,
        to: 2017,
        name: 'Audi A5 B8.5 (2013–2017)',
        descriptor:
          'B8.5 A5 cues: older grille/headlight look (avoid sharp B9/B9.5 styling), more rounded bumper geometry. If coupe is implied, keep 2-door coupe proportions (long doors, no rear doors).',
        mustNotResemble: ['Audi A5/S5 B9 (2018–2019)', 'Audi A5/S5 B9.5 facelift (2020–2025)'],
      },
      {
        from: 2018,
        to: 2019,
        name: 'Audi A5 B9 (2018–2019)',
        descriptor:
          'B9 A5 cues: sharper modern headlights vs B8.5, B9-era bumper and grille. If coupe is implied, keep 2-door proportions.',
        mustNotResemble: ['Audi A5/S5 B8.5 (2013–2017)', 'Audi A5/S5 B9.5 facelift (2020–2025)'],
      },
      {
        from: 2020,
        to: 2025,
        name: 'Audi A5 B9.5 facelift (2020–2025)',
        descriptor:
          'B9.5 facelift A5 cues: facelift lighting signature and updated bumper details. Keep A5 proportions.',
        mustNotResemble: ['Audi A5/S5 B8.5 (2013–2017)', 'Audi A5/S5 B9 (2018–2019)'],
      },
    ],

    s5: [
      {
        from: 2013,
        to: 2017,
        name: 'Audi S5 B8.5 (2013–2017)',
        descriptor:
          'B8.5 S5 cues: B8.5-era headlights and grille/bumper geometry with S-model sportier lower intakes. Avoid upgrading to B9/B9.5.',
        mustNotResemble: ['Audi S5 B9 (2018–2019)', 'Audi S5 B9.5 facelift (2020–2025)', 'Audi A5 bumper styling'],
      },
      {
        from: 2018,
        to: 2019,
        name: 'Audi S5 B9 (2018–2019)',
        descriptor:
          'B9 S5 cues: sharper modern headlights vs B8.5; sportier S bumper. Keep S5 identity (not A5).',
        mustNotResemble: ['Audi S5 B8.5 (2013–2017)', 'Audi S5 B9.5 facelift (2020–2025)'],
      },
      {
        from: 2020,
        to: 2025,
        name: 'Audi S5 B9.5 facelift (2020–2025)',
        descriptor:
          'B9.5 facelift S5 cues: facelift lighting signature + updated bumper details + S-model aggression. Keep S5 identity (not A5).',
        mustNotResemble: ['Audi S5 B8.5 (2013–2017)', 'Audi S5 B9 (2018–2019)'],
      },
    ],

    's5 coupe': [
      {
        from: 2013,
        to: 2017,
        name: 'Audi S5 Coupe B8.5 (2013–2017)',
        descriptor:
          'S5 coupe only: B8.5 S5 cues with 2-door coupe proportions (long doors, no rear doors).',
        mustNotResemble: ['Audi S5 Sportback (4-door)', 'Audi A5 (non-S)'],
      },
      {
        from: 2018,
        to: 2025,
        name: 'Audi S5 Coupe B9/B9.5 (2018–present)',
        descriptor:
          'S5 coupe only: keep S5 fascia and 2-door coupe proportions for the selected year.',
        mustNotResemble: ['Audi S5 Sportback (4-door)', 'Audi A5 (non-S)'],
      },
    ],

    q5: [
      {
        from: 2021,
        to: 2025,
        name: 'Audi Q5 FY facelift (2021–2025)',
        descriptor:
          'Q5 2021+ facelift cues: updated headlights and bumper details; avoid the 2018–2020 pre-facelift look.',
        mustNotResemble: ['Audi Q5 FY pre-facelift (2018–2020)'],
      },
    ],
  },

  // ---------------- BMW ----------------
  bmw: {
    '3 series': [
      {
        from: 2019,
        to: 2025,
        name: 'BMW 3 Series G20 (2019–present)',
        descriptor:
          'G20 cues: modern slimmer headlights and newer proportions/stance; avoid the older F30.',
        mustNotResemble: ['BMW 3 Series F30 (2012–2018)', 'BMW 3 Series E90 (2006–2011)'],
      },
      {
        from: 2012,
        to: 2018,
        name: 'BMW 3 Series F30 (2012–2018)',
        descriptor: 'F30 cues: older body shape and headlight styling vs G20.',
      },
    ],

    '5 series': [
      {
        from: 2017,
        to: 2023,
        name: 'BMW 5 Series G30 (2017–2023)',
        descriptor:
          'G30 cues: modern 2017+ 5-series proportions and headlight/grille styling; avoid older F10 look.',
        mustNotResemble: ['BMW 5 Series F10 (2011–2016)'],
      },
    ],
  },

  // ---------------- MERCEDES ----------------
  'mercedes-benz': {
    'c 300': [
      {
        from: 2022,
        to: 2025,
        name: 'Mercedes C-Class W206 (2022–present)',
        descriptor:
          'W206 cues: very modern sleek headlights and smoother modern body proportions; avoid W205.',
        mustNotResemble: ['Mercedes C-Class W205 (2015–2021)'],
      },
      {
        from: 2015,
        to: 2021,
        name: 'Mercedes C-Class W205 (2015–2021)',
        descriptor: 'W205 cues: older C-class shape; avoid W206 styling.',
      },
    ],
  },

  // ---------------- TOYOTA ----------------
  toyota: {
    camry: [
      {
        from: 2018,
        to: 2025,
        name: 'Toyota Camry XV70 (2018–2025)',
        descriptor: 'XV70 cues: modern sharper styling vs older Camry; avoid XV50.',
        mustNotResemble: ['Toyota Camry XV50 (2012–2017)'],
      },
    ],
  },

  // ---------------- TESLA ----------------
  tesla: {
    'model 3': [
      {
        from: 2024,
        to: 2025,
        name: 'Tesla Model 3 Highland refresh (2024–present)',
        descriptor:
          'Highland cues: refreshed 2024+ front and lighting; avoid older pre-refresh Model 3.',
        mustNotResemble: ['Tesla Model 3 pre-refresh (2017–2023)'],
      },
    ],
  },
}

/* ---------- Anchor builder ---------- */

export function buildGenerationAnchor(
  carMake: string,
  carModel: string,
  carYear: string,
  style: PromptStyle = 'gemini',
): string {
  const year = Number(carYear)

  if (!carMake || !carModel || !year || Number.isNaN(year)) {
    const fallback = `Use accurate factory styling cues for the selected year/make/model. ${GENERATION_LOCK_RULES}`
    return maybeStyle(fallback, style)
  }

  const makeKey = normalizeMakeKey(carMake)
  const modelKey = normalizeModelKey(carModel)
  const baseKey = baseModelKey(carModel)

  const makeRules = GEN_DB[makeKey]
  const aliasKey = modelAliasKey(carMake, carModel)

  const rules =
    makeRules?.[modelKey] ||
    (aliasKey ? makeRules?.[aliasKey] : undefined) ||
    makeRules?.[baseKey]

  const hit = rules?.find((r) => year >= r.from && year <= r.to)

  if (!hit) {
    const fallback = `
Selected vehicle: ${year} ${carMake} ${carModel}.
Use the most common official factory styling for that exact year.
Avoid blending generations.
${GENERATION_LOCK_RULES}
`.replace(/\s+/g, ' ').trim()

    return maybeStyle(fallback, style)
  }

  const anchor = `
Generation anchor:
- This is a ${year} ${carMake} ${carModel}.
- Match: ${hit.name}.
- ${ruleToAnchor(hit, style)}
${GENERATION_LOCK_RULES}
`.replace(/\s+/g, ' ').trim()

  return maybeStyle(anchor, style)
}

/* ---------- Body style detection and locking ---------- */

export type BodyStyleHint = 'coupe' | 'sportback' | 'sedan' | 'cabriolet' | 'wagon' | null

export function inferBodyStyleHint(model: string): BodyStyleHint {
  const m = normalizeModelKey(model)

  if (m.includes('sportback') || m.includes('gran coupe') || m.includes('4-door')) return 'sportback'
  if (m.includes('coupe') || m.includes('2-door')) return 'coupe'
  if (m.includes('cabriolet') || m.includes('convertible')) return 'cabriolet'
  if (m.includes('avant') || m.includes('wagon') || m.includes('allroad')) return 'wagon'

  return 'sedan'
}

export function bodyStyleToPrompt(hint: BodyStyleHint): string {
  if (!hint) return ''

  if (hint === 'coupe') {
    return [
      'Body style: 2-door coupe only.',
      'Only 2 doors: long front doors, no rear doors, no rear door handles.',
      'Avoid Sportback or sedan body shapes.',
    ].join(' ')
  }

  if (hint === 'sportback') {
    return [
      'Body style: Sportback / 4-door fastback only.',
      '4 doors visible (rear doors present).',
      'Avoid 2-door coupe body shapes.',
    ].join(' ')
  }

  if (hint === 'cabriolet') {
    return [
      'Body style: convertible/cabriolet only.',
      'Convertible roof visible (soft top or hard top), not a fixed coupe roof.',
    ].join(' ')
  }

  if (hint === 'wagon') {
    return [
      'Body style: wagon/avant/allroad only.',
      'Extended roofline and cargo area; avoid sedan proportions.',
    ].join(' ')
  }

  return [
    'Body style: 4-door sedan only.',
    '4 doors visible (rear doors present). Avoid coupe or sportback proportions.',
  ].join(' ')
}

/* ---------- Trim badge hint ---------- */

export function TRIM_BADGE_HINT(carMake: string, carModel: string): string {
  const mk = normalizeMakeKey(carMake)
  const modelLower = normalizeModelKey(carModel)

  if (mk === 'audi') {
    if (modelLower.startsWith('s') || modelLower.startsWith('rs')) {
      return `
This is an Audi ${carModel}. Small OEM-style trim badge shapes are okay where they naturally appear,
but avoid readable text or invented lettering.
`.replace(/\s+/g, ' ').trim()
    }
  }

  return ''
}

/* ---------- Preservation / discipline hints ---------- */

export function buildWheelPreservationHint(mods: Record<ModId, SelectedModState>): string {
  const bits: string[] = []
  const enabledMods = Object.entries(mods).filter(([, s]) => s.enabled)

  const onlyWheelFitmentMods =
    enabledMods.length > 0 &&
    enabledMods.every(([id]) => id === 'wheels' || id === 'spacers' || id === 'suspension')

  if (!mods.tint?.enabled) {
    bits.push(
      onlyWheelFitmentMods
        ? 'Windows: treat all glass as locked. Keep brightness, color, reflections, and interior visibility identical to the baseline image. Avoid adding tint or darkening glass.'
        : 'Windows: match the same darkness/brightness/reflectivity as the baseline image. Avoid making windows darker or more reflective, and avoid adding windshield tint.',
    )
  }

  if (!mods.chrome_delete?.enabled) {
    bits.push(
      'Chrome trim: keep chrome/bright trim the same as baseline. Avoid darkening or blacking it out unless chrome delete is selected.',
    )
  }

  return bits.join(' ')
}

export function buildSuspensionAccuracyHint(mods: Record<ModId, SelectedModState>): string {
  const susp = mods.suspension

  if (!susp?.enabled || !susp.optionId) {
    return `
Keep ride height realistic for a street-driven car.
Avoid extreme stance or wheel tuck unless explicitly requested.
`.replace(/\s+/g, ' ').trim()
  }

  if (susp.optionId === 'stock') {
    return `
Match the factory stock ride height: normal fender gap, no extreme camber, no show-car stance.
`.replace(/\s+/g, ' ').trim()
  }

  if (susp.optionId === 'springs') {
    return `
Lowering springs: slightly lower than stock, about one to two finger widths of fender gap.
Avoid slammed show-car height and avoid extreme camber or wheel tuck.
`.replace(/\s+/g, ' ').trim()
  }

  if (susp.optionId === 'coilovers') {
    return `
Coilovers: sporty street height, tighter but still visible fender gap.
Lower than springs, but clearly not slammed. Keep camber subtle and realistic.
`.replace(/\s+/g, ' ').trim()
  }

  return `
Very low stance: minimal fender gap with realistic geometry (avoid broken/impossible fitment).
`.replace(/\s+/g, ' ').trim()
}

export function buildModDisciplineHint(mods: Record<ModId, SelectedModState>): string {
  const enabled = Object.entries(mods)
    .filter(([, state]) => state.enabled)
    .map(([id]) => id.replace('_', ' '))

  const enabledText =
    enabled.length > 0
      ? `Whitelist: Only change these mod categories: ${enabled.join(', ')}.`
      : 'No mod categories selected: keep the car visually stock.'

  return `
Treat selected mod categories as a strict whitelist.
${enabledText}
Anything not selected should remain as close as possible to the baseline: windows, trim, badges, grille, vents, body lines, and overall styling.
`.replace(/\s+/g, ' ').trim()
}

export function buildMinimalDisabledLocks(mods: Record<ModId, SelectedModState>): string {
  const bits: string[] = []

  if (!mods.tint?.enabled) {
    bits.push(
      [
        'Tint is not selected: avoid adding tint or darkening any glass.',
        'Windows and windshield should match baseline brightness and interior visibility.',
      ].join(' '),
    )
  }

  if (!mods.chrome_delete?.enabled) {
    bits.push(
      [
        'Chrome delete is not selected: keep chrome/bright trim unchanged.',
        'Avoid black window trim or darkened chrome accents.',
      ].join(' '),
    )
  }

  bits.push(
    [
      'Avoid changing generation cues (bumpers, headlights, taillights, grille design) or body lines.',
      'Avoid adding extra aero or stance changes unless selected.',
    ].join(' '),
  )

  return bits.join(' ')
}

/* ---------- Mods → compact phrase list (for prompt) ---------- */

export function buildModsPrompt(mods: Record<ModId, SelectedModState>): string {
  const parts: string[] = []

  // TINT
  const tint = mods.tint
  if (tint?.enabled && tint.optionId) {
    const map: Record<string, string> = {
      '5': '5% limo tint',
      '20': '20% dark tint',
      '35': '35% medium tint',
      '50': '50% light tint',
      '75': '75% very light tint',
    }
    const level = map[tint.optionId] || ''

    if (level) {
      parts.push(
        `${level} on side windows and rear glass only (avoid tint on the windshield). Glass should look realistic with reflections and faint interior visibility.`,
      )
    }
  }

  // WHEELS
  const wheels = mods.wheels
  if (wheels?.enabled && wheels.optionId) {
    const wheelDesc: Record<string, string> = {
      black_gloss: 'gloss black wheels',
      black_matte: 'matte black wheels',
      silver: 'bright silver / OEM-style wheels',
      chrome: 'high-shine chrome wheels only (avoid changing chrome trim, tint, or badges)',
    }
    const desc = wheelDesc[wheels.optionId] || ''

    if (desc) {
      parts.push(
        `${desc} (keep the same wheel design/spoke pattern; only change wheel color/finish; keep wheel size and tire profile the same)`,
      )
    }
  }

  // SPOILER
  const spoiler = mods.spoiler
  if (spoiler?.enabled && spoiler.optionId) {
    const spoilerDesc: Record<string, string> = {
      lip: 'small trunk lip spoiler',
      ducktail: 'aggressive ducktail trunk spoiler',
    }
    const desc = spoilerDesc[spoiler.optionId] || ''
    if (desc) parts.push(`${desc} (keep trunk shape the same; add spoiler only)`)
  }

  // CHROME DELETE
  const cd = mods.chrome_delete
  if (cd?.enabled && cd.optionId) {
    const finishDesc: Record<string, string> = {
      gloss: 'gloss black chrome delete on window trim',
      satin: 'satin black chrome delete on window trim',
      matte: 'matte black chrome delete on window trim',
    }
    const finish = finishDesc[cd.optionId] || ''
    if (finish) parts.push(`${finish} (only trim; avoid darkening body color)`)
  }

  // CARBON PARTS
  const carbon = mods.carbon
  if (carbon?.enabled && carbon.optionId) {
    const carbonDesc: Record<string, string> = {
      hood_gloss:
        'only the hood converted to glossy carbon fiber with visible weave; keep all other panels unchanged',
      trunk_gloss:
        'only the trunk/boot lid converted to glossy carbon fiber with visible weave; keep all other panels unchanged',
      roof_gloss:
        'only the roof panel converted to glossy carbon fiber with visible weave; keep all other panels unchanged',
      mirrors_gloss:
        'only the mirror housings converted to glossy carbon fiber; keep mirror glass and surrounding panels unchanged',
      frontlip_gloss:
        'only the front lower lip changed to glossy carbon fiber, following the current bumper shape; keep bumper paint and grille unchanged',
      diffuser_gloss:
        'only the rear diffuser area converted to glossy carbon fiber; keep upper bumper, trunk, taillights, and exhaust tips unchanged',
      spoiler_gloss:
        'only the rear spoiler converted to glossy carbon fiber; keep trunk panel, taillights, and bumper unchanged',
    }
    const desc = carbonDesc[carbon.optionId]
    if (desc) parts.push(desc)
  }

  // SUSPENSION
  const suspension = mods.suspension
  if (suspension?.enabled && suspension.optionId) {
    const suspDesc: Record<string, string> = {
      stock: 'factory stock ride height (normal fender gap, avoid extra camber)',
      springs:
        'mildly lowered on springs with a small but visible fender gap (avoid slammed stance)',
      coilovers:
        'lowered on coilovers to a sporty daily stance with a tight but visible fender gap (not slammed)',
      slammed: 'very low stance with minimal fender gap while keeping realistic geometry',
    }
    const desc = suspDesc[suspension.optionId] || ''
    if (desc) {
      parts.push(`${desc}. Keep wheel diameter and tire profile the same; only adjust ride height.`)
    }
  }

  // SPACERS
  const spacers = mods.spacers
  if (spacers?.enabled && spacers.optionId) {
    const spacerDesc: Record<string, string> = {
      mild: 'subtle wheel spacers for a slightly more flush look',
      flush: 'wheel spacers to sit nearly flush with the fenders',
      aggressive: 'aggressive spacers with slight poke while remaining realistic',
    }
    const desc = spacerDesc[spacers.optionId] || ''
    if (desc) parts.push(`${desc}. Keep fitment realistic; avoid exaggerated poke or stretch.`)
  }

  return parts.join(', ')
}

/* ---------- Camera angle helpers ---------- */

export type CameraView = 'front_3_4' | 'rear_3_4'

export function cameraViewToPrompt(view: CameraView): string {
  return view === 'rear_3_4'
    ? '3/4 rear view, single car centered in frame'
    : '3/4 front view, single car centered in frame'
}

export function chooseCameraView(
  userText: string,
  mods: Record<ModId, SelectedModState>,
): CameraView {
  const text = userText.toLowerCase()
  const carbon = mods.carbon

  // Prefer views where the carbon part is visible
  if (carbon?.enabled && carbon.optionId === 'hood_gloss') return 'front_3_4'
  if (
    carbon?.enabled &&
    (carbon.optionId === 'trunk_gloss' ||
      carbon.optionId === 'diffuser_gloss' ||
      carbon.optionId === 'spoiler_gloss')
  ) {
    return 'rear_3_4'
  }

  // If spoiler is selected at all, bias to rear
  if (mods.spoiler?.enabled) return 'rear_3_4'

  const rearKeywords = [
    'diffuser',
    'rear bumper',
    'rear lip',
    'rear valence',
    'trunk',
    'spoiler',
    'ducktail',
    'exhaust',
    'muffler',
    'tail light',
    'taillight',
    'tail lights',
    'rear lights',
  ]

  if (rearKeywords.some((k) => text.includes(k))) return 'rear_3_4'

  return 'front_3_4'
}