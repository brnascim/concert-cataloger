import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_setlist_songs",
  title: "List setlist songs",
  description: "List songs from the signed-in user's setlists, optionally filtered by processing run, setlist number or title.",
  inputSchema: {
    processingId: z.string().trim().optional().describe("Restrict to one processing run id."),
    setListNumber: z.number().int().optional().describe("Restrict to one setlist number."),
    title: z.string().trim().optional().describe("Filter by song title (partial match)."),
    limit: z.number().int().min(1).max(300).default(100).describe("Maximum number of songs to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ processingId, setListNumber, title, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("setlists")
      .select("id, processamento_id, set_list_number, ordem, song_title, composers, bmg_control, imaestro_code, prs_tunecode, comments")
      .order("set_list_number", { ascending: true })
      .order("ordem", { ascending: true })
      .limit(limit ?? 100);

    if (processingId) query = query.eq("processamento_id", processingId);
    if (typeof setListNumber === "number") query = query.eq("set_list_number", setListNumber);
    if (title) query = query.ilike("song_title", `%${title}%`);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { songs: data ?? [] },
    };
  },
});
