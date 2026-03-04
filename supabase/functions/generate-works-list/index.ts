import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { shows, setlists } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build compact data
    const compactShows = shows.slice(0, 50).map((s: any, i: number) => ({
      i, artist: s.artist, date: s.date, territory: s.territory,
      city: s.city, venue: s.venue, sourceFile: s.sourceFile,
    }));
    const compactSetlists = setlists.slice(0, 20).map((sl: any) => ({
      n: sl.number,
      songs: sl.songs.slice(0, 50).map((s: any, i: number) => ({
        i, title: s.songTitle, composers: s.composers,
      })),
    }));

    const systemPrompt = `You are a music catalog expert for BMG's live performance system.
You receive show data and setlists. Your job is to generate a consolidated WORKS LIST.

For each unique song, provide:
- songTitle: The correct, standardized song title
- composers: The correct composer(s), separated by " / ". Use your knowledge of music to fill in missing composers.
- artist: The performing artist
- confidence: "high", "medium", or "low" for your composer attribution
- source: Brief note on how you know (e.g., "Known BMG catalog", "ASCAP database", "Common attribution", "Inferred from context")

RULES:
- Deduplicate songs (same title by same artist = one entry)
- Standardize titles (fix typos, capitalization)
- For unknown composers, still provide your best guess with "low" confidence
- Respond in the same language as the data
- Return ONLY valid JSON

Response schema:
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

    const userPrompt = `Generate a consolidated works list from this data:\n\nSHOWS (${shows.length} total):\n${JSON.stringify(compactShows)}\n\nSETLISTS (${setlists.length} total):\n${JSON.stringify(compactSetlists)}\n\nReturn JSON works list.`;

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
