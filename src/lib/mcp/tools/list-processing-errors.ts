import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_processing_errors",
  title: "List processing errors",
  description: "List parsing/processing errors recorded for the signed-in user's uploads.",
  inputSchema: {
    processingId: z.string().trim().optional().describe("Restrict to one processing run id."),
    onlyUnresolved: z.boolean().default(false).describe("Return only errors that are not marked resolved."),
    limit: z.number().int().min(1).max(200).default(50).describe("Maximum number of errors to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ processingId, onlyUnresolved, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("erros_processamento")
      .select("id, processamento_id, arquivo_nome, tipo_erro, descricao, linha_afetada, metodo_tentado, resolvido, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);

    if (processingId) query = query.eq("processamento_id", processingId);
    if (onlyUnresolved) query = query.eq("resolvido", false);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { errors: data ?? [] },
    };
  },
});
