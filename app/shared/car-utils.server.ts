// app/shared/car-utils.server.ts
import 'server-only'

export type PromptStyle = 'strict' | 'gemini'

export type BuildFinalPromptArgs = {
  userPrompt: string
  carYear?: string | number | null
  carMake?: string | null
  carModel?: string | null
  qualityMode?: 'ultra' | 'standard' | string | null
  isEdit?: boolean
  // later: mods, view, etc.
  style?: PromptStyle
}

/**
 * Keep this file server-only:
 * - You can import GEN_DB later
 * - You can add resolveFascia/buildGenerationAnchor later
 * For now: keep it SIMPLE and stable.
 */
export function buildFinalPrompt(args: BuildFinalPromptArgs): {
  finalPrompt: string
  negativePrompt: string
  debug: {
    carIdentityText: string
    modifiedRequest: string
    rules: string
    textureHint: string
  }
} {
  const {
    userPrompt,
    carYear,
    carMake,
    carModel,
    qualityMode,
    isEdit = false,
    style = 'strict',
  } = args

  // 1) Basic input safety
  const safeUserPrompt = (userPrompt || '').trim()
  const y = carYear !== undefined && carYear !== null ? Number(carYear) : NaN

  // 2) Build car identity string (SHORT + direct)
  // (We will swap this later with buildGenerationAnchor from GEN_DB.)
  let carIdentityText = ''
  if (carMake && carModel && !Number.isNaN(y) && y > 0) {
    carIdentityText = `Vehicle identity: ${y} ${carMake} ${carModel}. Match the exact factory generation cues for that exact year. Do not blend across years or models.`
  } else if (carMake && carModel) {
    carIdentityText = `Vehicle identity: ${carMake} ${carModel}. Match the exact factory model cues. Do not blend models.`
  } else if (carMake) {
    carIdentityText = `Vehicle identity: ${carMake}.`
  } else {
    carIdentityText = `Vehicle identity: Use accurate factory styling for the selected vehicle.`
  }

  // 3) Smart rewrite / constraints
  // Keep this logic minimal and predictable.
  let modifiedRequest = safeUserPrompt
  const lower = modifiedRequest.toLowerCase()

  const mentionsTint =
    lower.includes('tint') || lower.includes('tinted') || lower.includes('window tint')

  const mentionsWheels =
    lower.includes('wheel') || lower.includes('wheels') || lower.includes('rim')

  const mentionsPaint =
    lower.includes('paint') || lower.includes('color') || lower.includes('colour')

  const mentionsLift =
    lower.includes('lift') || lower.includes('lifted') || lower.includes('raise')

  const mentionsLower =
    lower.includes('lower') || lower.includes('dropped') || lower.includes('drop')

  // When only tint is requested, stop the model from doing anything else
  if (mentionsTint && !mentionsWheels && !mentionsPaint && !(mentionsLift || mentionsLower)) {
    modifiedRequest +=
      ' Apply tint ONLY to the glass window areas. Do not change wheels, paint, trim, headlights, taillights, badges, lighting, background, or camera angle.'
  }

  if (mentionsWheels) {
    modifiedRequest +=
      ' Modify ONLY the wheels and tires. Keep paint color, ride height, windows, background, and camera angle unchanged.'
  }

  if (!mentionsPaint) {
    modifiedRequest += ' Keep the original factory body paint color exactly the same.'
  }

  if (mentionsLift || mentionsLower) {
    modifiedRequest +=
      ' Adjust ONLY the suspension height. Do not change wheels, paint, glass, background, or camera angle.'
  }

  // 4) Global rules (short + enforceable)
  // We will later add GEN_DB anchor ABOVE this.
  const rules = `
Rules:
- Preserve the exact vehicle generation cues (headlights, grille, bumper, body shape, proportions).
- Modify ONLY features explicitly requested.
- Keep the same background, camera angle, and framing (especially for edits).
- Do NOT add text, watermarks, fake badges, fake plates, or invented branding.
- No global filters, no exposure shifts, no color grading.
- Keep reflections realistic and consistent with the scene.
`.trim()

  // 5) Texture hint (simple)
  const textureHint =
    qualityMode === 'ultra'
      ? 'Texture quality: extremely sharp photoreal detail, clean paint reflections, no noise.'
      : 'Texture quality: clean realistic textures, minimal noise, natural reflections.'

  // 6) Build final prompt (tight formatting)
  const header = isEdit ? 'Edit the provided car image.' : 'Generate a photorealistic image of a car.'

  let finalPrompt = `
${header}
${carIdentityText}
${rules}
${textureHint}

User request:
${modifiedRequest}
`
    .replace(/\s+/g, ' ')
    .trim()

  // Optional: Gemini-safe tone later. For now do nothing.
  if (style === 'gemini') {
    finalPrompt = finalPrompt
      .replace(/Do NOT/gi, 'Avoid')
      .replace(/Do not/gi, 'Avoid')
  }

  // 7) Negative prompt
  // IMPORTANT: “logo” is dangerous because Audis/Hondas have logos. Don’t nuke logos globally.
  const negativePrompt = [
    'watermark',
    'text overlay',
    'UI elements',
    'blurry',
    'artifacts',
    'noise',
    'distorted proportions',
    'duplicate car',
    'extra headlights',
    'extra wheels',
    'melted wheels',
    'deformed badge text',
  ].join(', ')

  return {
    finalPrompt,
    negativePrompt,
    debug: { carIdentityText, modifiedRequest, rules, textureHint },
  }
}