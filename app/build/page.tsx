"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { useRouter } from "next/navigation";

/* ---------- Types for MakeItRealCard mapping ---------- */

type CardSelectedMods = {
  wheels?: string
  suspension?: string
  exhaust?: string
  tint?: string
  aero?: string
  spacers?: string
}

/* ---------- Mod selector types & config ---------- */

type ModId =
  | 'tint'
  | 'wheels'
  | 'spoiler'
  | 'chrome_delete'
  | 'carbon'
  | 'suspension'
  | 'spacers'

type ModPackId = 'oem_plus' | 'slammed' | 'track' | 'street_monster'

type ModOption = {
  id: string
  label: string
}

type Mod = {
  id: ModId
  label: string
  description: string
  options: ModOption[]
}

type SelectedModState = {
  enabled: boolean
  optionId: string | null
}

// Years for dropdown (1990–2025)
const YEAR_OPTIONS = Array.from({ length: 36 }, (_, i) => 2025 - i)

const MODS: Mod[] = [
  {
    id: 'tint',
    label: 'Window Tint',
    description: 'Darken your side and rear windows.',
    options: [
      { id: '5', label: '5% (limo)' },
      { id: '20', label: '20% (dark)' },
      { id: '35', label: '35% (medium)' },
      { id: '50', label: '50% (light)' },
      { id: '75', label: '75% (very light)' },
    ],
  },
  {
    id: 'wheels',
    label: 'Wheels',
    description: 'Change the style/color of your wheels.',
    options: [
      { id: 'black_gloss', label: 'Black (gloss)' },
      { id: 'black_matte', label: 'Black (matte)' },
      { id: 'silver', label: 'Silver / OEM' },
      { id: 'chrome', label: 'Chrome (high-shine)' },
    ],
  },
  {
    id: 'spoiler',
    label: 'Spoiler',
    description: 'Add a lip or ducktail spoiler.',
    options: [
      { id: 'lip', label: 'Small lip' },
      { id: 'ducktail', label: 'Ducktail' },
    ],
  },
  {
    id: 'chrome_delete',
    label: 'Chrome Delete',
    description: 'Black out your chrome trim.',
    options: [
      { id: 'gloss', label: 'Gloss black' },
      { id: 'satin', label: 'Satin black' },
      { id: 'matte', label: 'Matte black' },
    ],
  },
  {
    id: 'carbon',
    label: 'Carbon Parts',
    description: 'Add carbon fiber to specific panels.',
    options: [
      { id: 'hood_gloss', label: 'Carbon hood (gloss)' },
      { id: 'trunk_gloss', label: 'Carbon trunk (gloss)' },
      { id: 'roof_gloss', label: 'Carbon roof (gloss)' },
      { id: 'mirrors_gloss', label: 'Carbon mirrors' },
      { id: 'frontlip_gloss', label: 'Carbon front lip' },
      { id: 'diffuser_gloss', label: 'Carbon rear diffuser' },
      { id: 'spoiler_gloss', label: 'Carbon spoiler' },
    ],
  },
  {
    id: 'suspension',
    label: 'Ride Height',
    description: 'Lower the car for a better stance.',
    options: [
      { id: 'stock', label: 'Stock height' },
      { id: 'springs', label: 'Lowering springs (-1" to -1.5")' },
      { id: 'coilovers', label: 'Coilovers (-2" to -3")' },
      { id: 'slammed', label: 'Slammed / show car' },
    ],
  },
  {
    id: 'spacers',
    label: 'Spacers',
    description: 'Push wheels outward for a flush fitment.',
    options: [
      { id: 'mild', label: 'Mild (5–8mm, subtle flush)' },
      { id: 'flush', label: 'Flush (10–15mm, aggressive street)' },
      { id: 'aggressive', label: 'Aggressive (20mm+, show stance)' },
    ],
  },
]

// presets for the packs (IDs line up with MODS options)
const PACK_PRESETS: Record<ModPackId, Partial<Record<ModId, string>>> = {
  oem_plus: {
    tint: '35',
    suspension: 'springs',
    spacers: 'mild',
    spoiler: 'lip',
    wheels: 'silver',
  },
  slammed: {
    tint: '5', // slammed = 5% limo
    suspension: 'slammed',
    spacers: 'aggressive',
    spoiler: 'ducktail',
    wheels: 'chrome',
    chrome_delete: 'gloss',
  },
  track: {
    tint: '50',
    suspension: 'coilovers',
    spacers: 'flush',
    wheels: 'silver',
    spoiler: 'lip',
  },
  street_monster: {
    tint: '5',
    suspension: 'coilovers',
    spacers: 'aggressive',
    wheels: 'black_gloss',
    spoiler: 'ducktail',
    chrome_delete: 'satin',
    carbon: 'frontlip_gloss',
  },
}

/* ---------- Mods → compact phrase list (for prompt) ---------- */

function buildModsPrompt(mods: Record<ModId, SelectedModState>): string {
  const parts: string[] = []

  // TINT
  const tint = mods.tint
  if (tint?.enabled && tint.optionId) {
    let level = ''
    if (tint.optionId === '5') level = '5% limo tint'
    else if (tint.optionId === '20') level = '20% dark tint'
    else if (tint.optionId === '35') level = '35% medium tint'
    else if (tint.optionId === '50') level = '50% light tint'
    else if (tint.optionId === '75') level = '75% very light tint'

    parts.push(
      `${level} on side windows and rear glass (only glass, no body panels changed)`,
    )
  }

  // WHEELS
  const wheels = mods.wheels
  if (wheels?.enabled && wheels.optionId) {
    let desc = ''
    if (wheels.optionId === 'black_gloss') desc = 'gloss black wheels'
    else if (wheels.optionId === 'black_matte') desc = 'matte black wheels'
    else if (wheels.optionId === 'silver') desc = 'bright silver / OEM-style wheels'
    else if (wheels.optionId === 'chrome') desc = 'high-shine chrome wheels'

    parts.push(
      `${desc} (only wheel finish, keep wheel size and tire size identical)`,
    )
  }

  // SPOILER
  const spoiler = mods.spoiler
  if (spoiler?.enabled && spoiler.optionId) {
    let desc = ''
    if (spoiler.optionId === 'lip') desc = 'small trunk lip spoiler'
    else if (spoiler.optionId === 'ducktail') desc = 'aggressive ducktail trunk spoiler'

    parts.push(`${desc} (keep trunk shape the same, just add spoiler)`)
  }

  // CHROME DELETE
  const cd = mods.chrome_delete
  if (cd?.enabled && cd.optionId) {
    let finish = ''
    if (cd.optionId === 'gloss') finish = 'gloss black chrome delete on window trim'
    else if (cd.optionId === 'satin') finish = 'satin black chrome delete on window trim'
    else if (cd.optionId === 'matte') finish = 'matte black chrome delete on window trim'

    parts.push(`${finish} (only chrome trim, do not darken body color)`)
  }

  // CARBON PARTS
  const carbon = mods.carbon
  if (carbon?.enabled && carbon.optionId) {
    let desc = ''

    if (carbon.optionId === 'hood_gloss') {
      desc =
        'only the front hood panel converted to a glossy carbon-fiber hood with visible weave; do NOT change the trunk, roof, doors, bumpers, fenders, wheels, or glass'
    } else if (carbon.optionId === 'trunk_gloss') {
      desc =
        'only the trunk/boot lid converted to glossy carbon fiber with visible weave; do NOT change the hood, roof, doors, bumpers, wheels, or glass'
    } else if (carbon.optionId === 'roof_gloss') {
      desc =
        'only the roof panel between the pillars converted to glossy carbon fiber; do NOT change the hood, trunk, doors, bumpers, wheels, or glass'
    } else if (carbon.optionId === 'mirrors_gloss') {
      desc =
        'only the side mirror housings converted to glossy carbon fiber; keep mirror glass and surrounding panels untouched'
    } else if (carbon.optionId === 'frontlip_gloss') {
      desc =
        'only the front lower lip/spoiler changed to glossy carbon fiber, following the current bumper shape; do NOT change bumper color, grille, or wheels'
    } else if (carbon.optionId === 'diffuser_gloss') {
      desc =
        'only the rear diffuser area around the exhaust converted to glossy carbon fiber; do NOT change the upper bumper, trunk, taillights, or exhaust tips'
    } else if (carbon.optionId === 'spoiler_gloss') {
      desc =
        'only the rear spoiler converted to glossy carbon fiber; keep trunk panel, taillights, and bumper identical'
    }

    if (desc) parts.push(desc)
  }

  // SUSPENSION / RIDE HEIGHT
  const suspension = mods.suspension
  if (suspension?.enabled && suspension.optionId) {
    let desc = ''
    if (suspension.optionId === 'stock') {
      desc =
        'factory stock ride height (no lowering, normal fender gap, no extra camber)'
    } else if (suspension.optionId === 'springs') {
      desc =
        'lowered approximately 1–1.5 inches using lowering springs (mild drop, daily-drivable stance, slight tire-to-fender gap)'
    } else if (suspension.optionId === 'coilovers') {
      desc =
        'lowered approximately 2–3 inches on adjustable coilovers with a sporty street stance and tight but realistic fender gap'
    } else if (suspension.optionId === 'slammed') {
      desc =
        'very low “slammed” show-car stance with minimal fender gap, wheels sitting very close to the fender while still looking realistic'
    }

    if (desc) {
      parts.push(
        `${desc}. Do not change wheel diameter or tire profile; only adjust suspension height and subtle camber if appropriate.`,
      )
    }
  }

  // SPACERS
  const spacers = mods.spacers
  if (spacers?.enabled && spacers.optionId) {
    let desc = ''
    if (spacers.optionId === 'mild') {
      desc =
        'subtle wheel spacers that push each wheel slightly outward for a mild flush look'
    } else if (spacers.optionId === 'flush') {
      desc =
        'wheel spacers that push each wheel out to be nearly flush with the fenders for a strong stance'
    } else if (spacers.optionId === 'aggressive') {
      desc =
        'aggressive wheel spacers that push the wheels close to the fender edge, with slight poke but still realistic'
    }

    if (desc) {
      parts.push(
        `${desc}. Keep tire width and sidewall realistic; do not exaggerate poke or stretch beyond believable street fitment.`,
      )
    }
  }

  return parts.join(', ')
}

/* ---------- Camera angle helpers ---------- */

type CameraView = 'front_3_4' | 'rear_3_4'

function cameraViewToPrompt(view: CameraView): string {
  return view === 'rear_3_4'
    ? '3/4 rear view, single car centered in frame'
    : '3/4 front view, single car centered in frame'
}

function chooseCameraView(
  userText: string,
  mods: Record<ModId, SelectedModState>,
): CameraView {
  const text = userText.toLowerCase()
  const carbon = mods.carbon

  // Hard rules for carbon panels so the right side is visible
  if (carbon?.enabled && carbon.optionId === 'hood_gloss') {
    return 'front_3_4'
  }

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

  if (rearKeywords.some((k) => text.includes(k))) {
    return 'rear_3_4'
  }

  // Default: front 3/4
  return 'front_3_4'
}

/* ---------- Library + car selector config ---------- */

type LibraryItem = {
  id: string
  prompt: string
  originalImage: string | null
  resultImage: string
  createdAt: string
}

type CarOption = {
  make: string
  models: string[]
}

const carOptions: CarOption[] = [
  {
    make: 'Audi',
    models: [
      'A3',
      'S3',
      'RS3',
      'A4',
      'S4',
      'RS4',
      'A5',
      'S5',
      'RS5',
      'A6',
      'S6',
      'RS6',
      'A7',
      'S7',
      'RS7',
      'Q3',
      'Q5',
      'Q7',
      'Q8',
      'TT',
      'TTS',
      'TT RS',
    ],
  },
  {
    make: 'BMW',
    models: [
      '2 Series',
      'M2',
      '3 Series',
      'M3',
      '4 Series',
      'M4',
      '5 Series',
      'M5',
      '7 Series',
      'X1',
      'X3',
      'X3 M',
      'X5',
      'X5 M',
      'Z4',
    ],
  },
  {
    make: 'Mercedes-Benz',
    models: [
      'A-Class',
      'CLA',
      'C-Class',
      'C43',
      'C63',
      'E-Class',
      'E53',
      'E63',
      'S-Class',
      'GLA',
      'GLC',
      'GLE',
      'AMG GT',
    ],
  },
  {
    make: 'Volkswagen',
    models: ['Golf', 'GTI', 'Golf R', 'Jetta', 'GLI', 'Passat', 'Tiguan', 'Atlas'],
  },
  {
    make: 'Honda',
    models: ['Civic', 'Civic Si', 'Civic Type R', 'Accord', 'Integra', 'CR-V', 'HR-V'],
  },
  {
    make: 'Toyota',
    models: [
      'Corolla',
      'Corolla Hatchback',
      'Camry',
      'Camry TRD',
      'GR86',
      'Supra',
      'RAV4',
      'RAV4 Prime',
      'Tacoma',
      'Tundra',
      '4Runner',
    ],
  },
  {
    make: 'Nissan',
    models: ['Altima', 'Maxima', 'Sentra SR', '370Z', '400Z', 'GT-R', 'Rogue'],
  },
  {
    make: 'Subaru',
    models: ['Impreza', 'WRX', 'WRX STI', 'BRZ', 'Forester', 'Outback'],
  },
  {
    make: 'Hyundai',
    models: [
      'Elantra',
      'Elantra N',
      'Sonata',
      'Sonata N Line',
      'Veloster N',
      'Kona',
      'Kona N',
      'Tucson',
    ],
  },
  {
    make: 'Kia',
    models: ['Forte GT', 'Stinger', 'K5 GT', 'Soul', 'Seltos', 'Sportage'],
  },
  {
    make: 'Ford',
    models: [
      'Mustang',
      'Mustang GT',
      'Shelby GT350',
      'Shelby GT500',
      'Focus ST',
      'Focus RS',
      'Fiesta ST',
      'F-150',
      'F-150 Raptor',
      'Bronco',
    ],
  },
  {
    make: 'Chevrolet',
    models: [
      'Camaro',
      'Camaro SS',
      'Camaro ZL1',
      'Corvette Stingray',
      'Corvette Z06',
      'Malibu',
      'Silverado',
      'Trailblazer',
    ],
  },
  {
    make: 'Dodge',
    models: [
      'Charger',
      'Charger Scat Pack',
      'Charger Hellcat',
      'Challenger',
      'Challenger Scat Pack',
      'Challenger Hellcat',
      'Durango',
      'Durango SRT',
    ],
  },
  {
    make: 'Jeep',
    models: [
      'Wrangler',
      'Wrangler Rubicon',
      'Gladiator',
      'Grand Cherokee',
      'Grand Cherokee SRT',
      'Cherokee',
    ],
  },
  {
    make: 'Mazda',
    models: ['Mazda3', 'Mazda6', 'MX-5 Miata', 'CX-30', 'CX-5', 'CX-50'],
  },
  {
    make: 'Lexus',
    models: ['IS 300', 'IS 350', 'IS 500', 'RC 350', 'RC F', 'GS 350', 'RX 350', 'NX 350'],
  },
  {
    make: 'Infiniti',
    models: ['Q50', 'Q50 Red Sport', 'Q60', 'QX50'],
  },
  {
    make: 'Acura',
    models: ['Integra', 'TLX', 'TLX Type S', 'ILX', 'RDX', 'MDX'],
  },
  {
    make: 'Tesla',
    models: ['Model 3', 'Model Y', 'Model S', 'Model X'],
  },
  {
    make: 'Porsche',
    models: [
      '911 Carrera',
      '911 Turbo',
      '911 GT3',
      'Cayman',
      'Cayman GT4',
      'Boxster',
      'Panamera',
      'Macan',
      'Cayenne',
    ],
  },
]

/* ---------- Page component ---------- */

export default function BuildPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  const [prompt, setPrompt] = useState('')
  const [inputImage, setInputImage] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  const [carMake, setCarMake] = useState('')
  const [carModel, setCarModel] = useState('')
  const [carYear, setCarYear] = useState('')
  const [carColor, setCarColor] = useState<string>('')

  const [qualityMode, setQualityMode] = useState<'standard' | 'ultra'>('standard')

  const [activeModId, setActiveModId] = useState<ModId | null>(null)
  const [selectedMods, setSelectedMods] = useState<Record<ModId, SelectedModState>>({
    tint: { enabled: false, optionId: null },
    wheels: { enabled: false, optionId: null },
    spoiler: { enabled: false, optionId: null },
    chrome_delete: { enabled: false, optionId: null },
    carbon: { enabled: false, optionId: null },
    suspension: { enabled: false, optionId: null },
    spacers: { enabled: false, optionId: null },
  })

  const [autoStockAttempted, setAutoStockAttempted] = useState(false)
  const [showCompare, setShowCompare] = useState(false)

  const [packInitialized, setPackInitialized] = useState(false)

  const router = useRouter()


  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const size = 1024
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.fillStyle = 'black'
        ctx.fillRect(0, 0, size, size)

        const ratio = Math.min(size / img.width, size / img.height)
        const newWidth = img.width * ratio
        const newHeight = img.height * ratio
        const offsetX = (size - newWidth) / 2
        const offsetY = (size - newHeight) / 2

        ctx.drawImage(img, offsetX, offsetY, newWidth, newHeight)
        const pngDataUrl = canvas.toDataURL('image/png')

        setInputImage(pngDataUrl)
        setBeforeUrl(null)
        setImageUrl(null)
        setShowCompare(false)
        setAutoStockAttempted(false)
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  }

  function saveToLibrary(resultUrl: string) {
    try {
      if (typeof window === 'undefined') return

      const raw = window.localStorage.getItem('carcrafter_library')
      const prev: LibraryItem[] = raw ? JSON.parse(raw) : []

      const item: LibraryItem = {
        id: crypto.randomUUID(),
        prompt,
        originalImage: inputImage ?? beforeUrl,
        resultImage: resultUrl,
        createdAt: new Date().toISOString(),
      }

      const next = [item, ...prev].slice(0, 10)
      window.localStorage.setItem('carcrafter_library', JSON.stringify(next))
    } catch (err: any) {
      if (typeof window !== 'undefined' && err?.name === 'QuotaExceededError') {
        console.warn('Storage full, clearing Car Crafter library')
        window.localStorage.removeItem('carcrafter_library')
      } else {
        console.error('Failed to save to library', err)
      }
    }
  }

  function handleSaveCurrent() {
    if (!imageUrl) return
    saveToLibrary(imageUrl)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2000)
  }

  /* ---------- Apply mod packs from query param ---------- */
  useEffect(() => {
    if (packInitialized) return

    const packParam = searchParams.get('pack') as ModPackId | null
    if (!packParam) return

    const preset = PACK_PRESETS[packParam]
    if (!preset) return

    setSelectedMods((prev) => {
      const next = { ...prev }
      ;(Object.keys(preset) as ModId[]).forEach((modId) => {
        const optionId = preset[modId]
        if (!optionId) return
        next[modId] = { enabled: true, optionId }
      })
      return next
    })

    if (!prompt.trim()) {
      if (packParam === 'slammed') {
        setPrompt(
          'Full slammed street build: 5% tint, ultra low stance, aggressive spacers, fancy wheels, maybe some carbon bits. Make it look like a clean but wild show car that still feels realistic.',
        )
      } else if (packParam === 'oem_plus') {
        setPrompt(
          'OEM+ daily build: mild drop on springs, subtle tint, silver wheels, small lip spoiler. Clean, factory-plus look.',
        )
      } else if (packParam === 'track') {
        setPrompt(
          'Track-ready setup: functional coilover height, flush spacers, light tint, subtle aero that looks like it belongs at a time-attack event.',
        )
      } else if (packParam === 'street_monster') {
        setPrompt(
          'Loud street monster: low, aggressive stance, 5% tint, aggressive spacers, black or chrome wheels, and bold aero that turns heads at night.',
        )
      }
    }

    setStep((prev) => (prev < 2 ? 2 : prev))
    setPackInitialized(true)
  }, [searchParams, packInitialized, prompt])

  // ---------- AUTO STOCK GENERATION (no upload) ----------
  useEffect(() => {
    if (inputImage) return
    if (beforeUrl) return
    if (!carMake || !carModel || !carYear) return
    if (autoStockAttempted) return

    setAutoStockAttempted(true)

    const run = async () => {
      try {
        let carDesc = ''
        if (carMake && carModel && carYear) carDesc = `${carYear} ${carMake} ${carModel}`
        else if (carMake && carModel) carDesc = `${carMake} ${carModel}`
        else if (carMake) carDesc = carMake

        const lowerPrompt = prompt.trim().toLowerCase()
        const wantsBlackout =
          lowerPrompt.includes('black out everything') ||
          lowerPrompt.includes('blackout everything') ||
          lowerPrompt.includes('black out') ||
          lowerPrompt.includes('blackout') ||
          lowerPrompt.includes('murdered out') ||
          lowerPrompt.includes('murdered-out') ||
          lowerPrompt.includes('all black') ||
          lowerPrompt.includes('full blackout') ||
          lowerPrompt.includes('full black out') ||
          lowerPrompt.includes('stealth look')

        let colorInstructions = ''

        if (wantsBlackout) {
          colorInstructions =
            'Paint the entire car in solid glossy or satin black (full blackout / murdered-out look), including all visible body panels, while keeping realistic reflections and panel definition.'
        } else if (!carColor) {
          colorInstructions =
            'Keep the car’s paint color consistent with the original image or stock render. Do not recolor the body unless the user explicitly asks for a different color.'
        } else {
          const normalized = carColor === 'silver' ? 'silver/grey' : carColor.toLowerCase()
          const colorMap: Record<string, string> = {
            black: 'solid glossy black paint',
            white: 'clean solid white paint',
            'silver/grey': 'metallic silver/grey paint',
            blue: 'deep blue paint',
            red: 'bright red paint',
          }
          const colorDesc = colorMap[normalized] ?? carColor
          colorInstructions = `Paint color: ${colorDesc}. Do not change it unless the user explicitly asks for a different color.`
        }

        const cameraView = chooseCameraView(prompt, selectedMods)
        const cameraViewPrompt = cameraViewToPrompt(cameraView)

        const qualityAppend =
          qualityMode === 'ultra'
            ? 'Extra focus on sharp details, realistic reflections in paint and glass, clean panel gaps, and subtle film-like grain for a true-photo look.'
            : 'Keep everything looking like a real photo, not a render or cartoon.'

        const stockPrompt = `
          Ultra-realistic stock photo of a ${carDesc || 'modern car'} in ${cameraViewPrompt}.
          Factory ride height, factory bodywork, OEM wheels, no aftermarket mods.
          Clean real-world background and lighting.
          ${colorInstructions}
          Do not add tint, body kits, aftermarket wheels, or other modifications.
          No random text, fake brand names, or watermarks in the image.
          ${qualityAppend}
        `
          .replace(/\s+/g, ' ')
          .trim()

        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: stockPrompt,
            imageDataUrl: null,
            qualityMode,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          console.error(data.error || 'Auto stock generation failed')
          return
        }

        setBeforeUrl(data.url)
      } catch (err) {
        console.error('Auto stock generation error', err)
      }
    }

    run()
  }, [
    inputImage,
    beforeUrl,
    carMake,
    carModel,
    carYear,
    carColor,
    prompt,
    qualityMode,
    autoStockAttempted,
    selectedMods,
  ])

  // ---------- GENERATE HANDLER ----------
  async function handleGenerate() {
    const usingUploadedPhoto = Boolean(inputImage)
    const hasConceptBefore = Boolean(beforeUrl)
    const hasTextPrompt = Boolean(prompt.trim())
    const hasAnyModsSelected = Object.values(selectedMods).some((m) => m.enabled)

    if ((usingUploadedPhoto || hasConceptBefore) && !hasTextPrompt && !hasAnyModsSelected) {
      setError('Please enter a description or select at least one mod.')
      return
    }

    setLoading(true)
    setError(null)
    setImageUrl(null)
    setJustSaved(false)
    setShowCompare(false)

    let carDesc = ''
    if (carMake && carModel && carYear) carDesc = `${carYear} ${carMake} ${carModel}`
    else if (carMake && carModel) carDesc = `${carMake} ${carModel}`
    else if (carMake) carDesc = carMake

    const lowerPrompt = prompt.trim().toLowerCase()
    const wantsBlackout =
      lowerPrompt.includes('black out everything') ||
      lowerPrompt.includes('blackout everything') ||
      lowerPrompt.includes('black out') ||
      lowerPrompt.includes('blackout') ||
      lowerPrompt.includes('murdered out') ||
      lowerPrompt.includes('murdered-out') ||
      lowerPrompt.includes('all black') ||
      lowerPrompt.includes('full blackout') ||
      lowerPrompt.includes('full black out') ||
      lowerPrompt.includes('stealth look')

    let colorInstructions = ''

    if (wantsBlackout) {
      colorInstructions =
        'Paint the entire car in solid glossy or satin black (full blackout / murdered-out look), including all visible body panels, while keeping realistic reflections and panel definition.'
    } else if (!carColor) {
      colorInstructions =
        'Keep the car’s paint color consistent with the original image or stock render. Do not recolor the body unless the user explicitly asks for a different color.'
    } else {
      const normalized = carColor === 'silver' ? 'silver/grey' : carColor.toLowerCase()
      const colorMap: Record<string, string> = {
        black: 'solid glossy black paint',
        white: 'clean solid white paint',
        'silver/grey': 'metallic silver/grey paint',
        blue: 'deep blue paint',
        red: 'bright red paint',
      }
      const colorDesc = colorMap[normalized] ?? carColor
      colorInstructions = `Paint color: ${colorDesc}. Do not change it unless the user explicitly asks for a different color.`
    }

    const cameraView = chooseCameraView(prompt, selectedMods)
    const cameraViewPrompt = cameraViewToPrompt(cameraView)

    const quickModsText = buildModsPrompt(selectedMods)

    const qualityAppend =
      qualityMode === 'ultra'
        ? 'Extra focus on sharp details, realistic reflections in paint and glass, clean panel gaps, and subtle film-like grain for a true-photo look.'
        : 'Keep everything looking like a real photo, not a render or cartoon.'

    // ---------- BRANCH 1: USER UPLOADED PHOTO ----------
    if (usingUploadedPhoto) {
      const userText = prompt.trim()
      const combinedMods = [userText, quickModsText].filter(Boolean).join(', ').trim()
      const hasExplicitMods = Boolean(combinedMods)

      const carLine = carDesc
        ? `Edit the uploaded photo of a ${carDesc}.`
        : 'Edit the uploaded photo of the car.'

      const editingPrompt = `
        Ultra-realistic photo edit of the SAME car as in the uploaded image.
        ${carLine}
        Keep the exact same camera angle and composition as the original photo.
        Preserve the same generation, body shape, panel gaps, reflections, shadows, wheel and tire sizes, and background.
        Only modify the specific parts mentioned in the modifications list below; keep all other body panels, lights, and glass identical to the original.
        If a requested part is not visible in the frame (for example the hood in a pure rear view), leave that part and all surrounding panels completely unchanged instead of guessing.
        ${colorInstructions}
        Apply ${
          hasExplicitMods
            ? 'EXACTLY these modifications (no additional changes):'
            : 'subtle OEM+ style street mods that suit this car:'
        }
        ${
          combinedMods ||
          'lowered stance, mild aero, tasteful wheels, and tint that look factory-plus, not overdone.'
        }
        Do NOT change the car into a different model or year.
        Preserve all manufacturer and model logos, emblems, and badges EXACTLY as they appear in the original photo.
        Do NOT invent, alter, or hallucinate any text, numbers, or lettering on the car, license plate, or background.
        Do NOT add extra cars, people, watermarks, stickers, or text overlays.
        ${qualityAppend}
      `
        .replace(/\s+/g, ' ')
        .trim()

      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: editingPrompt,
            imageDataUrl: inputImage,
            qualityMode,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Something went wrong')
          return
        }

        setImageUrl(data.url)
      } catch (err) {
        console.error(err)
        setError('Server error')
      } finally {
        setLoading(false)
      }
      return
    }

    // ---------- BRANCH 2: NO UPLOAD, NO BEFORE YET ----------
    if (!usingUploadedPhoto && !hasConceptBefore) {
      const stockPrompt = `
        Ultra-realistic stock photo of a ${carDesc || 'modern car'} in ${cameraViewPrompt}.
        Factory ride height, factory bodywork, OEM wheels, no aftermarket mods.
        Clean real-world background and lighting.
        ${colorInstructions}
        Do not add tint, body kits, aftermarket wheels, or other modifications.
        No random text, fake brand names, or watermarks in the image.
        ${qualityAppend}
      `
        .replace(/\s+/g, ' ')
        .trim()

      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: stockPrompt, imageDataUrl: null, qualityMode }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Something went wrong')
          return
        }

        setBeforeUrl(data.url)
      } catch (err) {
        console.error(err)
        setError('Server error')
      } finally {
        setLoading(false)
      }

      // stop here; user hits generate again to apply mods
      return
    }

    // ---------- BRANCH 3: APPLY MODS TO STOCK IMAGE ----------
    const userText = prompt.trim()
    const combinedMods = [userText, quickModsText].filter(Boolean).join(', ').trim()

    const carLine = carDesc
      ? `Ultra-realistic photo of the same ${carDesc} as the previous stock image`
      : 'Ultra-realistic photo of the same car as the previous stock image'

    const finalPrompt = `
      ${carLine}, in ${cameraViewPrompt}.
      Keep the same generation, general body shape, wheel and tire sizes, and a very similar background and lighting as the stock image.
      Only modify the specific parts mentioned in the modifications list below; keep all other body panels, lights, and glass identical to the original stock image.
      If a requested carbon panel is not clearly visible from this camera angle, leave that panel and surrounding bodywork completely unchanged.
      ${colorInstructions}
      Apply EXACTLY these modifications (no extra mods beyond this list): ${
        combinedMods ||
        'clean OEM+ style mods that improve stance and presence while staying realistic.'
      }
      Mods can include suspension changes, wheels, spoilers, splitters, diffusers, carbon panels, side skirts, exhaust tips, and other realistic parts that are explicitly described in the text.
      Do not change the car into a different model or year. Do not switch to a radically different camera angle.
      Preserve realistic manufacturer-style badging and logos; do NOT invent nonsense words or random text on the car.
      Do NOT add any extra text overlays, watermarks, or additional cars in the scene.
      ${qualityAppend}
    `
      .replace(/\s+/g, ' ')
      .trim()

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          imageDataUrl: beforeUrl,
          qualityMode,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        return
      }

      setImageUrl(data.url)
    } catch (err) {
      console.error(err)
      setError('Server error')
    } finally {
      setLoading(false)
    }
  }

  const usingPhoto = Boolean(inputImage)
  const hasConceptBefore = Boolean(beforeUrl)
  const baseBefore = inputImage || beforeUrl || null

  const showStockStepButtonLabel =
    !usingPhoto && !hasConceptBefore ? 'Generate Stock Car' : 'Apply Mods'

  // Build data for MakeItRealCard from selected mods
  const cardSelectedMods: CardSelectedMods = {}

  if (selectedMods.tint.enabled && selectedMods.tint.optionId) {
    const tintMod = MODS.find((m) => m.id === 'tint')
    const opt = tintMod?.options.find((o) => o.id === selectedMods.tint.optionId)
    if (opt) cardSelectedMods.tint = `${opt.label} window tint`
  }

  if (selectedMods.wheels.enabled && selectedMods.wheels.optionId) {
    const wheelsMod = MODS.find((m) => m.id === 'wheels')
    const opt = wheelsMod?.options.find((o) => o.id === selectedMods.wheels.optionId)
    if (opt) cardSelectedMods.wheels = opt.label
  }

  if (selectedMods.suspension.enabled && selectedMods.suspension.optionId) {
    const suspMod = MODS.find((m) => m.id === 'suspension')
    const opt = suspMod?.options.find((o) => o.id === selectedMods.suspension.optionId)
    if (opt) cardSelectedMods.suspension = `${opt.label} suspension`
  }

  if (selectedMods.spacers.enabled && selectedMods.spacers.optionId) {
    const spacersMod = MODS.find((m) => m.id === 'spacers')
    const opt = spacersMod?.options.find((o) => o.id === selectedMods.spacers.optionId)
    if (opt) cardSelectedMods.spacers = `${opt.label} spacers`
  }

  if (selectedMods.spoiler.enabled && selectedMods.spoiler.optionId) {
    const spoilerMod = MODS.find((m) => m.id === 'spoiler')
    const opt = spoilerMod?.options.find((o) => o.id === selectedMods.spoiler.optionId)
    if (opt) cardSelectedMods.aero = `${opt.label} spoiler`
  }

  const hasAnyCardMods =
    !!cardSelectedMods.tint ||
    !!cardSelectedMods.wheels ||
    !!cardSelectedMods.aero ||
    !!cardSelectedMods.suspension ||
    !!cardSelectedMods.exhaust ||
    !!cardSelectedMods.spacers

  const handleOpenPartFinder = () => {
    const params = new URLSearchParams()
    if (carMake) params.set('make', carMake)
    if (carModel) params.set('model', carModel)
    if (carYear) params.set('year', carYear)
    router.push(`/part-finder?${params.toString()}`)
  }

  const stepsMeta = [
    { id: 1, title: 'Your Car', subtitle: 'Pick car & upload (optional)' },
    { id: 2, title: 'Quick Mods', subtitle: 'Tap to add preset mods' },
    { id: 3, title: 'Extra Details', subtitle: 'Anything we missed?' },
    { id: 4, title: 'Render & Budget', subtitle: 'Generate & price estimate' },
  ] as const

  const currentMeta = stepsMeta.find((s) => s.id === step)!

  const canGoNext = (current: 1 | 2 | 3 | 4) => {
    if (current === 3) return true
    if (current === 2) return true
    if (current === 1) return true
    return false
  }

  const onNext = () => {
    if (step === 4) return
    if (!canGoNext(step)) return
    setStep((prev) => (prev + 1) as 1 | 2 | 3 | 4)
  }

  const onBack = () => {
    if (step === 1) return
    setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4)
  }

  return (
    <main className="min-h-screen bg-[#050509] text-white flex flex-col">
      {/* App header */}
      <header className="border-b border-white/5 bg-gradient-to-b from-purple-900/30 via-[#050509] to-[#050509]">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <img src="/carcrafter.png" alt="Car Crafter" className="h-9 w-auto" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight">Car Crafter</span>
            <span className="text-[11px] text-gray-400">
              Visualize your build before you spend.
            </span>
          </div>
        </div>
      </header>

      {/* App body */}
      <div className="flex-1 flex justify-center">
        <div className="w-full max-w-md px-4 py-5 flex flex-col gap-4">
          {/* Step indicator */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <span>
                Step {step} of {stepsMeta.length}
              </span>
              <span>{currentMeta.title}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all"
                style={{ width: `${(step / stepsMeta.length) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-400">{currentMeta.subtitle}</p>
          </div>

          {/* Step card */}
          <div className="flex-1">
            <div className="rounded-2xl border border-white/7 bg-[#0a0a0f] shadow-[0_18px_45px_rgba(0,0,0,0.75)] p-4 space-y-4">
              {step === 1 && (
                <>
                  <div>
                    <h2 className="text-sm font-semibold mb-1">Your car</h2>
                    <p className="text-[11px] text-gray-400 mb-3">
                      Tell us what you drive. This helps Car Crafter keep the generation
                      close to your real car.
                    </p>

                    <div className="grid gap-3 text-sm">
                      <div className="flex flex-col gap-1">
                        <label className="text-gray-300 font-medium text-xs">Make</label>
                        <select
                          className="bg-[#15151b] border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 hover:border-purple-400 transition"
                          value={carMake}
                          onChange={(e) => {
                            const value = e.target.value
                            setCarMake(value)
                            setCarModel('')
                            setBeforeUrl(null)
                            setImageUrl(null)
                            setAutoStockAttempted(false)
                          }}
                        >
                          <option value="">Select make</option>
                          {carOptions.map((opt) => (
                            <option key={opt.make} value={opt.make}>
                              {opt.make}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-gray-300 font-medium text-xs">
                          Model
                        </label>
                        <select
                          className="bg-[#15151b] border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 hover:border-purple-400 transition disabled:opacity-40"
                          value={carModel}
                          onChange={(e) => {
                            const value = e.target.value
                            setCarModel(value)
                            setBeforeUrl(null)
                            setImageUrl(null)
                            setAutoStockAttempted(false)
                          }}
                          disabled={!carMake}
                        >
                          <option value="">Select model</option>
                          {carMake &&
                            carOptions
                              .find((m) => m.make === carMake)
                              ?.models.map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-gray-300 font-medium text-xs">
                          Year
                        </label>
                        <select
                          className="bg-[#15151b] border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 hover:border-purple-400 transition"
                          value={carYear}
                          onChange={(e) => {
                            const value = e.target.value
                            setCarYear(value)
                            setBeforeUrl(null)
                            setImageUrl(null)
                            setAutoStockAttempted(false)
                          }}
                        >
                          <option value="">Select year</option>
                          {YEAR_OPTIONS.map((y) => (
                            <option key={y} value={y.toString()}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-gray-300 font-medium text-xs">
                          Color (required)
                        </label>
                        <select
                          className="bg-[#15151b] border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 hover:border-purple-400 transition"
                          value={carColor}
                          onChange={(e) => {
                            setCarColor(e.target.value)
                            setBeforeUrl(null)
                            setImageUrl(null)
                            setAutoStockAttempted(false)
                          }}
                        >
                          <option value="">Select color</option>
                          <option value="black">Black</option>
                          <option value="white">White</option>
                          <option value="silver">Silver / Grey</option>
                          <option value="blue">Blue</option>
                          <option value="red">Red</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-3">
                    <h3 className="text-xs font-semibold tracking-wide text-gray-300 mb-2">
                      Upload your car (optional)
                    </h3>
                    <label className="flex-1 border border-dashed border-gray-600 rounded-xl p-4 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-900/10 transition">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <div className="text-gray-300 text-sm">
                        Tap to upload or drag and drop
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1">
                        Real photos work best (JPG / PNG)
                      </div>
                    </label>
                    {(inputImage || beforeUrl) && (
                      <img
                        src={inputImage || beforeUrl || ''}
                        className="rounded-lg max-h-40 w-full object-cover mt-3 border border-gray-700"
                      />
                    )}
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold mb-1">Quick mod selector</h2>
                      <p className="text-[11px] text-gray-400">
                        Tap a category, pick an option, and we’ll bake it into your render.
                      </p>
                    </div>
                  </div>

                  {activeModId === null ? (
                    <div className="space-y-2 overflow-y-auto max-h-[320px] pr-1">
                      {MODS.map((mod) => {
                        const selected = selectedMods[mod.id]
                        const isEnabled = selected?.enabled
                        const currentOption = mod.options.find(
                          (o) => o.id === selected?.optionId,
                        )

                        return (
                          <button
                            key={mod.id}
                            type="button"
                            onClick={() => setActiveModId(mod.id)}
                            className="w-full flex flex-col items-start border border-gray-700 rounded-xl px-3 py-2 hover:bg-gray-900 hover:border-purple-400 transition text-left"
                          >
                            <div className="flex w-full justify-between items-center">
                              <span className="text-sm font-medium">{mod.label}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full border border-gray-600">
                                {isEnabled ? 'Selected ✅' : 'Not selected'}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {mod.description}
                            </p>
                            {isEnabled && currentOption && (
                              <p className="text-[11px] text-gray-300 mt-0.5">
                                Option: {currentOption.label}
                              </p>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <ModDetailScreen
                      key={activeModId}
                      modId={activeModId}
                      selected={selectedMods[activeModId]}
                      onBack={() => setActiveModId(null)}
                      onSave={(optionId) => {
                        setSelectedMods((prev) => ({
                          ...prev,
                          [activeModId]: { enabled: true, optionId },
                        }))
                        setActiveModId(null)
                      }}
                      onRemove={() => {
                        setSelectedMods((prev) => ({
                          ...prev,
                          [activeModId]: { enabled: false, optionId: null },
                        }))
                        setActiveModId(null)
                      }}
                    />
                  )}
                </>
              )}

              {step === 3 && (
                <>
                  <h2 className="text-sm font-semibold mb-1">Anything we missed?</h2>
                  <p className="text-[11px] text-gray-400 mb-2">
                    Add any extra instructions, details, or preferences. If the quick
                    mods cover everything, you can keep this short.
                  </p>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full bg-[#15151b] border border-gray-700 rounded-xl p-3 text-sm resize-none outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 hover:border-purple-400 transition min-h-[160px]"
                    placeholder="Example: Lowered stance, chrome wheels, carbon lip, side skirts, rear diffuser, quad exhaust, 5% tint."
                  />
                </>
              )}

              {step === 4 && (
                <>
                  <div>
                    <h2 className="text-sm font-semibold mb-1">Render & budget</h2>
                    <p className="text-[11px] text-gray-400">
                      Generate your before / after, then see a rough parts budget for this
                      build.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={handleGenerate}
                      disabled={loading}
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-sm font-semibold"
                    >
                      {loading ? 'Generating…' : showStockStepButtonLabel}
                    </button>

                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <span>Render quality</span>
                      <div className="inline-flex rounded-full border border-gray-700 bg-[#15151b] p-1">
                        <button
                          type="button"
                          onClick={() => setQualityMode('standard')}
                          className={`px-3 py-1 rounded-full font-medium ${
                            qualityMode === 'standard'
                              ? 'bg-purple-600 text-white'
                              : 'text-gray-300'
                          }`}
                        >
                          Standard
                        </button>
                        <button
                          type="button"
                          onClick={() => setQualityMode('ultra')}
                          className={`px-3 py-1 rounded-full font-medium ${
                            qualityMode === 'ultra'
                              ? 'bg-purple-600 text-white'
                              : 'text-gray-300'
                          }`}
                        >
                          Ultra
                        </button>
                      </div>
                    </div>

                    {loading && (
                      <p className="text-[11px] text-purple-300 animate-pulse">
                        Generating your render…
                      </p>
                    )}

                    {error && (
                      <p className="text-[11px] text-red-400">{error}</p>
                    )}
                  </div>

                  {hasAnyCardMods && (
                    <MakeItRealCard
                      selectedMods={cardSelectedMods}
                      onOpenPartFinder={handleOpenPartFinder}
                    />
                  )}

                  <div className="border border-gray-700 rounded-xl p-3 flex flex-col gap-3 min-h-[200px] bg-[#15151b]">
                    <h3 className="text-xs font-semibold text-gray-300">Result</h3>
                    <div className="flex-1 flex items-center justify-center">
                      {imageUrl && showCompare && baseBefore ? (
                        <BeforeAfterSlider before={baseBefore} after={imageUrl} />
                      ) : imageUrl ? (
                        <div className="relative w-full flex justify-center">
                          <img
                            src={imageUrl}
                            className="rounded-lg max-h-[360px] object-contain w-full"
                          />
                          <div className="pointer-events-none absolute bottom-3 right-3 bg-black/45 px-3 py-1 rounded-md">
                            <span className="text-[9px] uppercase tracking-[0.18em] text-gray-200/85">
                              Car Crafter
                            </span>
                          </div>
                        </div>
                      ) : loading ? (
                        <span className="text-purple-300 text-sm animate-pulse">
                          Generating your image…
                        </span>
                      ) : (
                        <span className="text-gray-500 text-sm text-center">
                          Your generated image will appear here.
                        </span>
                      )}
                    </div>

                    {imageUrl && (
                      <div className="flex flex-wrap justify-between items-center gap-3">
                        <div className="flex items-center gap-2">
                          {baseBefore && (
                            <button
                              type="button"
                              onClick={() => setShowCompare((prev) => !prev)}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-gray-600 hover:border-purple-500 hover:bg-purple-600/10 transition"
                            >
                              {showCompare ? 'Show After Only' : 'Compare with Before'}
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-3 ml-auto">
                          {justSaved && (
                            <span className="text-[11px] text-emerald-300">
                              Saved to your Library ✅
                            </span>
                          )}
                          <button
                            onClick={handleSaveCurrent}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-purple-500 hover:bg-purple-600/20 transition"
                          >
                            Save build
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-1">
                    <a
                      href="/library"
                      className="px-3 py-1.5 text-[11px] font-medium rounded-lg border border-gray-700 bg-[#151515] hover:bg-[#1d1d1d] hover:border-purple-500 transition text-gray-200"
                    >
                      View Library →
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom nav (app style) */}
      <footer className="border-t border-white/5 bg-[#050509]/95 backdrop-blur">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between gap-3 text-[11px]">
          <button
            type="button"
            onClick={onBack}
            disabled={step === 1}
            className="px-3 py-2 rounded-lg border border-gray-700 text-gray-200 disabled:opacity-40 disabled:cursor-default hover:border-gray-500 flex-1"
          >
            Back
          </button>

          <button
            type="button"
            onClick={step === 4 ? handleGenerate : onNext}
            disabled={step === 4 && loading}
            className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold flex-1 disabled:opacity-50"
          >
            {step === 4 ? (loading ? 'Generating…' : showStockStepButtonLabel) : 'Next'}
          </button>
        </div>
      </footer>
    </main>
  )
}

/* ---------- Mod detail sub-screen ---------- */

type ModDetailProps = {
  modId: ModId
  selected: SelectedModState
  onBack: () => void
  onSave: (optionId: string) => void
  onRemove: () => void
}

function ModDetailScreen({
  modId,
  selected,
  onBack,
  onSave,
  onRemove,
}: ModDetailProps) {
  const mod = MODS.find((m) => m.id === modId)!
  const [localOptionId, setLocalOptionId] = useState<string | null>(
    selected.optionId ?? mod.options[0]?.id ?? null,
  )

  return (
    <div className="mt-1 space-y-3 border border-gray-700 rounded-xl p-3">
      <button
        type="button"
        onClick={onBack}
        className="text-[11px] text-gray-400 hover:text-gray-200 mb-1"
      >
        ← Back to mods
      </button>

      <div>
        <h4 className="text-sm font-semibold">{mod.label}</h4>
        <p className="text-[11px] text-gray-400">{mod.description}</p>
      </div>

      <div className="space-y-2">
        {mod.options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setLocalOptionId(opt.id)}
            className={`w-full text-left border rounded-lg px-3 py-2 text-xs ${
              localOptionId === opt.id
                ? 'border-purple-400 bg-gray-800'
                : 'border-gray-700 hover:bg-gray-900 hover:border-purple-400'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => localOptionId && onSave(localOptionId)}
          disabled={!localOptionId}
          className="flex-1 bg-white text-black rounded-lg py-2 text-xs font-semibold disabled:opacity-40"
        >
          Save &amp; Back
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="flex-1 border border-red-500 text-red-400 rounded-lg py-2 text-xs"
        >
          Remove Mod
        </button>
      </div>
    </div>
  )
}

/* ---------- Make It Real card (inline) ---------- */

type MakeItRealCardProps = {
  selectedMods: CardSelectedMods
  onOpenPartFinder: () => void
}

function MakeItRealCard({ selectedMods, onOpenPartFinder }: MakeItRealCardProps) {
  const ESTIMATED_PRICES: Record<keyof CardSelectedMods, number> = {
    wheels: 1200,
    suspension: 900,
    exhaust: 800,
    tint: 300,
    aero: 600,
    spacers: 250,
  }

  const activeMods = Object.entries(selectedMods).filter(
    ([, value]) => Boolean(value),
  ) as [keyof CardSelectedMods, string][]

  const estimatedTotal = activeMods.reduce((sum, [modType]) => {
    return sum + (ESTIMATED_PRICES[modType] ?? 0)
  }, 0)

  if (activeMods.length === 0) return null

  return (
    <div className="mt-3 rounded-2xl border border-gray-800 p-3 shadow-sm bg-[#101010]">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400">
            Make this a reality
          </p>
          <p className="text-base font-semibold">
            Rough parts budget: ~${estimatedTotal.toLocaleString()}
          </p>
          <p className="text-[11px] text-gray-500">
            Ballpark estimate based on your current build. Real prices will vary.
          </p>
        </div>
        <button
          onClick={onOpenPartFinder}
          className="rounded-full px-3 py-1.5 text-[11px] font-medium bg-white text-black hover:bg-gray-100"
        >
          Open Part Finder
        </button>
      </div>

      <div className="mt-2 text-[11px] text-gray-300">
        <p className="font-medium mb-1">Mods in this estimate:</p>
        <ul className="flex flex-wrap gap-1.5">
          {activeMods.map(([key, label]) => (
            <li
              key={key}
              className="rounded-full bg-gray-900 px-3 py-1 border border-gray-700"
            >
              {label}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-2 text-[10px] text-gray-500">
        Exact parts, vendors, and pricing are available inside Part Finder (Premium).
      </p>
    </div>
  )
}

/* ---------- Before / After slider ---------- */

type BeforeAfterSliderProps = {
  before: string
  after: string
}

function BeforeAfterSlider({ before, after }: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(75) // 0–100 (bias to AFTER)

  return (
    <div className="w-full mx-auto">
      <div className="relative w-full aspect-[4/3] overflow-hidden rounded-2xl border border-gray-700 bg-black">
        {/* AFTER */}
        <img
          src={after}
          alt="After"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* BEFORE */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${position}%` }}
        >
          <img src={before} alt="Before" className="w-full h-full object-cover" />
        </div>

        {/* Labels */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between text-[11px] font-medium text-white/90">
          <span className="m-2 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-sm">
            Before
          </span>
          <span className="m-2 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-sm">
            After
          </span>
        </div>

        {/* Divider + handle */}
        <div
          className="pointer-events-none absolute top-0 bottom-0 flex items-center"
          style={{ left: `${position}%` }}
        >
          <div className="h-full w-px bg-white/70 shadow-[0_0_12px_rgba(255,255,255,0.5)]" />
          <div className="-ml-[14px] relative">
            <div className="w-7 h-7 rounded-full bg-white shadow-[0_0_14px_rgba(0,0,0,0.7)] flex items-center justify-center">
              <div className="flex items-center gap-1">
                <span className="w-1 h-3 rounded-full bg-gray-400" />
                <span className="w-1 h-3 rounded-full bg-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Watermark */}
        <div className="pointer-events-none absolute bottom-3 right-3 bg-black/40 px-3 py-1 rounded-md">
          <span className="text-[9px] uppercase tracking-[0.18em] text-gray-200/85">
            Car Crafter
          </span>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-400">
        <span>Slide to compare</span>
        <input
          type="range"
          min={0}
          max={100}
          value={position}
          onChange={(e) => setPosition(Number(e.target.value))}
          className="flex-1 accent-purple-500"
        />
      </div>
    </div>
  )
}