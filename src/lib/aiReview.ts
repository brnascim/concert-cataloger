import { supabase } from "@/integrations/supabase/client";
import type { ProcessedData } from "@/lib/types";

export interface AIShowIssue {
  rowIndex: number;
  field: string;
  type: "error" | "warning" | "suggestion";
  message: string;
  suggestedValue: string | null;
}

export interface AISongIssue {
  setlistNumber: number;
  songIndex: number;
  field: string;
  type: "error" | "warning" | "suggestion";
  message: string;
  suggestedValue: string | null;
  confidence: "high" | "medium" | "low";
  source: string | null;
}

export interface AIDuplicate {
  type: "show" | "song";
  indices: number[];
  description: string;
}

export interface AIReviewResult {
  qualityScore: number;
  summary: string;
  showIssues: AIShowIssue[];
  songIssues: AISongIssue[];
  duplicates: AIDuplicate[];
}

export async function requestAIReview(data: ProcessedData): Promise<AIReviewResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout

  try {
    const { data: result, error } = await supabase.functions.invoke("ai-review", {
      body: {
        shows: data.shows,
        setlists: data.setlists,
      },
    });

    if (error) {
      throw new Error(error.message || "AI review request failed");
    }

    if (result?.error) {
      throw new Error(result.error);
    }

    return result as AIReviewResult;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error("AI review timed out. Try with fewer data.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
