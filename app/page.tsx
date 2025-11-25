'use client'

import { useState, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'

/* ---------- Types for MakeItRealCard mapping ---------- */

type CardSelectedMods = {
  wheels?: string
  suspension?: string
  exhaust?: string
  tint?: string
  aero?: string
}

/* ---------- Mod selector types & config ---------- */

type ModId = 'tint' | 'wheels' | 'spoiler' | 'chrome_delete'

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
]

function buildModsPrompt(mods: Record<ModId, SelectedModState>): string {
  const parts: string[] = []

  // TINT
  const tint = mods.tint
  if (tint.enabled && tint.optionId) {
    let level = ''
    if (tint.optionId === '5') level = 'extremely dark 5%'
    else if (tint.optionId === '20') level = 'very dark 20%'
    else if (tint.optionId === '35') level = 'medium 35%'
    else if (tint.optionId === '50') level = 'lighter 50%'
    else if (tint.optionId === '75') level = 'very light 75%'

    parts.push(
      `Apply ${level} window tint ONLY to the car's glass windows (side windows and rear windshield). ` +
        `Do NOT modify or recolor the wheels, tires, brake calipers, chrome trim or badges, paint color, body panels, headlights, taillights, mirrors, or background. ` +
        `The ONLY allowed change is darkening the transparency of the window glass.`,
    )
  }

  // WHEELS
  const wheels = mods.wheels
  if (wheels.enabled && wheels.optionId) {
    let desc = ''
    if (wheels.optionId === 'black_gloss') desc = 'gloss black wheels'
    else if (wheels.optionId === 'black_matte') desc = 'matte black wheels'
    else if (wheels.optionId === 'silver') desc = 'OEM-style bright silver wheels'
    else if (wheels.optionId === 'chrome') desc = 'high-shine chrome wheels'

    parts.push(
      `Change ONLY the wheels and tires to ${desc}. Do NOT change the car's body color, windows, lights, trim, or background.`,
    )
  }

  // SPOILER
  const spoiler = mods.spoiler
  if (spoiler.enabled && spoiler.optionId) {
    let desc = ''
    if (spoiler.optionId === 'lip') desc = 'a small subtle trunk lip spoiler'
    else if (spoiler.optionId === 'ducktail') desc = 'a more aggressive ducktail trunk spoiler'

    parts.push(
      `Add ${desc} to the rear of the car. Do NOT modify any other body panels, color, trim, or wheels.`,
    )
  }

  // CHROME DELETE
  const cd = mods.chrome_delete
  if (cd.enabled && cd.optionId) {
    let finish = ''
    if (cd.optionId === 'gloss') finish = 'gloss black'
    else if (cd.optionId === 'satin') finish = 'satin black'
    else if (cd.optionId === 'matte') finish = 'matte black'

    parts.push(
      `Change ONLY the chrome window trim and exterior chrome accents to ${finish}. Do NOT modify the paint, wheels, glass, or background.`,
    )
  }

  if (parts.length === 0) return ''
  return parts.join(' ')
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
      'A3', 'S3', 'RS3',
      'A4', 'S4', 'RS4',
      'A5', 'S5', 'RS5',
      'A6', 'S6', 'RS6',
      'A7', 'S7', 'RS7',
      'Q3', 'Q5', 'Q7', 'Q8',
      'TT', 'TTS', 'TT RS',
    ],
  },
  {
    make: 'BMW',
    models: [
      '2 Series', 'M2',
      '3 Series', 'M3',
      '4 Series', 'M4',
      '5 Series', 'M5',
      '7 Series',
      'X1', 'X3', 'X3 M', 'X5', 'X5 M',
      'Z4',
    ],
  },
  {
    make: 'Mercedes-Benz',
    models: [
      'A-Class', 'CLA', 'C-Class', 'C43', 'C63',
      'E-Class', 'E53', 'E63',
      'S-Class',
      'GLA', 'GLC', 'GLE',
      'AMG GT',
    ],
  },
  {
    make: 'Volkswagen',
    models: [
      'Golf', 'GTI', 'Golf R',
      'Jetta', 'GLI',
      'Passat',
      'Tiguan', 'Atlas',
    ],
  },
  {
    make: 'Honda',
    models: [
      'Civic', 'Civic Si', 'Civic Type R',
      'Accord',
      'Integra',
      'CR-V', 'HR-V',
    ],
  },
  {
    make: 'Toyota',
    models: [
      'Corolla', 'Corolla Hatchback',
      'Camry', 'Camry TRD',
      'GR86',
      'Supra',
      'RAV4', 'RAV4 Prime',
      'Tacoma', 'Tundra',
      '4Runner',
    ],
  },
  {
    make: 'Nissan',
    models: [
      'Altima',
      'Maxima',
      'Sentra SR',
      '370Z', '400Z',
      'GT-R',
      'Rogue',
    ],
  },
  {
    make: 'Subaru',
    models: [
      'Impreza',
      'WRX', 'WRX STI',
      'BRZ',
      'Forester',
      'Outback',
    ],
  },
  {
    make: 'Hyundai',
    models: [
      'Elantra', 'Elantra N',
      'Sonata', 'Sonata N Line',
      'Veloster N',
      'Kona', 'Kona N',
      'Tucson',
    ],
  },
  {
    make: 'Kia',
    models: [
      'Forte GT',
      'Stinger',
      'K5 GT',
      'Soul',
      'Seltos',
      'Sportage',
    ],
  },
  {
    make: 'Ford',
    models: [
      'Mustang', 'Mustang GT', 'Shelby GT350', 'Shelby GT500',
      'Focus ST', 'Focus RS',
      'Fiesta ST',
      'F-150', 'F-150 Raptor',
      'Bronco',
    ],
  },
  {
    make: 'Chevrolet',
    models: [
      'Camaro', 'Camaro SS', 'Camaro ZL1',
      'Corvette Stingray', 'Corvette Z06',
      'Malibu',
      'Silverado',
      'Trailblazer',
    ],
  },
  {
    make: 'Dodge',
    models: [
      'Charger', 'Charger Scat Pack', 'Charger Hellcat',
      'Challenger', 'Challenger Scat Pack', 'Challenger Hellcat',
      'Durango', 'Durango SRT',
    ],
  },
  {
    make: 'Jeep',
    models: [
      'Wrangler', 'Wrangler Rubicon',
      'Gladiator',
      'Grand Cherokee', 'Grand Cherokee SRT',
      'Cherokee',
    ],
  },
  {
    make: 'Mazda',
    models: [
      'Mazda3',
      'Mazda6',
      'MX-5 Miata',
      'CX-30',
      'CX-5',
      'CX-50',
    ],
  },
  {
    make: 'Lexus',
    models: [
      'IS 300', 'IS 350', 'IS 500',
      'RC 350', 'RC F',
      'GS 350',
      'RX 350',
      'NX 350',
    ],
  },
  {
    make: 'Infiniti',
    models: [
      'Q50', 'Q50 Red Sport',
      'Q60',
      'QX50',
    ],
  },
  {
    make: 'Acura',
    models: [
      'Integra',
      'TLX', 'TLX Type S',
      'ILX',
      'RDX',
      'MDX',
    ],
  },
  {
    make: 'Tesla',
    models: [
      'Model 3',
      'Model Y',
      'Model S',
      'Model X',
    ],
  },
  {
    make: 'Porsche',
    models: [
      '911 Carrera', '911 Turbo', '911 GT3',
      'Cayman', 'Cayman GT4',
      'Boxster',
      'Panamera',
      'Macan',
      'Cayenne',
    ],
  },
]

/* ---------- Page component ---------- */

export default function Home() {
  const [prompt, setPrompt] = useState('')
  const [inputImage, setInputImage] = useState<string | null>(null) // user upload (before if provided)
  const [imageUrl, setImageUrl] = useState<string | null>(null) // final modded image
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null) // stock concept before (no upload mode)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  const [carMake, setCarMake] = useState('')
  const [carModel, setCarModel] = useState('')
  const [carYear, setCarYear] = useState('')
  const [carColor, setCarColor] = useState<string | null>(null)

  // mod selector state
  const [activeModId, setActiveModId] = useState<ModId | null>(null)
  const [selectedMods, setSelectedMods] = useState<Record<ModId, SelectedModState>>({
    tint: { enabled: false, optionId: null },
    wheels: { enabled: false, optionId: null },
    spoiler: { enabled: false, optionId: null },
    chrome_delete: { enabled: false, optionId: null },
  })

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
        setBeforeUrl(null) // clear any concept "before" if user uploads real photo
        setImageUrl(null)
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

  // generate handler – TWO-STEP FLOW in no-upload mode
  async function handleGenerate() {
    const usingUploadedPhoto = Boolean(inputImage)
    const hasConceptBefore = Boolean(beforeUrl)
    const hasTextPrompt = Boolean(prompt.trim())
    const hasAnyModsSelected = Object.values(selectedMods).some((m) => m.enabled)

    // In "modding" phase (upload OR concept-before), require some instructions
    if ((usingUploadedPhoto || hasConceptBefore) && !hasTextPrompt && !hasAnyModsSelected) {
      setError('Please enter a description or select at least one mod.')
      return
    }

    setLoading(true)
    setError(null)
    setImageUrl(null)
    setJustSaved(false)

    let carDesc = ''
    if (carMake && carModel && carYear) carDesc = `${carYear} ${carMake} ${carModel}. `
    else if (carMake && carModel) carDesc = `${carMake} ${carModel}. `
    else if (carMake) carDesc = `${carMake}. `

    // COLOR RULES
    let colorInstructions = ''
    if (!carColor) {
      colorInstructions =
        "COLOR RULES: KEEP THE CAR'S ORIGINAL PAINT COLOR EXACTLY THE SAME. DO NOT CHANGE THE PAINT COLOR UNLESS THE USER EXPLICITLY ASKS FOR A DIFFERENT COLOR IN THE TEXT DESCRIPTION."
    } else {
      const normalized = carColor === 'silver' ? 'silver/grey' : carColor.toLowerCase()
      const colorMap: Record<string, string> = {
        black: 'solid glossy black paint',
        white: 'solid clean white paint',
        'silver/grey': 'metallic silver/grey paint',
        blue: 'deep blue paint',
        red: 'sporty bright red paint',
      }
      const colorDesc = colorMap[normalized] ?? carColor
      colorInstructions =
        `COLOR RULES: REPAINT ONLY THE CAR'S EXTERIOR BODY PANELS TO ${colorDesc}. ` +
        'DO NOT CHANGE THE WHEELS, GLASS, LIGHTS, INTERIOR, OR BACKGROUND. ' +
        'DO NOT CHANGE THE CAMERA ANGLE OR BODY SHAPE.'
    }

    const modsPrompt = buildModsPrompt(selectedMods)

    // ---------- BRANCH 1: USER UPLOADED PHOTO → always just apply mods to their real car ----------
    if (usingUploadedPhoto) {
      const editingInstructions =
        'YOU ARE EDITING A REAL PHOTO OF A CAR THAT THE USER UPLOADED. ' +
        'YOU MUST USE THIS EXACT PHOTO AS THE BASE IMAGE. DO NOT REPLACE IT WITH A DIFFERENT CAR OR DIFFERENT PHOTO. ' +
        'KEEP THE ORIGINAL CAR BODY LINES, PANEL GAPS, PROPORTIONS, REFLECTIONS, SHADOWS, BACKGROUND, AND CAMERA ANGLE EXACTLY THE SAME. ' +
        'DO NOT INVENT NEW BUMPERS, BODY KITS, DIFFERENT GENERATIONS, OR DIFFERENT MODELS. APPLY ONLY THE MODIFICATIONS REQUESTED BELOW ON TOP OF THE EXISTING CAR.'

      const primaryUserText =
        prompt.trim().length > 0
          ? prompt.trim()
          : 'If the user did not specify many details, make only subtle, tasteful modifications. Do NOT invent extreme changes.'

      const secondaryModsText =
        modsPrompt.trim().length > 0
          ? 'SECONDARY INSTRUCTIONS (QUICK MOD SELECTOR – FOLLOW THESE ONLY IF THEY DO NOT CONTRADICT THE USER DESCRIPTION): ' +
            modsPrompt
          : 'No preset quick mods were selected. Only follow the user description.'

      const combinedPrompt = (
        editingInstructions +
        ' ' +
        (carDesc ? `CAR CONTEXT: ${carDesc} ` : '') +
        colorInstructions +
        ' PRIMARY INSTRUCTIONS (HIGHEST PRIORITY – USER DESCRIPTION, ALWAYS OBEY THIS FIRST): ' +
        primaryUserText +
        ' ' +
        secondaryModsText +
        ' OVERALL STYLE: ULTRA-REALISTIC AUTOMOTIVE PHOTO, NO DISTORTIONS, NO CARTOON OR ILLUSTRATION STYLE.'
      )
        .replace(/\s+/g, ' ')
        .trim()

      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: combinedPrompt, imageDataUrl: inputImage }),
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

    // ---------- BRANCH 2: NO UPLOAD, NO BEFORE YET → STEP 1: generate stock "before" ----------
    if (!usingUploadedPhoto && !hasConceptBefore) {
      const stockPrompt = (
        'ULTRA-REALISTIC PHOTO OF A STOCK ' +
        (carDesc || 'modern car') +
        ' NO AFTERMARKET MODS. FACTORY OEM WHEELS, FACTORY RIDE HEIGHT, FACTORY BODYWORK. CLEAN LIGHTING, DEALERSHIP-STYLE OR SIMPLE BACKGROUND. ' +
        colorInstructions +
        ' DO NOT ADD TINT, BODY KITS, AFTERMARKET WHEELS, OR OTHER MODS.'
      )
        .replace(/\s+/g, ' ')
        .trim()

      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: stockPrompt, imageDataUrl: null }),
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

      // we STOP here – user will click again to apply mods
      return
    }

    // ---------- BRANCH 3: NO UPLOAD, BUT beforeUrl EXISTS → STEP 2: apply mods conceptually ----------
    const primaryUserText =
      prompt.trim().length > 0
        ? prompt.trim()
        : 'If the user did not specify many details, make only subtle, tasteful modifications. Do NOT invent extreme changes.'

    const secondaryModsText =
      modsPrompt.trim().length > 0
        ? 'SECONDARY INSTRUCTIONS (QUICK MOD SELECTOR – FOLLOW THESE ONLY IF THEY DO NOT CONTRADICT THE USER DESCRIPTION): ' +
          modsPrompt
        : 'No preset quick mods were selected. Only follow the user description.'

    const conceptInstructions =
      'GENERATE A CLEAN, ULTRA-REALISTIC PHOTO OF THE SAME CAR AS THE PREVIOUS STOCK IMAGE THE USER SAW. ' +
      'KEEP THE SAME GENERATION, SAME GENERAL ANGLE, AND SIMILAR BACKGROUND. DO NOT SWITCH TO A DIFFERENT MODEL OR YEAR. APPLY THE FOLLOWING MODS: '

    const finalPrompt = (
      conceptInstructions +
      (carDesc ? `CAR CONTEXT: ${carDesc} ` : '') +
      colorInstructions +
      ' PRIMARY INSTRUCTIONS (HIGHEST PRIORITY – USER DESCRIPTION): ' +
      primaryUserText +
      ' ' +
      secondaryModsText +
      ' OVERALL STYLE: ULTRA-REALISTIC AUTOMOTIVE PHOTO, NO DISTORTIONS, NO CARTOON OR ILLUSTRATION STYLE.'
    )
      .replace(/\s+/g, ' ')
      .trim()

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: finalPrompt, imageDataUrl: null }),
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

  // what should the main button say?
  const showStockStepButtonLabel =
    !usingPhoto && !hasConceptBefore // no upload + no before yet
      ? 'Generate Stock Car'
      : 'Apply Mods'

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
    !!cardSelectedMods.exhaust

  // Part Finder navigation with query params (using car info)
  const handleOpenPartFinder = () => {
    const params = new URLSearchParams()

    if (carMake) params.set('make', carMake)
    if (carModel) params.set('model', carModel)
    if (carYear) params.set('year', carYear)

    router.push(`/part-finder?${params.toString()}`)
  }

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-5xl space-y-8">
        {/* Hero / Logo */}
        <div className="flex justify-center">
          <div className="relative flex flex-col items-center text-center gap-3 rounded-3xl border border-purple-500/60 bg-gradient-to-b from-purple-900/40 via-[#0d0d0d] to-[#0d0d0d] px-6 py-5 md:px-10 md:py-7 shadow-[0_0_35px_rgba(168,85,247,0.45)]">
            <img
              src="/carcrafter.png"
              alt="Car Crafter"
              className="h-16 md:h-20"
            />

            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
              Car Crafter
            </h1>

            <p className="text-gray-200 text-sm md:text-base max-w-xl">
              Upload your car, pick your make, model, year &amp; color, and preview
              mods like tint, wheels, spoilers, and chrome delete with AI — before you spend money.
            </p>

            <span
              className={`mt-1 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium border transition ${
                imageUrl
                  ? 'border-emerald-400 text-emerald-200 bg-emerald-900/40'
                  : usingPhoto
                    ? 'border-purple-300 text-purple-100 bg-purple-900/40'
                    : 'border-purple-400 text-purple-100 bg-purple-900/25'
              }`}
            >
              {imageUrl
                ? 'Done · New render saved to your Library'
                : usingPhoto
                  ? 'Editing your uploaded car photo'
                  : hasConceptBefore
                    ? 'Concept mode · Stock generated'
                    : 'Concept render mode (no base photo)'}
            </span>
          </div>
        </div>

        {/* Car selection card */}
        <section className="bg-[#101010] border border-gray-800 rounded-2xl p-4 md:p-5 shadow-lg shadow-black/40 transition hover:border-purple-500/80 hover:shadow-[0_0_22px_rgba(168,85,247,0.55)]">
          <h2 className="text-xs font-semibold tracking-wide text-gray-400 uppercase mb-3">
            0. Car Info (optional)
          </h2>
          <div className="grid gap-4 md:grid-cols-4 text-sm">
            <div className="flex flex-col gap-1">
              <label className="text-gray-300 font-medium text-xs">Make</label>
              <select
                className="bg-[#151515] border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 hover:border-purple-400 transition"
                value={carMake}
                onChange={(e) => {
                  setCarMake(e.target.value)
                  setCarModel('')
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
              <label className="text-gray-300 font-medium text-xs">Model</label>
              <select
                className="bg-[#151515] border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 hover:border-purple-400 transition disabled:opacity-40"
                value={carModel}
                onChange={(e) => setCarModel(e.target.value)}
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
              <label className="text-gray-300 font-medium text-xs">Year</label>
              <select
                className="bg-[#151515] border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 hover:border-purple-400 transition"
                value={carYear}
                onChange={(e) => setCarYear(e.target.value)}
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
              <label className="text-gray-300 font-medium text-xs">Color (optional)</label>
              <select
                className="bg-[#151515] border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 hover:border-purple-400 transition"
                value={carColor ?? ''}
                onChange={(e) => setCarColor(e.target.value || null)}
              >
                <option value="">Use car’s original color</option>
                <option value="black">Black</option>
                <option value="white">White</option>
                <option value="silver">Silver / Grey</option>
                <option value="blue">Blue</option>
                <option value="red">Red</option>
              </select>
            </div>
          </div>
        </section>

        {/* Steps 1–3 grid */}
        <section className="grid gap-4 md:grid-cols-3">
          {/* Step 1: Upload */}
          <div className="bg-[#101010] border border-gray-800 rounded-2xl p-4 flex flex-col transition hover:border-purple-500/80 hover:shadow-[0_0_18px_rgba(168,85,247,0.5)]">
            <h2 className="text-xs font-semibold tracking-wide text-gray-400 uppercase mb-3">
              1. Upload your car (optional)
            </h2>
            <label className="flex-1 border border-dashed border-gray-600 rounded-xl p-4 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-900/10 transition">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="text-gray-300 text-sm">Click to upload or drag and drop</div>
              <div className="text-xs text-gray-500 mt-1">JPG / PNG recommended</div>
            </label>
            {(inputImage || beforeUrl) && (
              <img
                src={inputImage || beforeUrl || ''}
                className="rounded-lg max-h-40 w-full object-cover mt-3 border border-gray-700"
              />
            )}
          </div>

          {/* Step 2: Describe */}
          <div className="bg-[#101010] border border-gray-800 rounded-2xl p-4 flex flex-col transition hover:border-purple-500/80 hover:shadow-[0_0_18px_rgba(168,85,247,0.5)]">
            <h2 className="text-xs font-semibold tracking-wide text-gray-400 uppercase mb-3">
              2. Describe your mods
            </h2>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="flex-1 w-full bg-[#151515] border border-gray-700 rounded-xl p-3 text-sm resize-none outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 hover:border-purple-400 transition"
              placeholder="Example: Lowered stance, chrome wheels, carbon lip, 20% tint."
            />
          </div>

          {/* Step 3: Quick Mod Selector */}
          <div className="bg-[#101010] border border-gray-800 rounded-2xl p-4 flex flex-col transition hover:border-purple-500/80 hover:shadow-[0_0_18px_rgba(168,85,247,0.5)]">
            <h2 className="text-xs font-semibold tracking-wide text-gray-400 uppercase mb-3">
              3. Quick Mod Selector
            </h2>

            {activeModId === null ? (
              <div className="space-y-2 overflow-y-auto max-h-64 pr-1">
                {MODS.map((mod) => {
                  const selected = selectedMods[mod.id]
                  const isEnabled = selected?.enabled
                  const currentOption = mod.options.find((o) => o.id === selected?.optionId)

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
                      <p className="text-[11px] text-gray-400 mt-0.5">{mod.description}</p>
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
          </div>
        </section>

        {/* Generate button */}
        <div className="mt-2">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-sm font-semibold"
          >
            {loading ? 'Generating…' : showStockStepButtonLabel}
          </button>

          {loading && (
            <p className="text-xs text-purple-300 mt-2 animate-pulse">
              Generating your render… this can take a few seconds.
            </p>
          )}

          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>

        {/* Make It Real card */}
        {hasAnyCardMods && (
          <MakeItRealCard
            selectedMods={cardSelectedMods}
            onOpenPartFinder={handleOpenPartFinder}
          />
        )}

        {/* Result + Save button + BEFORE/AFTER */}
        <div className="mt-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Result</h2>
          <div className="border border-gray-700 rounded-xl p-4 flex flex-col gap-3 min-h-[220px] bg-[#151515]">
            <div className="flex-1 flex items-center justify-center">
              {imageUrl && baseBefore ? (
                <BeforeAfterSlider before={baseBefore} after={imageUrl} />
              ) : imageUrl ? (
                <div className="relative w-full flex justify-center">
                  <img
                    src={imageUrl}
                    className="rounded-lg max-h-[480px] object-contain w-full"
                  />
                  {/* Faint Car Crafter watermark bottom-right */}
                  <div className="pointer-events-none absolute bottom-3 right-4 bg-black/35 px-3 py-1 rounded-md">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-gray-200/85">
                      Car Crafter
                    </span>
                  </div>
                </div>
              ) : loading ? (
                <span className="text-purple-300 text-sm animate-pulse">
                  Generating your image…
                </span>
              ) : (
                <span className="text-gray-500 text-sm">
                  Your generated image will appear here.
                </span>
              )}
            </div>

            {imageUrl && (
              <div className="flex justify-end items-center gap-3">
                {justSaved && (
                  <span className="text-[11px] text-emerald-300">
                    Saved to your Library ✅
                  </span>
                )}
                <button
                  onClick={handleSaveCurrent}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-purple-500 hover:bg-purple-600/20 transition"
                >
                  Save this build to Library
                </button>
              </div>
            )}
          </div>
        </div>

        {/* View Library button */}
        <div className="flex justify-end">
          <a
            href="/library"
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-700 bg-[#151515] hover:bg-[#1d1d1d] hover:border-purple-500 transition text-gray-200"
          >
            View Library →
          </a>
        </div>
      </div>
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
  }

  const activeMods = Object.entries(selectedMods).filter(
    ([, value]) => Boolean(value),
  ) as [keyof CardSelectedMods, string][]

  const estimatedTotal = activeMods.reduce((sum, [modType]) => {
    return sum + (ESTIMATED_PRICES[modType] ?? 0)
  }, 0)

  if (activeMods.length === 0) return null

  return (
    <div className="mt-4 rounded-2xl border border-gray-800 p-4 shadow-sm bg-[#101010]">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Make this a reality
          </p>
          <p className="text-lg font-semibold">
            Rough parts budget: ~${estimatedTotal.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">
            Ballpark estimate based on your current build. Real prices will vary.
          </p>
        </div>
        <button
          onClick={onOpenPartFinder}
          className="rounded-full px-4 py-2 text-sm font-medium bg-white text-black hover:bg-gray-100"
        >
          Open Part Finder
        </button>
      </div>

      <div className="mt-3 text-xs text-gray-300">
        <p className="font-medium mb-1">Mods in this estimate:</p>
        <ul className="flex flex-wrap gap-2">
          {activeMods.map(([key, label]) => (
            <li
              key={key}
              className="rounded-full bg-gray-900 px-3 py-1 text-[11px] border border-gray-700"
            >
              {label}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-3 text-[11px] text-gray-500">
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
  const [position, setPosition] = useState(50) // 0–100

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Image area */}
      <div className="relative w-full aspect-[4/3] overflow-hidden rounded-2xl border border-gray-700 bg-black">
        {/* AFTER (full image in the back) */}
        <img
          src={after}
          alt="After"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* BEFORE (clipped to slider position) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${position}%` }}
        >
          <img
            src={before}
            alt="Before"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Labels bottom-left / bottom-right */}
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
          {/* Vertical line */}
          <div className="h-full w-px bg-white/70 shadow-[0_0_12px_rgba(255,255,255,0.5)]" />

          {/* Round handle */}
          <div className="-ml-[14px] relative">
            <div className="w-7 h-7 rounded-full bg-white shadow-[0_0_14px_rgba(0,0,0,0.7)] flex items-center justify-center">
              <div className="flex items-center gap-1">
                <span className="w-1 h-3 rounded-full bg-gray-400" />
                <span className="w-1 h-3 rounded-full bg-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Faint Car Crafter watermark (stays on AFTER side) */}
        <div className="pointer-events-none absolute bottom-3 right-4 bg-black/40 px-3 py-1 rounded-md">
          <span className="text-[10px] uppercase tracking-[0.18em] text-gray-200/85">
            Car Crafter
          </span>
        </div>
      </div>

      {/* Slider control */}
      <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
        <span className="text-[11px]">Slide to compare</span>
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