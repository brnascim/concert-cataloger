import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_processings",
  title: "List processing runs",
  description: "List the signed-in user's file processing runs with their extraction statistics.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).default(20).describe("Maximum number of runs to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("processamentos")
      .select("id, created_at, status_geral, arquivos_recebidos, arquivos_sucesso, arquivos_com_falha, shows_extraidos, setlists_criados, musicas_catalogadas")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { processings: data ?? [] },
    };
  },
});
