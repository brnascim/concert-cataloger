import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { shows, setlists, locale = "pt" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Extract folder context
    const folders = new Set<string>();
    for (const show of shows) {
      if (show.sourceFile) {
        const parts = show.sourceFile.replace(/\\/g, '/').split('/');
        if (parts.length > 1) folders.add(parts[parts.length - 2]);
      }
    }

    // Build artist-song mapping
    const artistSongPairs: { artist: string; songs: { title: string; composers: string }[] }[] = [];
    for (const show of shows) {
      const setlist = setlists.find((sl: any) => sl.number === show.setListNumber);
      if (setlist) {
        artistSongPairs.push({
          artist: show.artist,
          songs: setlist.songs.slice(0, 50).map((s: any) => ({
            title: s.songTitle,
            composers: s.composers,
          })),
        });
      }
    }

    const systemPrompt = `You are a music catalog expert for BMG's live performance system.
You receive show and setlist data. Generate a COMPLETE, DEDUPLICATED works list.

YOUR MISSION: For every unique song, find the correct composers using your extensive music knowledge.

RULES:
1. DEDUPLICATE: Same song title by same artist = one entry. Merge variations (typos, case differences).
2. STANDARDIZE TITLES: Fix typos, use proper capitalization, remove extra whitespace.
3. COMPOSERS ARE CRITICAL:
   - Use your training data to find correct composer(s) for every song
   - Format: "Composer1 / Composer2" (separated by " / ")
   - If the performing artist writes their own songs, include them as composer
   - For covers, attribute to ORIGINAL songwriter(s)
   - Check known BMG catalog, ASCAP, BMI, PRS registrations in your knowledge
4. ARTIST: Use the performing artist (from folder name if available, otherwise from data)
5. CONFIDENCE:
   - "high": You're certain of the attribution (well-known song/composer)
   - "medium": Likely correct based on common knowledge
   - "low": Best guess, needs verification
6. SOURCE: Brief explanation (e.g., "Known hit by [artist]", "Standard BMG catalog", "Common cover attribution")

CONTEXT: Folder names often represent the artist: ${Array.from(folders).join(', ') || 'No folder context'}

${locale === 'en' ? 'Respond ENTIRELY in English.' : locale === 'es' ? 'Responde COMPLETAMENTE en Español.' : locale === 'de' ? 'Antworte VOLLSTÄNDIG auf Deutsch.' : 'Responda INTEIRAMENTE em Português do Brasil.'}
Return ONLY valid JSON:
{
  "works": [
    {
      "songTitle": string,
      "composers": string,
      "artist": string,
      "confidence": "high" | "medium" | "low",
      "source": string
    }
  ],
  "summary": string
}`;

    const compactData = artistSongPairs.slice(0, 30);
    const userPrompt = `Generate a consolidated works list from this data:\n\n${JSON.stringify(compactData)}\n\nFor EVERY song, find and suggest the correct composers. Return JSON.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Works list generation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1]!.trim());
    } catch {
      console.error("Failed to parse AI response:", content);
      parsed = { works: [], summary: "AI response could not be parsed", rawResponse: content };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-works-list error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
