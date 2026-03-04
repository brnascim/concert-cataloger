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

/**
 * Generate a consolidated works list locally from processed data.
 * Deduplicates songs across all setlists and maps artist from show context.
 */
export function generateWorksList(data: ProcessedData): WorksListResult {
  // Build a map of setlist number → artist (from shows)
  const setlistArtistMap = new Map<number, string>();
  for (const show of data.shows) {
    if (show.artist && show.setListNumber) {
      setlistArtistMap.set(show.setListNumber, show.artist);
    }
  }

  // Deduplicate songs by normalized title + artist
  const seen = new Map<string, WorksListEntry>();

  for (const sl of data.setlists) {
    const artist = setlistArtistMap.get(sl.number) || '';

    for (const song of sl.songs) {
      const normalizedTitle = song.songTitle.trim().toLowerCase().replace(/\s+/g, ' ');
      const normalizedArtist = artist.trim().toLowerCase();
      const key = `${normalizedTitle}||${normalizedArtist}`;

      if (!seen.has(key)) {
        seen.set(key, {
          songTitle: song.songTitle.trim(),
          composers: song.composers || '',
          artist: artist,
          confidence: song.composers ? 'high' : 'low',
          source: song.composers ? 'Extracted from source file' : 'Composer not found in source',
        });
      } else {
        // Merge: prefer entry with composers if current one is empty
        const existing = seen.get(key)!;
        if (!existing.composers && song.composers) {
          existing.composers = song.composers;
          existing.confidence = 'high';
          existing.source = 'Extracted from source file';
        }
      }
    }
  }

  const works = [...seen.values()].sort((a, b) => a.songTitle.localeCompare(b.songTitle));

  return {
    works,
    summary: `${works.length} unique works consolidated from ${data.setlists.length} setlist(s).`,
  };
}
