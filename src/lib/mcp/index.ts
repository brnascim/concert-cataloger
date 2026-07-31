import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listProcessings from "./tools/list-processings";
import listShows from "./tools/list-shows";
import listSetlistSongs from "./tools/list-setlist-songs";
import listProcessingErrors from "./tools/list-processing-errors";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "setlist-symphony",
  title: "Setlist Symphony",
  version: "0.1.0",
  instructions:
    "Tools for Setlist Symphony, a live-performance catalog. Use `list_processings` to find processing runs, `list_shows` for catalogued shows, `list_setlist_songs` for songs and composers, and `list_processing_errors` to inspect parsing problems. All data is scoped to the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listProcessings, listShows, listSetlistSongs, listProcessingErrors],
});
