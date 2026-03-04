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

    const systemPrompt = `You are an expert music data quality auditor for BMG's live performance reporting system.
You receive processed show data (dates, venues, artists) and setlist data (songs, composers).

Your job is to:
1. **Validate Data**: Check if dates, artist names, territories, and venues look correct and consistent.
2. **Detect Duplicates**: Find shows or songs that appear duplicated (even with slight spelling variations).
3. **Suggest Corrections**: For fields marked "informação não localizada" or empty, suggest likely values based on context.
4. **Composer Lookup**: For songs with missing composers, suggest the most likely composer(s) based on your knowledge of music. Include confidence level.
5. **Quality Summary**: Provide an overall quality score and summary.

IMPORTANT RULES:
- Always respond in the SAME language as the data (usually Portuguese or English).
- For composer suggestions, mention the source of your knowledge (e.g., "Known BMG catalog", "Public domain", "Common attribution").
- Never invent data. If unsure, say "baixa confiança" / "low confidence".
- Return ONLY valid JSON matching the schema below.

Response JSON schema:
{
  "qualityScore": number (0-100),
  "summary": string,
  "showIssues": [
    {
      "rowIndex": number,
      "field": string,
      "type": "error" | "warning" | "suggestion",
      "message": string,
      "suggestedValue": string | null
    }
  ],
  "songIssues": [
    {
      "setlistNumber": number,
      "songIndex": number,
      "field": string,
      "type": "error" | "warning" | "suggestion",
      "message": string,
      "suggestedValue": string | null,
      "confidence": "high" | "medium" | "low",
      "source": string | null
    }
  ],
  "duplicates": [
    {
      "type": "show" | "song",
      "indices": number[],
      "description": string
    }
  ]
}`;

    const userPrompt = `Analyze the following live performance data:

SHOWS (${shows.length} entries):
${JSON.stringify(shows.slice(0, 200), null, 2)}

SETLISTS (${setlists.length} lists):
${JSON.stringify(
      setlists.map((sl: any) => ({
        number: sl.number,
        songs: sl.songs.slice(0, 100),
      })),
      null,
      2
    )}

Provide your quality review as JSON.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI review failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Extract JSON from response (may be wrapped in markdown code block)
    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1]!.trim());
    } catch {
      console.error("Failed to parse AI response:", content);
      parsed = {
        qualityScore: 0,
        summary: "AI response could not be parsed",
        showIssues: [],
        songIssues: [],
        duplicates: [],
        rawResponse: content,
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-review error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
