// app/shared/generation-specs.ts
// Lightweight “generation DB” used to anchor prompts so Imagen keeps the correct year/generation.
// Keep this file pure/portable (no server-only imports). It can be used in both client and server code.

export type CameraPreset =
  | 'wide_front_3_4_full_car'
  | 'wide_rear_3_4_full_car'
  | 'front_3_4'
  | 'rear_3_4'
  | 'front'
  | 'rear'

export type BodyStyle = 'sedan' | 'coupe' | 'suv' | 'hatch' | 'wagon' | 'convertible'

export type GenerationSpec = {
  make: string
  model: string
  yearStart: number
  yearEnd: number

  // Human label for debugging
  generationName: string

  // Optional disambiguation
  bodyStyle?: BodyStyle

  // Default camera for “stock car” generation
  cameraPreset: CameraPreset

  // High-signal cues that SHOULD remain consistent for this gen
  anchors: string[]

  // Explicit anti-drift constraints
  negatives: string[]

  // Helpful defaults to reduce hallucinations (esp. interiors/colors)
  defaults?: {
    interior: 'black'
    plates: 'blank'
    badges: 'keep_oem'
    environment: 'simple_studio'
  }
}

/**
 * IMPORTANT RULES FOR ADDING SPECS
 * - Keep anchors factual + visual (headlight shape, grille outline, bumper cut lines, body proportion).
 * - Keep negatives strict (prevent wrong gen, wrong body style, wrong trim swap).
 * - Avoid mentioning “license plate” (safety filters can be touchy). Use “blank front area” wording.
 */

export const GENERATION_SPECS: GenerationSpec[] = [
  // -----------------------------
  // AUDI A4 (B9.5 facelift)
  // -----------------------------
  {
    make: 'Audi',
    model: 'A4',
    yearStart: 2020,
    yearEnd: 2024,
    generationName: 'B9.5 facelift (US 2020–2024)',
    bodyStyle: 'sedan',
    cameraPreset: 'wide_front_3_4_full_car',
    defaults: {
      interior: 'black',
      plates: 'blank',
      badges: 'keep_oem',
      environment: 'simple_studio',
    },
    anchors: [
      // Identity anchors
      'Subject is a production Audi A4 sedan (not S4/RS4).',
      'Use 2020–2024 Audi A4 (B9.5 facelift) front-end cues: slim headlight housings with modern DRL signature and sharp inner corners.',
      'Singleframe grille outline and proportions consistent with B9.5: wide hex outline, clean perimeter frame, no oversized RS honeycomb exaggeration.',
      'Bumper cut lines: large side intakes with distinct lower bumper lip; avoid older rounded B8-era bumper shapes.',
      // Proportions
      'Sedan proportions: 4 doors, short rear deck, balanced wheelbase; avoid fastback/sportback roofline.',
      // Interior stability
      'Interior should read as neutral black/dark; do not introduce bright/red seat colors unless explicitly requested.',
      // Branding stability
      'Keep OEM emblem shapes consistent and clean; do not invent additional text or markings.',
    ],
    negatives: [
      // Gen drift
      'Do NOT use B8/B8.5 A4 headlight shapes or grille.',
      'Do NOT swap to Audi A5 Sportback or coupe body shape.',
      // Trim drift
      'Do NOT change into S4/RS4 bumper, grille, or exaggerated aero unless explicitly requested.',
      // Random drift
      'Do NOT add random decals, watermarks, extra lighting elements, or any readable text.',
    ],
  },

  // -----------------------------
  // HONDA ACCORD (11th gen)
  // (Useful because you were testing Accord earlier)
  // -----------------------------
  {
    make: 'Honda',
    model: 'Accord',
    yearStart: 2023,
    yearEnd: 2025,
    generationName: '11th gen Accord (2023–2025)',
    bodyStyle: 'sedan',
    cameraPreset: 'wide_front_3_4_full_car',
    defaults: {
      interior: 'black',
      plates: 'blank',
      badges: 'keep_oem',
      environment: 'simple_studio',
    },
    anchors: [
      'Subject is a production Honda Accord sedan (11th gen, 2023+).',
      'Front end cues: wide horizontal grille and slim headlight housings; overall restrained, clean design (not aggressive aftermarket).',
      'Body lines: long, clean shoulder line; avoid older 10th-gen sharper/overly sporty creases.',
      'Sedan roofline and trunk: conventional sedan profile; avoid liftback fastback silhouettes.',
      'Interior should remain dark/black; avoid red seats unless requested.',
      'Keep manufacturer emblem shapes intact; avoid inventing text.',
    ],
    negatives: [
      'Do NOT generate a 2018–2022 Accord (10th gen) fascia/headlights.',
      'Do NOT morph into Civic/Integra proportions.',
      'Do NOT add readable text or markings.',
    ],
  },

  // -----------------------------
  // MERCEDES C-CLASS / C43 AMG
  // (Two distinct generations; dropdowns often confuse these)
  // -----------------------------

  // W205 facelift era (2019–2021) — C43 AMG exists here
  {
    make: 'Mercedes-Benz',
    model: 'C43 AMG',
    yearStart: 2019,
    yearEnd: 2021,
    generationName: 'W205 facelift C43 AMG (2019–2021)',
    bodyStyle: 'sedan',
    cameraPreset: 'wide_front_3_4_full_car',
    defaults: {
      interior: 'black',
      plates: 'blank',
      badges: 'keep_oem',
      environment: 'simple_studio',
    },
    anchors: [
      'Subject is a production Mercedes-AMG C43 sedan (W205 facelift era).',
      'W205 proportions: compact sedan stance, not the newer W206 larger/taller feel.',
      'Headlights: W205 facelift headlamp shape with clean LED signatures; avoid W206’s newer, narrower, more angular lamp geometry.',
      'Grille: AMG-style grille proportions for C43 (do not oversize or add extreme GT grille styling).',
      'Keep interior dark/black unless explicitly requested; do not introduce bright red seats by default.',
      'Keep emblem shapes clean; avoid invented text/markings.',
    ],
    negatives: [
      'Do NOT generate W206 C-Class headlights/bumper.',
      'Do NOT convert to C63 widebody or extreme aero.',
      'Do NOT add readable text/markings.',
    ],
  },

  // W206 era (2022+) — “C43” exists here too, but different body/front end
  {
    make: 'Mercedes-Benz',
    model: 'C43 AMG',
    yearStart: 2022,
    yearEnd: 2025,
    generationName: 'W206 C43 AMG (2022–2025)',
    bodyStyle: 'sedan',
    cameraPreset: 'wide_front_3_4_full_car',
    defaults: {
      interior: 'black',
      plates: 'blank',
      badges: 'keep_oem',
      environment: 'simple_studio',
    },
    anchors: [
      'Subject is a production Mercedes-AMG C43 sedan (W206).',
      'W206 proportions: slightly cleaner surfacing and more modern body sections than W205; avoid W205 silhouette.',
      'Headlights: W206 headlamp geometry (newer, more angular) with modern DRL signature.',
      'Front bumper and grille should match W206 AMG C43 styling (sporty but not C63 widebody).',
      'Interior should remain dark/black; avoid red seats unless requested.',
      'Keep emblem shapes intact; avoid invented text/markings.',
    ],
    negatives: [
      'Do NOT generate W205 facelift headlights/bumper.',
      'Do NOT convert into C63 widebody or add extreme aero.',
      'Do NOT add readable text/markings.',
    ],
  },
]

// Small helper map for camera prompts (kept here so it’s close to the presets)
export function cameraPresetToPrompt(preset: CameraPreset): string {
  switch (preset) {
    case 'wide_front_3_4_full_car':
      return 'wide 3/4 front view, full car visible, both wheels visible, centered in frame'
    case 'wide_rear_3_4_full_car':
      return 'wide 3/4 rear view, full car visible, both wheels visible, centered in frame'
    case 'front_3_4':
      return '3/4 front view, car centered in frame'
    case 'rear_3_4':
      return '3/4 rear view, car centered in frame'
    case 'front':
      return 'front view, car centered in frame'
    case 'rear':
      return 'rear view, car centered in frame'
    default:
      return '3/4 front view, car centered in frame'
  }
}
