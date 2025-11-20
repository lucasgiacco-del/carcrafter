'use client'

import { useState, ChangeEvent } from 'react'

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

const MODS: Mod[] = [
  {
    id: 'tint',
    label: 'Window Tint',
    description: 'Darken your side and rear windows.',
    options: [
      { id: '20', label: '20% (dark)' },
      { id: '35', label: '35% (medium)' },
      { id: '50', label: '50% (light)' },
    ],
  },
  {
    id: 'wheels',
    label: 'Wheels',
    description: 'Change the style/color of your wheels.',
    options: [
      { id: 'gloss_black', label: 'Gloss black' },
      { id: 'matte_black', label: 'Matte black' },
      { id: 'gunmetal', label: 'Gunmetal' },
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
    if (tint.optionId === '20') level = 'very dark 20%'
    else if (tint.optionId === '35') level = 'medium 35%'
    else if (tint.optionId === '50') level = 'lighter 50%'

    parts.push(
      `Apply ${level} window tint ONLY to the car's glass windows (side windows and rear windshield). ` +
        `Do NOT modify or recolor the wheels, tires, brake calipers, chrome trim or badges, paint color, body panels, headlights, taillights, mirrors, or background. ` +
        `The ONLY allowed change is darkening the transparency of the window glass.`
    )
  }

  // WHEELS
  const wheels = mods.wheels
  if (wheels.enabled && wheels.optionId) {
    let desc = ''
    if (wheels.optionId === 'gloss_black') desc = 'gloss black wheels'
    else if (wheels.optionId === 'matte_black') desc = 'matte black wheels'
    else if (wheels.optionId === 'gunmetal') desc = 'gunmetal wheels'

    parts.push(
      `Change ONLY the wheels and tires to ${desc}. Do NOT change the car's body color, windows, lights, trim, or background.`
    )
  }

  // SPOILER
  const spoiler = mods.spoiler
  if (spoiler.enabled && spoiler.optionId) {
    let desc = ''
    if (spoiler.optionId === 'lip') desc = 'a small subtle trunk lip spoiler'
    else if (spoiler.optionId === 'ducktail') desc = 'a more aggressive ducktail trunk spoiler'

    parts.push(
      `Add ${desc} to the rear of the car. Do NOT modify any other body panels, color, trim, or wheels.`
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
      `Change ONLY the chrome window trim and exterior chrome accents to ${finish}. Do NOT modify the paint, wheels, glass, or background.`
    )
  }

  if (parts.length === 0) return ''
  return parts.join(' ')
}

/* ---------- Existing types & config ---------- */

type LibraryItem = {
  id: string
  prompt: string
  originalImage: string | null
  resultImage: string
  createdAt: string
}

const carOptions = [
  { make: 'Audi', models: ['A4', 'S4', 'A3', 'Q5'] },
  { make: 'Mazda', models: ['CX-5', 'Mazda3', 'Mazda6', 'CX-30'] },
  { make: 'Jeep', models: ['Wrangler', 'Grand Cherokee', 'Gladiator', 'Renegade'] },
  { make: 'BMW', models: ['3 Series', 'M3', 'X3', 'X5'] },
  { make: 'Honda', models: ['Civic', 'Accord', 'CR-V'] },
  { make: 'Toyota', models: ['Camry', 'Corolla', 'RAV4'] },
]

/* ---------- Page component ---------- */

export default function Home() {
  const [prompt, setPrompt] = useState('')
  const [inputImage, setInputImage] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [carMake, setCarMake] = useState('')
  const [carModel, setCarModel] = useState('')
  const [carYear, setCarYear] = useState('')

  // NEW: mod selector state
  const [activeModId, setActiveModId] = useState<ModId | null>(null)
  const [selectedMods, setSelectedMods] = useState<Record<ModId, SelectedModState>>({
    tint: { enabled: false, optionId: null },
    wheels: { enabled: false, optionId: null },
    spoiler: { enabled: false, optionId: null },
    chrome_delete: { enabled: false, optionId: null },
  })

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
        originalImage: inputImage,
        resultImage: resultUrl,
        createdAt: new Date().toISOString(),
      }

      const next = [item, ...prev].slice(0, 20)
      window.localStorage.setItem('carcrafter_library', JSON.stringify(next))
    } catch (err) {
      console.error('Failed to save to library', err)
    }
  }

  // 🔥 UPDATED TO USE selectedMods + buildModsPrompt
  async function handleGenerate() {
    const hasTextPrompt = Boolean(prompt.trim())
    const hasAnyModsSelected = Object.values(selectedMods).some((m) => m.enabled)

    if (!hasTextPrompt && !hasAnyModsSelected) {
      setError('Please enter a description or select at least one mod.')
      return
    }

    setLoading(true)
    setError(null)
    setImageUrl(null)

    let carDesc = ''
    if (carMake && carModel && carYear) carDesc = `${carYear} ${carMake} ${carModel}. `
    else if (carMake && carModel) carDesc = `${carMake} ${carModel}. `
    else if (carMake) carDesc = `${carMake}. `

    const modsPrompt = buildModsPrompt(selectedMods)

    const combinedPrompt = `${carDesc}${prompt} ${modsPrompt}`.trim()

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
      saveToLibrary(data.url)
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const usingPhoto = Boolean(inputImage)

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-4xl space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2 text-center">
          <img src="/carcrafter.png" alt="Car Crafter" className="h-20 md:h-24 mb-1" />

          <p className="text-gray-400 text-sm">
            Upload a car image (optional), describe the mods, and generate an AI image.
          </p>

          <span
            className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${
              imageUrl
                ? 'bg-emerald-900/30 border-emerald-600 text-emerald-300'
                : usingPhoto
                  ? 'bg-blue-900/30 border-blue-600 text-blue-300'
                  : 'bg-gray-800 border-gray-600 text-gray-300'
            }`}
          >
            {imageUrl ? 'Done' : usingPhoto ? 'Editing your uploaded car' : 'Concept render (no photo)'}
          </span>
        </div>

        {/* Car selection */}
        <div className="grid gap-4 md:grid-cols-3 text-sm">
          <div className="flex flex-col gap-1">
            <label className="text-gray-300 font-semibold">Make</label>
            <select
              className="bg-[#151515] border border-gray-700 rounded-lg px-3 py-2"
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
            <label className="text-gray-300 font-semibold">Model</label>
            <select
              className="bg-[#151515] border border-gray-700 rounded-lg px-3 py-2"
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
            <label className="text-gray-300 font-semibold">Year</label>
            <input
              type="text"
              className="bg-[#151515] border border-gray-700 rounded-lg px-3 py-2"
              value={carYear}
              onChange={(e) => setCarYear(e.target.value)}
              placeholder="2022"
            />
          </div>
        </div>

        {/* Upload + Prompt */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-300">1. Upload your car (optional)</h2>
            <label className="block border border-dashed border-gray-600 rounded-xl p-4 text-center cursor-pointer hover:border-purple-500 transition">
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <div className="text-gray-300 text-sm">Click to upload or drag and drop</div>
              <div className="text-xs text-gray-500 mt-1">JPG / PNG recommended</div>
            </label>
            {inputImage && (
              <img src={inputImage} className="rounded-lg max-h-64 w-full object-cover mt-2" />
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-300">2. Describe your mods</h2>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-32 bg-[#151515] border border-gray-700 rounded-xl p-3 text-sm"
              placeholder="Example: Lowered stance, matte black wheels, carbon fiber lip, light tint."
            />

            {/* NEW: Mod selector UI */}
            <div className="mt-2">
              <h3 className="text-xs font-semibold text-gray-300 mb-1">
                (Optional) Quick Mod Selector
              </h3>

              {activeModId === null ? (
                <div className="space-y-2">
                  {MODS.map((mod) => {
                    const selected = selectedMods[mod.id]
                    const isEnabled = selected?.enabled
                    const currentOption = mod.options.find(
                      (o) => o.id === selected?.optionId
                    )

                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => setActiveModId(mod.id)}
                        className="w-full flex flex-col items-start border border-gray-700 rounded-xl p-2 hover:bg-gray-900 transition text-left"
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

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-sm font-semibold"
            >
              {loading ? 'Generating…' : '3. Generate Image'}
            </button>
            {error && <p className="text-red-400 text-xs">{error}</p>}
          </div>
        </div>

        {/* Result */}
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Result</h2>
          <div className="border border-gray-700 rounded-xl p-4 flex items-center justify-center min-h-[200px] bg-[#151515]">
            {imageUrl ? (
              <img src={imageUrl} className="rounded-lg max-h-[480px] object-contain w-full" />
            ) : (
              <span className="text-gray-500 text-sm">
                Your generated image will appear here.
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <a href="/library" className="text-xs text-gray-400 hover:text-gray-200 underline">
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
    selected.optionId ?? mod.options[0]?.id ?? null
  )

  return (
    <div className="mt-2 space-y-3 border border-gray-700 rounded-xl p-3">
      <button
        type="button"
        onClick={onBack}
        className="text-[11px] text-gray-400 hover:text-gray-200"
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
                ? 'border-white bg-gray-800'
                : 'border-gray-700 hover:bg-gray-900'
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
          Save & Back
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