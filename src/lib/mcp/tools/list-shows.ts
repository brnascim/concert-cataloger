import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_shows",
  title: "List shows",
  description: "List catalogued live shows for the signed-in user, optionally filtered by artist, city or processing run.",
  inputSchema: {
    artist: z.string().trim().optional().describe("Filter by artist name (partial match)."),
    city: z.string().trim().optional().describe("Filter by city name (partial match)."),
    processingId: z.string().trim().optional().describe("Restrict to one processing run id."),
    limit: z.number().int().min(1).max(200).default(50).describe("Maximum number of shows to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ artist, city, processingId, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("shows")
      .select("id, processamento_id, artist, date, territory, city, venue, venue_address, set_list_number, headliner_yn, headliner_name, status")
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);

    if (artist) query = query.ilike("artist", `%${artist}%`);
    if (city) query = query.ilike("city", `%${city}%`);
    if (processingId) query = query.eq("processamento_id", processingId);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { shows: data ?? [] },
    };
  },
});
