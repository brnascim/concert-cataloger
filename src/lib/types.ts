export interface ShowEntry {
  artist: string;
  date: string;
  territory: string;
  city: string;
  venue: string;
  venueAddress: string;
  prsVenueId: string;
  localPromoterContactInfo: string;
  comments: string;
  setListNumber: number;
  headlinerYN: string;
  headlinerIfN: string;
  sourceFile: string;
}

export interface SongEntry {
  songTitle: string;
  composers: string;
  bmgControl: string;
  iMaestroSongCode: string;
  prsTunecode: string;
  comments: string;
}

export interface SetlistData {
  number: number;
  songs: SongEntry[];
}

export interface FileStatus {
  name: string;
  status: 'success' | 'alert' | 'failure';
  method?: string;
  alerts: string[];
  rejectedLines: number;
}

export interface ProcessedData {
  shows: ShowEntry[];
  setlists: SetlistData[];
  alerts: string[];
  filesProcessed: number;
  filesSuccess: number;
  filesWithAlerts: number;
  filesWithFailures: number;
  rejectedLines: number;
  fileStatuses: FileStatus[];
  /** Raw text content of each file (keyed by filename) for AI context */
  rawContents?: Record<string, string>;
}

export interface UploadedFile {
  name: string;
  content: string;
  type: string;
}
