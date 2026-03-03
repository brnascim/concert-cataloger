import { describe, expect, it } from 'vitest';
import { runQAAudit } from '@/lib/qaAuditor';
import type { ProcessedData } from '@/lib/types';

function createBaseData(): ProcessedData {
  return {
    shows: [
      {
        artist: 'DE',
        date: '10/01/2026',
        territory: 'EU',
        city: 'Berlin',
        venue: 'Velodrom',
        venueAddress: 'informação não localizada',
        prsVenueId: 'informação não localizada',
        localPromoterContactInfo: 'informação não localizada',
        comments: 'informação não localizada',
        setListNumber: 1,
        headlinerYN: 'Y',
        headlinerIfN: 'informação não localizada',
        sourceFile: 'test.txt',
      },
    ],
    setlists: [
      {
        number: 1,
        songs: [
          {
            songTitle: 'Song A',
            composers: 'John & Jane',
            bmgControl: 'Y',
            iMaestroSongCode: 'informação não localizada',
            prsTunecode: 'informação não localizada',
            comments: 'informação não localizada',
          },
        ],
      },
    ],
    alerts: [],
    filesProcessed: 1,
    filesSuccess: 1,
    filesWithAlerts: 0,
    filesWithFailures: 0,
    rejectedLines: 0,
    fileStatuses: [],
  };
}

describe('runQAAudit data guard', () => {
  it('bloqueia quando artist contém código territorial', () => {
    const result = runQAAudit(createBaseData());

    expect(result.audit.dataGuard.blocked).toBe(true);
    expect(result.audit.dataGuard.highlightedShowRows).toEqual([1]);
    expect(result.audit.issues.some(issue => issue.type === 'data_guard')).toBe(true);
  });

  it('bloqueia quando há explosão de registros', () => {
    const data = createBaseData();
    // Max = 1 * 50 * 10 = 500; creating 600 shows to clearly exceed
    data.shows = Array.from({ length: 600 }).map((_, i) => ({
      ...data.shows[0],
      artist: `Artist ${i + 1}`,
      setListNumber: 1,
      sourceFile: `show-${i + 1}.txt`,
    }));

    const result = runQAAudit(data);

    expect(result.audit.dataGuard.blocked).toBe(true);
    expect(result.audit.dataGuard.blockedReasons.some(reason => reason.includes('contagem de shows'))).toBe(true);
  });
});
