/* ---------- CLIENT-SAFE SHARED UTILS ---------- */

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

export type BodyStyleHint = 'coupe' | 'sportback' | 'sedan' | 'cabriolet' | 'wagon' | null

export type CameraView = 'front_3_4' | 'rear_3_4'

/* ---------- Normalizers ---------- */

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
    'allroad',
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

/* ---------- Body style detection and locking (client-safe) ---------- */

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

/* ---------- Camera angle helpers (client-safe) ---------- */

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