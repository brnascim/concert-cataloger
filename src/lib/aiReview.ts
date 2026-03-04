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

export interface WorksListEntry {
  songTitle: string;
  composers: string;
  artist: string;
  confidence: "high" | "medium" | "low";
  source: string;
}

export interface WorksListResult {
  works: WorksListEntry[];
  summary: string;
}

export async function requestAIReview(data: ProcessedData): Promise<AIReviewResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const { data: result, error } = await supabase.functions.invoke("ai-review", {
      body: {
        shows: data.shows,
        setlists: data.setlists,
      },
    });

    if (error) throw new Error(error.message || "AI review request failed");
    if (result?.error) throw new Error(result.error);
    return result as AIReviewResult;
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error("AI review timed out. Try with fewer data.");
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Apply AI suggestions to the data: auto-fill fields that have suggested values
 */
export function applyAISuggestions(data: ProcessedData, review: AIReviewResult): ProcessedData {
  const shows = data.shows.map((show, i) => {
    const issues = review.showIssues.filter(iss => iss.rowIndex === i && iss.suggestedValue);
    if (issues.length === 0) return show;
    const updated = { ...show };
    for (const issue of issues) {
      const field = issue.field?.toLowerCase();
      if (field === 'artist' && issue.suggestedValue) updated.artist = issue.suggestedValue;
      else if (field === 'date' && issue.suggestedValue) updated.date = issue.suggestedValue;
      else if (field === 'territory' && issue.suggestedValue) updated.territory = issue.suggestedValue;
      else if (field === 'city' && issue.suggestedValue) updated.city = issue.suggestedValue;
      else if (field === 'venue' && issue.suggestedValue) updated.venue = issue.suggestedValue;
      else if (field === 'headliner' && issue.suggestedValue) updated.headlinerYN = issue.suggestedValue;
    }
    return updated;
  });

  const setlists = data.setlists.map(sl => {
    const songs = sl.songs.map((song, si) => {
      const issues = review.songIssues.filter(
        iss => iss.setlistNumber === sl.number && iss.songIndex === si && iss.suggestedValue
      );
      if (issues.length === 0) return song;
      const updated = { ...song };
      for (const issue of issues) {
        const field = issue.field?.toLowerCase();
        if ((field === 'composers' || field === 'composer') && issue.suggestedValue) updated.composers = issue.suggestedValue;
        else if ((field === 'songtitle' || field === 'title' || field === 'song_title') && issue.suggestedValue) updated.songTitle = issue.suggestedValue;
        else if ((field === 'bmgcontrol' || field === 'bmg_control' || field === 'bmg') && issue.suggestedValue) updated.bmgControl = issue.suggestedValue;
      }
      return updated;
    });
    return { ...sl, songs };
  });

  return { ...data, shows, setlists };
}

export async function requestWorksList(data: ProcessedData): Promise<WorksListResult> {
  const timeout = setTimeout(() => {}, 60000);

  try {
    const { data: result, error } = await supabase.functions.invoke("generate-works-list", {
      body: {
        shows: data.shows,
        setlists: data.setlists,
      },
    });

    if (error) throw new Error(error.message || "Works list request failed");
    if (result?.error) throw new Error(result.error);
    return result as WorksListResult;
  } catch (err: any) {
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
