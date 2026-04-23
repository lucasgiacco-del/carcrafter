import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const {
      prompt: userPrompt,
      imageDataUrl,
      maskDataUrl,
      selectedMods,
    } = await req.json();

    // Debug: raw client prompt length (should stay small now that client sends intent only)
    const rawPromptLen = typeof userPrompt === 'string' ? userPrompt.length : 0;
    console.log('🔧 rawClientPromptLen:', rawPromptLen);

    // --- This route is EDIT-ONLY (requires an uploaded image) ---
    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return NextResponse.json(
        { error: "Please upload a car photo to edit (imageDataUrl is required)." },
        { status: 400 }
      );
    }

    // --- Basic validation ---
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    if (!userPrompt || typeof userPrompt !== "string") {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    // --- Helpers ---
    function parseImageDataUrl(dataUrl: string) {
      // data:<mime>;base64,<payload>
      const m = /^data:(image\/(png|jpe?g|webp));base64,(.+)$/i.exec(dataUrl);
      if (!m) return null;
      return { mime: m[1].toLowerCase(), base64: m[3] };
    }

    function sanitizeUserPrompt(raw: string): string {
      // The client sometimes sends an already-expanded prompt with hard-lock rules.
      // For the server we want ONLY the intent, not a long essay.
      let s = (raw || '').trim();

      // If the client includes a "Prompt:" prefix in debug strings, strip it.
      if (s.toLowerCase().startsWith('prompt:')) s = s.slice(7).trim();

      // If the client includes long hard-lock text, cut it off at common markers.
      const cutMarkers = [
        'PHOTOREAL.',
        'Photoreal.',
        'Rules:',
        'Only change:',
        'Same camera',
        'Do NOT change',
        'Keep background',
        'Spoiler only:',
      ];
      for (const m of cutMarkers) {
        const idx = s.indexOf(m);
        if (idx > 0) {
          s = s.slice(0, idx).trim();
        }
      }

      // Collapse whitespace
      s = s.replace(/\s+/g, ' ').trim();

      // Hard cap the user's request itself (keep it short)
      if (s.length > 220) s = s.slice(0, 220).trim();

      return s;
    }

    let modifiedRequest = sanitizeUserPrompt(userPrompt).trim();
    const lower = modifiedRequest.toLowerCase();

    function isEnabledMod(value: any): boolean {
      if (value === true) return true;
      return Boolean(value && typeof value === 'object' && value.enabled === true);
    }

    function getEnabledMods(sel: any): string[] {
      try {
        if (!sel || typeof sel !== 'object') return [];
        const keys = ['tint', 'wheels', 'suspension', 'spoiler', 'paint', 'front_lip', 'diffuser', 'chrome_delete'];
        const out: string[] = [];
        for (const k of keys) {
          if (isEnabledMod((sel as any)[k])) out.push(k);
        }
        return out;
      } catch {
        return [];
      }
    }

    function getOnlyModId(enabled: string[]): string | null {
      return enabled.length === 1 ? enabled[0] : null;
    }

    const enabledMods = getEnabledMods(selectedMods);
    const onlyModIdStr: string | null = getOnlyModId(enabledMods);

    function getSelectedSpoilerStyle(sel: any): string | null {
      try {
        if (!sel) return null;
        // Common shapes we might send from the client
        // e.g. { spoiler: { style: 'duckbill' } } OR { spoilerStyle: 'duckbill' }
        const direct = typeof sel.spoilerStyle === 'string' ? sel.spoilerStyle : null;
        if (direct) return direct;
        const nested = sel.spoiler && typeof sel.spoiler.style === 'string' ? sel.spoiler.style : null;
        if (nested) return nested;
        const nested2 = sel.spoiler && typeof sel.spoiler.type === 'string' ? sel.spoiler.type : null;
        if (nested2) return nested2;
        return null;
      } catch {
        return null;
      }
    }

    function getSelectedOptionId(sel: any, modId: string): string | null {
      try {
        if (!sel || typeof sel !== 'object') return null;
        const value = (sel as any)[modId];
        if (!value || typeof value !== 'object') return null;
        return typeof value.optionId === 'string' ? value.optionId : null;
      } catch {
        return null;
      }
    }

    const selectedSpoilerStyle = getSelectedSpoilerStyle(selectedMods);
    const selectedDiffuserStyle = getSelectedOptionId(selectedMods, 'diffuser');


    let mentionsTint =
      lower.includes("tint") ||
      lower.includes("tinted") ||
      lower.includes("window tint");

    let mentionsWheels =
      lower.includes("wheel") ||
      lower.includes("wheels") ||
      lower.includes("rim") ||
      lower.includes("rims");

    let mentionsPaint =
      lower.includes("paint") ||
      lower.includes("color") ||
      lower.includes("colour");

    let mentionsLift =
      lower.includes("lift") ||
      lower.includes("lifted") ||
      lower.includes("raise") ||
      lower.includes("raised");

    let mentionsLower =
      lower.includes("lower") || lower.includes("dropped") || lower.includes("drop");

    let mentionsSpoiler =
      lower.includes("spoiler") ||
      lower.includes("lip spoiler") ||
      lower.includes("duckbill") ||
      lower.includes("ducktail") ||
      lower.includes("trunk lip") ||
      lower.includes("decklid") ||
      lower.includes("deck lid") ||
      lower.includes("trunk");

    const requiresMask = enabledMods.includes('tint') || enabledMods.includes('wheels') || enabledMods.includes('suspension');

    // --- 2. Compact, mod-aware rules (keep prompts short) ---
    function buildRules(): string {
      const lines: string[] = [];

      lines.push('Rules:');
      lines.push('- Edit a real car photo. Photoreal.');
      lines.push('- Keep camera, framing, background, and lighting unchanged.');

      if (maskDataUrl) {
        lines.push('- If mask is provided: ONLY change pixels inside the transparent/editable mask. Outside mask must be IDENTICAL.');
      }

      // If the client provided structured mods, prefer that over text inference.
      // When none provided, fall back to text inference so the route still works.
      const mods = enabledMods.length ? enabledMods : (() => {
        const inferred: string[] = [];
        if (mentionsTint) inferred.push('tint');
        if (mentionsWheels) inferred.push('wheels');
        if (mentionsLift || mentionsLower) inferred.push('suspension');
        if (mentionsSpoiler) inferred.push('spoiler');
        if (mentionsPaint) inferred.push('paint');
        return inferred;
      })();

      if (mods.includes('wheels') || mods.includes('diffuser')) {
        lines.push('- Priority: wheels and rear diffuser/exhaust are highest priority when multiple mods are combined.');
      }

      // Task list: only add constraints for what is actually being edited.
      if (mods.includes('wheels')) {
        lines.push('- Task: change ONLY wheels/tires (design/finish).');
      }

      if (mods.includes('diffuser')) {
        if (selectedDiffuserStyle === 'sport_with_quads') {
          lines.push('- Task: add OEM+ sport rear diffuser with FOUR clearly visible exhaust tips.');
          lines.push('- Quad tips are required and must stay visible even with other mods.');
        } else {
          lines.push('- Task: modify ONLY the rear diffuser/lower valance; keep factory exhaust tips unchanged.');
        }
        lines.push('- Keep taillights, trunk, plate, and upper rear bumper unchanged.');
      }

      if (mods.includes('spoiler')) {
        lines.push('- Task: add ONE visible 3D trunk spoiler (lip/duckbill as requested).');
        lines.push('- Spoiler must have crisp edges, slight thickness, and a soft contact shadow on the trunk so it looks real (not a faded paint blur).');
        lines.push('- Keep taillights, trunk shape, badges, plate, bumper unchanged.');
      }

      if (mods.includes('front_lip')) {
        lines.push('- Task: add/modify ONLY the front lip/splitter.');
        lines.push('- Keep headlights, grille, hood, paint, background unchanged.');
      }

      if (mods.includes('tint')) {
        lines.push('- Task: darken only the window glass for tint.');
        lines.push('- Do NOT apply any global color/exposure/contrast changes.');
      }

      if (mods.includes('suspension')) {
        lines.push('- Task: adjust ONLY ride height.');
      }

      if (mods.includes('paint')) {
        lines.push('- Task: change ONLY body paint color/finish as requested.');
      }

      if (mods.includes('chrome_delete')) {
        lines.push('- Task: convert chrome trim to gloss black as requested; keep badges/rings unchanged.');
      }

      return lines.join('\n') + '\n';
    }

    const rules = buildRules();

    const baseInstruction = `${rules}`;

    // Final prompt that is actually sent to the model
    let prompt = `${baseInstruction}User request: ${modifiedRequest}`;

    // Hard-cap prompt length (avoid skimming / drift). Keep it tight.
    if (prompt.length > 480) prompt = prompt.slice(0, 480);
    console.log('🔧 onlyModIdStr:', onlyModIdStr);
    console.log('🔧 modifiedRequestFinal:', modifiedRequest);
    console.log('🔧 selectedSpoilerStyle:', selectedSpoilerStyle);
    console.log('🔧 enabledMods:', enabledMods);

    // --- 3. EDIT mode (image is required) ---
    const parsedImage = parseImageDataUrl(imageDataUrl);
    if (!parsedImage) {
      return NextResponse.json(
        { error: "Invalid image data URL. Expected data:image/png|jpeg|jpg|webp;base64,..." },
        { status: 400 }
      );
    }

    const { mime, base64 } = parsedImage;

    // Prevent insanely large uploads from breaking things
    if (base64.length > 4_000_000) {
      return NextResponse.json(
        {
          error:
            "Image too large. Please upload a smaller file (try < 3MB or lower resolution).",
        },
        { status: 400 }
      );
    }

    // Optional mask size guard
    if (maskDataUrl && typeof maskDataUrl === "string") {
      const parsedMask = parseImageDataUrl(maskDataUrl);
      if (!parsedMask) {
        return NextResponse.json(
          { error: "Invalid mask data URL. Expected data:image/png;base64,..." },
          { status: 400 }
        );
      }
      if (parsedMask.mime !== "image/png") {
        return NextResponse.json(
          { error: "Mask must be a PNG with transparency (image/png)." },
          { status: 400 }
        );
      }
      if (parsedMask.base64.length > 4_000_000) {
        return NextResponse.json(
          { error: "Mask too large. Please upload a smaller PNG mask." },
          { status: 400 }
        );
      }
    }

    const bytes = Buffer.from(base64, "base64");
    const blob = new Blob([bytes], { type: mime });

    const formData = new FormData();
    formData.append("model", "gpt-image-1.5");
    formData.append("prompt", prompt);
    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    formData.append("image", blob, `input.${ext}`);

    // Attach mask if provided (PNG with transparency: transparent = editable)
    if (maskDataUrl && typeof maskDataUrl === "string") {
      const parsedMask = parseImageDataUrl(maskDataUrl);
      // parseImageDataUrl already validated above when requiresMask or when present
      if (parsedMask) {
        const maskBytes = Buffer.from(parsedMask.base64, "base64");
        const maskBlob = new Blob([maskBytes], { type: parsedMask.mime });
        formData.append("mask", maskBlob, "mask.png");
      }
    }

    formData.append("size", "1024x1024");
    formData.append("n", "1");

    const apiRes = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    const data = await apiRes.json();
    console.log("🔧 EDIT status:", apiRes.status);
    console.log("🔧 EDIT response keys:", Object.keys(data || {}));
    console.log('🔧 enabledMods:', enabledMods);
    console.log('🔧 sanitizedRequestLen:', modifiedRequest.length);
    console.log('🔧 finalPromptLen:', prompt.length);
    console.log('🔧 clientOnlyMod:', onlyModIdStr);

    if (!apiRes.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "AI edit error" },
        { status: apiRes.status || 500 }
      );
    }

    // Edit succeeded
    let url: string | undefined = data?.data?.[0]?.url;
    if (!url && data?.data?.[0]?.b64_json) {
      const b64 = data.data[0].b64_json as string;
      url = `data:image/png;base64,${b64}`;
    }

    if (!url) {
      return NextResponse.json(
        {
          error:
            "Unexpected edit response: no image URL. Raw: " +
            JSON.stringify(data),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
