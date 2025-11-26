import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { prompt: userPrompt, imageDataUrl, qualityMode } = await req.json()

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Missing OPENAI_API_KEY in .env.local' },
        { status: 500 },
      )
    }

    if (!userPrompt || typeof userPrompt !== 'string') {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
    }

    // ---------- 1. Smart rewrite of user text ----------
    let modifiedRequest = userPrompt.trim()
    const lower = modifiedRequest.toLowerCase()

    const mentionsTint =
      lower.includes('tint') ||
      lower.includes('tinted') ||
      lower.includes('window tint')

    const mentionsWheels =
      lower.includes('wheel') ||
      lower.includes('wheels') ||
      lower.includes('rim') ||
      lower.includes('rims')

    const mentionsPaint =
      lower.includes('paint') ||
      lower.includes('color') ||
      lower.includes('colour')

    const mentionsLift =
      lower.includes('lift') ||
      lower.includes('lifted') ||
      lower.includes('raise') ||
      lower.includes('raised')

    const mentionsLower =
      lower.includes('lower') ||
      lower.includes('dropped') ||
      lower.includes('drop')

    if (mentionsTint && !mentionsWheels && !mentionsPaint) {
      modifiedRequest +=
        ' Apply tint ONLY to the glass window areas. Do not change the wheels, tires, body color, paint, trim, headlights, taillights, background, lighting, or the overall color tone of the image.'
    }

    if (mentionsWheels) {
      modifiedRequest +=
        ' When changing the wheels or rims, modify ONLY the wheels and tires (design, size, color, finish). Keep windows, body color, ride height, and background exactly the same unless I explicitly ask otherwise.'
    }

    if (!mentionsPaint) {
      modifiedRequest +=
        ' Keep the original body paint color exactly the same unless I explicitly ask to change the paint.'
    }

    if (mentionsLift || mentionsLower) {
      modifiedRequest +=
        ' When lifting or lowering the vehicle, change ONLY the suspension/ride height. Do not change wheels, paint, windows, or background unless explicitly requested.'
    }

    // ---------- 2. Global rules ----------
    const rules = `
Rules:
- Only modify features explicitly mentioned by the user.
- WINDOW TINT: Only darken the transparent glass window areas. Do NOT change the overall brightness, contrast, or color of the entire image. Do NOT desaturate or make the whole image darker. Do NOT touch wheels, paint, trim, headlights, taillights, road, sky, or background when doing tint.
- WHEELS / RIMS: Only modify the wheels and tires (design, size, color, finish). Do NOT change paint color, ride height, windows, or background unless asked.
- LIFT / LOWER / DROP: Only adjust suspension/ride height. Keep wheels, paint, windows, and environment unchanged unless requested.
- BODY COLOR: Keep the original body paint color exactly the same unless the user clearly asks for a paint color change.
- GLOBAL CHANGES: Never convert the whole image to black & white. Never apply global exposure, brightness, contrast, or color filters unless the user clearly asks for that effect.
- ENVIRONMENT: Maintain the original environment, background, and lighting unless the user explicitly says to change them.
`.trim()

    const isEdit = Boolean(imageDataUrl)
    const baseInstruction = isEdit
      ? `You are editing a real photo of a car. Follow these rules strictly.\n${rules}`
      : `Generate a photorealistic image of a car that follows these rules strictly.\n${rules}`

    const prompt = `${baseInstruction}\nUser request: ${modifiedRequest}`

    // ---------- 3. Render intensity from qualityMode ----------
    const isUltra = qualityMode === 'ultra'
    const apiQuality: 'low' | 'medium' | 'high' | 'auto' = isUltra ? 'high' : 'medium'
    const size = '1024x1024' // required values: 1024x1024, 1024x1536, 1536x1024, auto

    // ---------- 4. EDIT mode (image uploaded) ----------
    if (isEdit && typeof imageDataUrl === 'string') {
      const base64 = imageDataUrl.split(',')[1]
      if (!base64) {
        return NextResponse.json({ error: 'Invalid image data' }, { status: 400 })
      }

      if (base64.length > 4_000_000) {
        return NextResponse.json(
          {
            error:
              'Image too large. Please upload a smaller file (try < 3MB or lower resolution).',
          },
          { status: 400 },
        )
      }

      const bytes = Buffer.from(base64, 'base64')
      const blob = new Blob([bytes], { type: 'image/png' })

      const formData = new FormData()
      formData.append('model', 'gpt-image-1')
      formData.append('prompt', prompt)
      formData.append('image', blob, 'input.png')
      formData.append('size', size)
      formData.append('n', '1')
      formData.append('quality', apiQuality)

      const apiRes = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: formData,
      })

      const data = await apiRes.json()
      console.log('🔧 EDIT status:', apiRes.status)

      if (!apiRes.ok) {
        console.log('Edit failed, falling back to text-only generation')

        const genRes = await fetch(
          'https://api.openai.com/v1/images/generations',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: 'gpt-image-1',
              prompt,
              size,
              n: 1,
              quality: apiQuality,
            }),
          },
        )

        const genData = await genRes.json()
        console.log('🧠 FALLBACK GENERATE status:', genRes.status)

        if (!genRes.ok) {
          return NextResponse.json(
            { error: genData.error?.message || 'AI edit error' },
            { status: 500 },
          )
        }

        let fallbackUrl: string | undefined = genData?.data?.[0]?.url
        if (!fallbackUrl && genData?.data?.[0]?.b64_json) {
          const b64 = genData.data[0].b64_json as string
          fallbackUrl = `data:image/png;base64,${b64}`
        }

        if (!fallbackUrl) {
          return NextResponse.json(
            { error: 'Fallback also failed: no image URL' },
            { status: 500 },
          )
        }

        return NextResponse.json({ url: fallbackUrl })
      }

      let url: string | undefined = data?.data?.[0]?.url
      if (!url && data?.data?.[0]?.b64_json) {
        const b64 = data.data[0].b64_json as string
        url = `data:image/png;base64,${b64}`
      }

      if (!url) {
        return NextResponse.json(
          {
            error:
              'Unexpected edit response: no image URL. Raw: ' +
              JSON.stringify(data),
          },
          { status: 500 },
        )
      }

      return NextResponse.json({ url })
    }

    // ---------- 5. GENERATE mode (no image) ----------
    const apiRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        size,
        n: 1,
        quality: apiQuality,
      }),
    })

    const data = await apiRes.json()
    console.log('🧠 GENERATE status:', apiRes.status)

    if (!apiRes.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'AI error' },
        { status: 500 },
      )
    }

    let url: string | undefined = data?.data?.[0]?.url
    if (!url && data?.data?.[0]?.b64_json) {
      const b64 = data.data[0].b64_json as string
      url = `data:image/png;base64,${b64}`
    }

    if (!url) {
      return NextResponse.json(
        {
          error:
            'Unexpected generate response: no image URL. Raw: ' +
            JSON.stringify(data),
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ url })
  } catch (err) {
    console.error('Server error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}