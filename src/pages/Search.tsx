import { useState, useEffect, useMemo } from 'react';
import { Search, RotateCcw, Download, ChevronUp, ChevronDown, Columns3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18n';

interface SearchResult {
  artist: string;
  date: string;
  territory: string;
  city: string;
  venue: string;
  headliner_yn: string;
  set_list_number: number;
  show_comments: string;
  ordem: number;
  song_title: string;
  composers: string;
  bmg_control: string;
  imaestro_code: string;
  prs_tunecode: string;
  song_comments: string;
  status: string;
}

const ALL_COLUMNS = [
  'artist', 'date', 'territory', 'city', 'venue', 'set_list_number',
  'ordem', 'song_title', 'composers', 'bmg_control', 'imaestro_code',
  'prs_tunecode', 'headliner_yn', 'status',
] as const;

type SortDir = 'asc' | 'desc';

export default function SearchPage() {
  const { t } = useI18n();
  
  // Filters
  const [artist, setArtist] = useState('');
  const [song, setSong] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [territory, setTerritory] = useState('');
  const [city, setCity] = useState('');
  const [composer, setComposer] = useState('');
  const [bmgControl, setBmgControl] = useState('');
  const [headliner, setHeadliner] = useState('');
  const [imaestroCode, setImaestroCode] = useState('');
  const [prsTunecode, setPrsTunecode] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Results
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  
  // Table state
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(25);
  const [sortCol, setSortCol] = useState<string>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(ALL_COLUMNS));
  const [searchTerm, setSearchTerm] = useState(''); // for highlighting

  const fetchResults = async () => {
    setLoading(true);
    setPage(0);
    setSelectedRows(new Set());
    setSearchTerm(song || artist);

    // Build query joining shows and setlists
    let query = supabase
      .from('shows')
      .select(`
        artist, date, territory, city, venue, headliner_yn, set_list_number, comments, status, processamento_id
      `, { count: 'exact' });

    if (artist) query = query.ilike('artist', `%${artist}%`);
    if (dateFrom) query = query.gte('date', dateFrom);
    if (dateTo) query = query.lte('date', dateTo);
    if (territory) query = query.eq('territory', territory);
    if (city) query = query.ilike('city', `%${city}%`);
    if (headliner === 'Y' || headliner === 'N') query = query.eq('headliner_yn', headliner);
    if (statusFilter) query = query.eq('status', statusFilter);

    const { data: shows, count, error } = await query.order('date', { ascending: sortDir === 'asc' }).range(0, 999);

    if (error || !shows) {
      setResults([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    // Fetch setlists for these shows
    const procIds = [...new Set(shows.map(s => s.processamento_id))];
    
    let setlistQuery = supabase.from('setlists').select('*');
    if (procIds.length > 0) {
      setlistQuery = setlistQuery.in('processamento_id', procIds);
    }
    if (song) setlistQuery = setlistQuery.ilike('song_title', `%${song}%`);
    if (composer) setlistQuery = setlistQuery.ilike('composers', `%${composer}%`);
    if (bmgControl === 'Y' || bmgControl === 'N') setlistQuery = setlistQuery.eq('bmg_control', bmgControl);
    if (imaestroCode) setlistQuery = setlistQuery.ilike('imaestro_code', `%${imaestroCode}%`);
    if (prsTunecode) setlistQuery = setlistQuery.ilike('prs_tunecode', `%${prsTunecode}%`);

    const { data: setlists } = await setlistQuery;

    // Join in memory
    const joined: SearchResult[] = [];
    for (const show of shows) {
      const matchingSongs = (setlists || []).filter(
        sl => sl.processamento_id === show.processamento_id && sl.set_list_number === show.set_list_number
      );
      if (matchingSongs.length === 0 && !song && !composer && !bmgControl && !imaestroCode && !prsTunecode) {
        joined.push({
          artist: show.artist,
          date: show.date,
          territory: show.territory || '',
          city: show.city || '',
          venue: show.venue || '',
          headliner_yn: show.headliner_yn || '',
          set_list_number: show.set_list_number || 0,
          show_comments: show.comments || '',
          ordem: 0,
          song_title: '',
          composers: '',
          bmg_control: '',
          imaestro_code: '',
          prs_tunecode: '',
          song_comments: '',
          status: show.status,
        });
      } else {
        for (const sl of matchingSongs) {
          joined.push({
            artist: show.artist,
            date: show.date,
            territory: show.territory || '',
            city: show.city || '',
            venue: show.venue || '',
            headliner_yn: show.headliner_yn || '',
            set_list_number: show.set_list_number || 0,
            show_comments: show.comments || '',
            ordem: sl.ordem,
            song_title: sl.song_title,
            composers: sl.composers || '',
            bmg_control: sl.bmg_control || '',
            imaestro_code: sl.imaestro_code || '',
            prs_tunecode: sl.prs_tunecode || '',
            song_comments: sl.comments || '',
            status: show.status,
          });
        }
      }
    }

    setResults(joined);
    setTotalCount(joined.length);
    setLoading(false);
  };

  const clearFilters = () => {
    setArtist(''); setSong(''); setDateFrom(''); setDateTo('');
    setTerritory(''); setCity(''); setComposer('');
    setBmgControl(''); setHeadliner(''); setImaestroCode('');
    setPrsTunecode(''); setStatusFilter('');
    setResults([]); setTotalCount(0); setSelectedRows(new Set());
  };

  // Sort
  const sortedResults = useMemo(() => {
    const sorted = [...results].sort((a, b) => {
      const av = (a as any)[sortCol] ?? '';
      const bv = (b as any)[sortCol] ?? '';
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [results, sortCol, sortDir]);

  const pagedResults = sortedResults.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(sortedResults.length / perPage);

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const toggleRow = (i: number) => {
    const globalIdx = page * perPage + i;
    setSelectedRows(prev => {
      const next = new Set(prev);
      next.has(globalIdx) ? next.delete(globalIdx) : next.add(globalIdx);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === sortedResults.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(sortedResults.map((_, i) => i)));
    }
  };

  const highlight = (text: string) => {
    if (!searchTerm || !text) return text;
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="bg-warning/30 text-foreground rounded px-0.5">{part}</mark> : part
    );
  };

  const exportSelectedCsv = () => {
    const rows = selectedRows.size > 0
      ? [...selectedRows].map(i => sortedResults[i]).filter(Boolean)
      : sortedResults;
    
    const headers = [...visibleCols];
    const csvRows = [headers.join(',')];
    for (const row of rows) {
      csvRows.push(headers.map(h => `"${String((row as any)[h] || '').replace(/"/g, '""')}"`).join(','));
    }
    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'setlist_search_results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const colLabel = (col: string): string => {
    const map: Record<string, string> = {
      artist: t('artist'), date: t('date'), territory: t('territory'),
      city: t('city'), venue: t('venue'), set_list_number: t('setListNum'),
      ordem: '#', song_title: t('songTitle'), composers: t('composers'),
      bmg_control: t('bmgControl'), imaestro_code: t('imaestroCode'),
      prs_tunecode: t('prsTunecode'), headliner_yn: t('headliner'),
      status: t('status'),
    };
    return map[col] || col;
  };

  return (
    <div className="space-y-6">
      {/* Filter Panel */}
      <div className="rounded-lg bg-card border border-border p-5 space-y-4">
        <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">
          🔍 {t('searchTitle')}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <FilterField label={t('artist')}>
            <Input value={artist} onChange={e => setArtist(e.target.value)} placeholder="ex: Bill Laurance" />
          </FilterField>
          <FilterField label={t('songTitle')}>
            <Input value={song} onChange={e => setSong(e.target.value)} placeholder="ex: Swag Times" />
          </FilterField>
          <FilterField label={t('composers')}>
            <Input value={composer} onChange={e => setComposer(e.target.value)} />
          </FilterField>
          <FilterField label={`${t('period')} (${t('from')})`}>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </FilterField>
          <FilterField label={`${t('period')} (${t('to')})`}>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </FilterField>
          <FilterField label={t('territory')}>
            <Input value={territory} onChange={e => setTerritory(e.target.value)} />
          </FilterField>
          <FilterField label={`${t('city')} / ${t('venue')}`}>
            <Input value={city} onChange={e => setCity(e.target.value)} />
          </FilterField>
          <FilterField label={t('bmgControl')}>
            <Select value={bmgControl} onValueChange={setBmgControl}>
              <SelectTrigger><SelectValue placeholder={t('all')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all')}</SelectItem>
                <SelectItem value="Y">Y</SelectItem>
                <SelectItem value="N">N</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label={t('headliner')}>
            <Select value={headliner} onValueChange={setHeadliner}>
              <SelectTrigger><SelectValue placeholder={t('all')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all')}</SelectItem>
                <SelectItem value="Y">Y</SelectItem>
                <SelectItem value="N">N</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label={t('imaestroCode')}>
            <Input value={imaestroCode} onChange={e => setImaestroCode(e.target.value)} />
          </FilterField>
          <FilterField label={t('prsTunecode')}>
            <Input value={prsTunecode} onChange={e => setPrsTunecode(e.target.value)} />
          </FilterField>
          <FilterField label={t('status')}>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder={t('all')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all')}</SelectItem>
                <SelectItem value="active">{t('statusSuccess')}</SelectItem>
                <SelectItem value="partial">{t('statusPartial')}</SelectItem>
                <SelectItem value="error">{t('statusFailed')}</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={clearFilters} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> {t('clearFilters')}
          </Button>
          <Button onClick={fetchResults} disabled={loading} className="gap-1.5">
            <Search className="h-3.5 w-3.5" /> {loading ? '...' : t('searchBtn')}
          </Button>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {t('resultsCount', {
                from: page * perPage + 1,
                to: Math.min((page + 1) * perPage, totalCount),
                total: totalCount,
              })}
            </p>
            <div className="flex gap-2 items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Columns3 className="h-3.5 w-3.5" /> {t('columns')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-52 p-2">
                  {ALL_COLUMNS.map(col => (
                    <label key={col} className="flex items-center gap-2 py-1 px-2 text-sm cursor-pointer hover:bg-muted rounded">
                      <Checkbox
                        checked={visibleCols.has(col)}
                        onCheckedChange={checked => {
                          setVisibleCols(prev => {
                            const next = new Set(prev);
                            checked ? next.add(col) : next.delete(col);
                            return next;
                          });
                        }}
                      />
                      {colLabel(col)}
                    </label>
                  ))}
                </PopoverContent>
              </Popover>

              <Select value={String(perPage)} onValueChange={v => { setPerPage(Number(v)); setPage(0); }}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={exportSelectedCsv} className="gap-1.5">
                <Download className="h-3.5 w-3.5" />
                {selectedRows.size > 0 ? t('exportSelected') : t('exportCsv')}
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-table-header">
                    <th className="px-3 py-3 w-8">
                      <Checkbox
                        checked={selectedRows.size === sortedResults.length && sortedResults.length > 0}
                        onCheckedChange={toggleAll}
                      />
                    </th>
                    {ALL_COLUMNS.filter(c => visibleCols.has(c)).map(col => (
                      <th
                        key={col}
                        onClick={() => toggleSort(col)}
                        className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground select-none"
                      >
                        <span className="inline-flex items-center gap-1">
                          {colLabel(col)}
                          {sortCol === col && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedResults.map((row, i) => {
                    const globalIdx = page * perPage + i;
                    return (
                      <tr key={i} className={`${i % 2 === 1 ? 'bg-table-row-alt' : ''} ${selectedRows.has(globalIdx) ? 'bg-primary/5' : ''}`}>
                        <td className="px-3 py-2.5">
                          <Checkbox checked={selectedRows.has(globalIdx)} onCheckedChange={() => toggleRow(i)} />
                        </td>
                        {ALL_COLUMNS.filter(c => visibleCols.has(c)).map(col => (
                          <td key={col} className="px-4 py-2.5 text-secondary-foreground">
                            {col === 'territory' && (row as any)[col] ? (
                              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                {(row as any)[col]}
                              </span>
                            ) : (
                              <>{highlight(String((row as any)[col] || ''))}</>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                {t('previous')}
              </Button>
              <span className="text-sm text-muted-foreground">
                {page + 1} / {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                {t('next')}
              </Button>
            </div>
          )}
        </div>
      )}

      {results.length === 0 && totalCount === 0 && !loading && (
        <p className="text-center text-muted-foreground py-12">{t('noResults')}</p>
      )}
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
