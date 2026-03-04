import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOCALE_INSTRUCTIONS: Record<string, string> = {
  pt: "Responda INTEIRAMENTE em Português do Brasil.",
  en: "Respond ENTIRELY in English.",
  es: "Responde COMPLETAMENTE en Español.",
  de: "Antworte VOLLSTÄNDIG auf Deutsch.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { shows, setlists, locale = "pt", rawContents = {} } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const langInstruction = LOCALE_INSTRUCTIONS[locale] || LOCALE_INSTRUCTIONS.pt;

    // Extract folder context from sourceFile paths
    const folderContextMap = new Map<string, Set<string>>();
    for (const show of shows) {
      if (show.sourceFile) {
        const parts = show.sourceFile.replace(/\\/g, '/').split('/');
        if (parts.length > 1) {
          const folder = parts[parts.length - 2];
          if (!folderContextMap.has(folder)) folderContextMap.set(folder, new Set());
          folderContextMap.get(folder)!.add(show.sourceFile);
        }
      }
    }
    const folderContext = Array.from(folderContextMap.entries()).map(([folder, files]) =>
      `Folder "${folder}" contains ${files.size} file(s): ${Array.from(files).join(', ')}`
    ).join('\n');

    // Prepare raw file content excerpts (truncated to avoid token limits)
    const rawExcerpts: string[] = [];
    for (const [filename, content] of Object.entries(rawContents as Record<string, string>)) {
      const truncated = (content || '').slice(0, 3000);
      rawExcerpts.push(`--- FILE: ${filename} ---\n${truncated}${content.length > 3000 ? '\n[...truncated...]' : ''}`);
    }
    const rawContentSection = rawExcerpts.length > 0
      ? `\n\nRAW FILE CONTENTS (original text from uploaded files — use this to understand context, dates, venues, artists, songs even when not explicitly labeled):\n${rawExcerpts.slice(0, 10).join('\n\n')}`
      : '';

    const systemPrompt = `You are an expert music data quality auditor and metadata researcher for BMG's live performance reporting system.
You receive processed show data (dates, venues, artists) and setlist data (songs, composers) that were extracted from various file formats (DOCX, PDF, TXT, Excel, CSV).
You also receive the RAW TEXT CONTENT of the original files. Use this to understand context that the automated parser may have missed.

${langInstruction}

YOUR PRIMARY MISSION: Rapidly standardize and complete all data fields. This data comes from files in many formats and languages — your job is to make it clean, complete, and export-ready.

## RAW CONTENT INTERPRETATION
When you receive raw file content:
1. **Identify patterns**: Look for dates (any format), venue names, city names, artist names, song titles even without explicit labels
2. **Cross-reference**: Compare what the parser extracted vs what's in the raw text — flag anything missed
3. **Contextual inference**: If a line says "São Paulo - 15/03/2025" that's a city and date even without labels
4. **Song lists**: Lines that are just titles (possibly numbered) are likely setlist songs
5. **Composers**: Look for patterns like "(John/Paul)", "by Artist", "comp:", "autor:" near song titles

## CONTEXT ANALYSIS RULES

1. **Folder Logic**: The SOURCE FILE path contains the original folder structure. The FOLDER NAME almost always represents the ARTIST name.
   - If a file is at "Artist Name/setlist.xlsx", the artist is "Artist Name"
   - If the extracted artist doesn't match the folder name, the folder name is MORE RELIABLE
   - Flag mismatches and suggest the folder-based artist name

2. **File Content Context**: Multiple files in the same folder belong to the SAME artist/tour

3. **Data Completeness**: For EVERY field marked "informação não localizada", "information not found", or left empty:
   - Use your extensive knowledge of the music industry to suggest values
   - For COMPOSERS: You know most published songwriters. Suggest with confidence level.
   - For TERRITORIES: Infer from city names, venue names, or language of the document
   - For VENUES: If you recognize the city, suggest well-known venues
   - For DATES: Look for date patterns in the raw content

4. **Composer Research**: For each song:
   - Search your training data for the correct composer(s)
   - Consider the artist — many artists write their own songs
   - Check if it's a cover — attribute to original songwriter
   - Use standard music industry format: "Composer1 / Composer2"

5. **Smart Corrections**:
   - Fix obvious typos in artist names, song titles, city names
   - Normalize date formats to DD/MM/YYYY
   - Standardize territory codes (e.g., "Brasil" → "BR", "United Kingdom" → "GB")
   - Normalize "Y"/"N"/"Yes"/"No"/"Sim"/"Não" for headliner field

## RESPONSE REQUIREMENTS

- ${langInstruction}
- For EVERY missing or suspicious field, provide a suggestedValue
- Include confidence: "high" (you're certain), "medium" (likely correct), "low" (best guess)
- Include source: explain HOW you know (e.g., "Known songwriter", "Inferred from folder name", "Found in raw file content")
- NEVER leave a suggestion empty if you can make any reasonable inference
- Return ONLY valid JSON matching the schema below

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

    const compactShows = shows.slice(0, 80).map((s: any, i: number) => ({
      i, artist: s.artist, date: s.date, territory: s.territory,
      city: s.city, venue: s.venue, headliner: s.headlinerYN,
      headlinerIfN: s.headlinerIfN, sourceFile: s.sourceFile,
      comments: s.comments, venueAddress: s.venueAddress,
    }));
    const compactSetlists = setlists.slice(0, 20).map((sl: any) => ({
      n: sl.number,
      songs: sl.songs.slice(0, 50).map((s: any, i: number) => ({
        i, title: s.songTitle, composers: s.composers,
        bmg: s.bmgControl, comments: s.comments,
      })),
    }));

    const userPrompt = `Analyze and COMPLETE this live performance data. Your goal is MAXIMUM DATA COMPLETENESS.

FOLDER STRUCTURE CONTEXT:
${folderContext || 'No folder context available'}

SHOWS (${shows.length} total, showing first ${compactShows.length}):
${JSON.stringify(compactShows)}

SETLISTS (${setlists.length} total, showing first ${compactSetlists.length}):
${JSON.stringify(compactSetlists)}
${rawContentSection}

INSTRUCTIONS:
1. For EVERY field that is empty, "informação não localizada", or "information not found" — provide a suggestedValue based on context, raw file content, and your knowledge
2. For EVERY song without composers — research and suggest the correct composer(s)
3. Verify artist names match folder names — suggest corrections if they don't
4. Cross-reference raw file content with parsed data to find anything the parser missed
5. Infer territories from cities/venues
6. Check for duplicates
7. Provide an overall quality score

Return comprehensive JSON review with ALL suggestions.`;

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
      return new Response(JSON.stringify({ error: "AI review failed" }), {
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
