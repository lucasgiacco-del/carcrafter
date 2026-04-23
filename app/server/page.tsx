'use client'

import { useEffect, useState } from 'react'

type LibraryItem = {
  id: string
  prompt: string
  originalImage: string | null
  resultImage: string
  createdAt: string
}

export default function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)

  // Load from localStorage on client
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return

      const raw = window.localStorage.getItem('carcrafter_library')
      if (!raw) {
        setItems([])
      } else {
        const parsed: LibraryItem[] = JSON.parse(raw)
        setItems(parsed)
      }
    } catch (err) {
      console.error('Failed to load library', err)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  function handleClearLibrary() {
    if (typeof window === 'undefined') return
    const ok = window.confirm('Clear all saved renders from this device?')
    if (!ok) return

    window.localStorage.removeItem('carcrafter_library')
    setItems([])
  }

  function handleDelete(id: string) {
    if (typeof window === 'undefined') return
    const next = items.filter((item) => item.id !== id)
    setItems(next)
    window.localStorage.setItem('carcrafter_library', JSON.stringify(next))
  }

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold">Your Builds Library</h1>
            <p className="text-xs text-gray-400">
              Saved on this device only. Newest builds appear first.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/"
              className="text-xs text-gray-300 hover:text-white underline"
            >
              ← Back to generator
            </a>
            {items.length > 0 && (
              <button
                onClick={handleClearLibrary}
                className="text-xs px-3 py-1 rounded-lg border border-red-500 text-red-400 hover:bg-red-500/10"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <p className="text-sm text-gray-400">Loading your builds…</p>
        ) : items.length === 0 ? (
          <div className="border border-gray-800 rounded-2xl p-6 bg-[#101010] text-center">
            <p className="text-sm text-gray-300 mb-1">No builds saved yet.</p>
            <p className="text-xs text-gray-500">
              Generate a car on the main page and it will automatically show up here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((item) => (
              <article
                key={item.id}
                className="border border-gray-800 rounded-2xl bg-[#101010] overflow-hidden flex flex-col"
              >
                {/* Image */}
                <a
                  href={item.resultImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.resultImage}
                    alt="Saved build"
                    className="w-full max-h-64 object-cover"
                  />
                </a>

                {/* Info */}
                <div className="p-3 flex flex-col gap-2">
                  <p className="text-[11px] text-gray-400">
                    {new Date(item.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>

                  {item.prompt && (
                    <p className="text-xs text-gray-200 line-clamp-3">
                      {item.prompt}
                    </p>
                  )}

                  <div className="flex justify-between items-center mt-1">
                    <a
                      href={item.resultImage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-purple-300 hover:text-purple-200 underline"
                    >
                      Open full size
                    </a>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-[11px] text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}