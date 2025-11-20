'use client'

import { useState, ChangeEvent } from 'react'

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

export default function Home() {
  const [prompt, setPrompt] = useState('')
  const [inputImage, setInputImage] = useState<string | null>(null)   // uploaded car
  const [imageUrl, setImageUrl] = useState<string | null>(null)       // result
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // NEW: car selection state
  const [carMake, setCarMake] = useState('')
  const [carModel, setCarModel] = useState('')
  const [carYear, setCarYear] = useState('')

  // 🔥 Normalize uploaded image to 1024x1024 PNG via canvas
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

        // Optional: fill background in case of transparent edges
        ctx.fillStyle = 'black'
        ctx.fillRect(0, 0, size, size)

        // Preserve aspect ratio, fit inside square
        const ratio = Math.min(size / img.width, size / img.height)
        const newWidth = img.width * ratio
        const newHeight = img.height * ratio
        const offsetX = (size - newWidth) / 2
        const offsetY = (size - newHeight) / 2

        ctx.drawImage(img, offsetX, offsetY, newWidth, newHeight)

        const pngDataUrl = canvas.toDataURL('image/png')

        setInputImage(pngDataUrl)
        setImageUrl(null) // reset result when base image changes
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
        id: (crypto as any).randomUUID ? (crypto as any).randomUUID() : String(Date.now()),
        prompt,
        originalImage: inputImage,
        resultImage: resultUrl,
        createdAt: new Date().toISOString(),
      }

      const maxItems = 20 // keep only the newest 20 builds
      const next = [item, ...prev].slice(0, maxItems)

      try {
        window.localStorage.setItem('carcrafter_library', JSON.stringify(next))
      } catch (err: any) {
        // If it's still too big, clear and start fresh with just this one
        console.warn('Library storage full, resetting library', err)
        window.localStorage.setItem('carcrafter_library', JSON.stringify([item]))
      }
    } catch (err) {
      console.error('Failed to save to library', err)
    }
  }

  async function handleGenerate() {
    if (!prompt.trim()) {
      setError('Please enter a prompt')
      return
    }

    setLoading(true)
    setError(null)
    setImageUrl(null)

    // 🔧 Build a car description from dropdown (if filled)
    let carDescription = ''
    if (carMake && carModel && carYear) {
      carDescription = `Base vehicle: ${carYear} ${carMake} ${carModel}. `
    } else if (carMake && carModel) {
      carDescription = `Base vehicle: ${carMake} ${carModel}. `
    } else if (carMake) {
      carDescription = `Base vehicle: ${carMake}. `
    }

    const combinedPrompt = carDescription + prompt

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
      saveToLibrary(data.url) // save successful build to Library
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

        {/* Logo + mode indicator */}
        <div className="flex flex-col items-center gap-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/carcrafter.png"
            alt="Car Crafter"
            className="h-20 md:h-24 mb-1"
          />

          <p className="text-gray-400 text-sm">
            Upload a car image (optional), describe the mods, and generate an AI image.
          </p>

          {/* Status badge */}
          <span
            className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${
              imageUrl
                ? 'bg-emerald-900/30 border-emerald-600 text-emerald-300' // green = done
                : usingPhoto
                  ? 'bg-blue-900/30 border-blue-600 text-blue-300'        // blue = editing
                  : 'bg-gray-800 border-gray-600 text-gray-300'           // gray = concept mode
            }`}
          >
            {imageUrl
              ? 'Done'
              : usingPhoto
                ? 'Editing your uploaded car'
                : 'Concept render (no base photo)'}
          </span>
        </div>

        {/* 0. Select your car (optional) */}
        <div className="w-full max-w-4xl mx-auto mt-2 grid gap-4 md:grid-cols-3 text-sm">
          <div className="flex flex-col gap-1">
            <label className="text-gray-300 font-semibold">0. Make (optional)</label>
            <select
              className="rounded-lg bg-[#151515] border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
              value={carMake}
              onChange={(e) => {
                const make = e.target.value
                setCarMake(make)
                setCarModel('') // reset model when make changes
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
              className="rounded-lg bg-[#151515] border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
              value={carModel}
              onChange={(e) => setCarModel(e.target.value)}
              disabled={!carMake}
            >
              <option value="">Select model</option>
              {carMake &&
                carOptions
                  .find((opt) => opt.make === carMake)
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
              inputMode="numeric"
              placeholder="e.g. 2022"
              className="rounded-lg bg-[#151515] border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
              value={carYear}
              onChange={(e) => setCarYear(e.target.value)}
            />
          </div>
        </div>

        {/* 1 & 2. Upload + Prompt */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* 1. Upload section */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-300">1. Upload your car (optional)</h2>
            <label className="block border border-dashed border-gray-600 rounded-xl p-4 text-center cursor-pointer hover:border-purple-500 transition">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="text-gray-300 text-sm">
                Click to upload or drag and drop
              </div>
              <div className="text-xs text-gray-500 mt-1">
                JPG / PNG recommended
              </div>
            </label>
            {inputImage && (
              <div className="mt-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={inputImage}
                  alt="Uploaded car"
                  className="rounded-lg max-h-64 w-full object-cover"
                />
              </div>
            )}
          </div>

          {/* 2. Prompt + Button */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-300">2. Describe your mods</h2>
            <textarea
              className="w-full h-32 rounded-xl bg-[#151515] border border-gray-700 px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-purple-600"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: Lowered stance, matte black wheels, carbon fiber front lip, light tint."
            />
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 font-semibold text-sm transition"
            >
              {loading ? 'Generating…' : '3. Generate Image'}
            </button>
            {error && (
              <p className="text-red-400 text-xs mt-1">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* 3. Result */}
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Result</h2>
          <div className="border border-gray-700 rounded-xl p-4 min-h-[200px] flex items-center justify-center bg-[#151515]">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt="AI generated car"
                className="rounded-lg max-h-[480px] w-full object-contain"
              />
            ) : (
              <span className="text-gray-500 text-sm">
                Your generated image will appear here.
              </span>
            )}
          </div>
        </div>

        {/* Link to Library */}
        <div className="flex justify-end">
          <a
            href="/library"
            className="text-xs text-gray-400 hover:text-gray-200 underline"
          >
            View Library →
          </a>
        </div>
      </div>
    </main>
  )
}