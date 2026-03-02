import { useState, useMemo } from 'react';
import { Download, Calendar, Music, AlertTriangle, CheckCircle, XCircle, Ban, ChevronDown, ChevronUp, Wrench, ShieldCheck, RotateCcw, Save, FileText, Filter, FilterX } from 'lucide-react';
import type { ProcessedData } from '@/lib/types';
import { exportToExcel } from '@/lib/exporter';
import { exportToCsv } from '@/lib/csvExporter';
import { sanitizeData, type SanitizationReport } from '@/lib/sanitizer';
import { runQAAudit, type AuditReport } from '@/lib/qaAuditor';
import { useI18n } from '@/lib/i18n';
import { INFO_NAO_LOCALIZADA } from '@/lib/infoNaoLocalizada';

interface DataPreviewProps {
  data: ProcessedData;
  onReset?: () => void;
  onSaveDraft?: (data: ProcessedData) => void;
}

export function DataPreview({ data, onReset, onSaveDraft }: DataPreviewProps) {
  const [activeTab, setActiveTab] = useState<string>('venues');
  const [showSanitization, setShowSanitization] = useState(false);
  const [showQuality, setShowQuality] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [filterErrors, setFilterErrors] = useState(false);
  const { t } = useI18n();

  // Run sanitization pipeline then QA audit (v1.2)
  const { data: sanitizedRaw, report } = useMemo(() => sanitizeData(data), [data]);
  const { data: sanitized, audit } = useMemo(() => runQAAudit(sanitizedRaw), [sanitizedRaw]);

  const totalSongs = sanitized.setlists.reduce((sum, sl) => sum + sl.songs.length, 0);
  const totalCorrections = report.correction1_dateInArtist + report.correction1_tourInArtist +
    report.correction2_venueInDate + report.correction3_metadataPropagated +
    report.correction4_duplicatesRemoved + report.correction5_bmgNormalized +
    report.correction6_datesNormalized + report.correction7_cancelledShows +
    report.correction8_djBpmExtracted + report.correction9_territoryInferred;

  // Filter shows that have "informação não localizada" or audit issues
  const filteredShows = useMemo(() => {
    if (!filterErrors) return sanitized.shows;
    return sanitized.shows.filter(s => {
      const values = [s.artist, s.date, s.territory, s.city, s.venue, s.venueAddress, s.comments];
      return values.some(v => v === INFO_NAO_LOCALIZADA || !v || !v.trim());
    });
  }, [sanitized.shows, filterErrors]);

  const tabs = [
    { id: 'venues', label: 'Dates & Venues', icon: Calendar },
    ...sanitized.setlists.map(sl => ({
      id: `setlist-${sl.number}`,
      label: `Set List ${sl.number}`,
      icon: Music,
    })),
  ];

  return (
    <div className="space-y-4">
      {/* ═══ Sticky Action Bar ═══ */}
      <div className="sticky top-[73px] z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border -mx-6 px-6 py-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {onReset && (
              <button
                onClick={onReset}
                className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors border border-border"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                ➕ {t('newProcessing')}
              </button>
            )}
            {onSaveDraft && (
              <button
                onClick={() => onSaveDraft(sanitized)}
                className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors border border-border"
              >
                <Save className="h-3.5 w-3.5" />
                💾 Salvar Rascunho
              </button>
            )}
            <button
              onClick={() => exportToExcel(sanitized)}
              className="flex items-center gap-1.5 rounded-md gradient-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-all glow-amber-sm"
            >
              <Download className="h-3.5 w-3.5" />
              📊 {t('exportExcel')}
            </button>
            <button
              onClick={() => exportToCsv(sanitized)}
              className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors border border-border"
            >
              <Download className="h-3.5 w-3.5" />
              {t('exportCsv')}
            </button>
          </div>

          {/* Quality Filter Toggle */}
          <button
            onClick={() => setFilterErrors(!filterErrors)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all border ${
              filterErrors
                ? 'bg-warning/15 text-warning border-warning/30'
                : 'bg-secondary text-secondary-foreground border-border hover:bg-secondary/80'
            }`}
          >
            {filterErrors ? <FilterX className="h-3.5 w-3.5" /> : <Filter className="h-3.5 w-3.5" />}
            {filterErrors ? 'Mostrar todos' : 'Apenas com erros'}
          </button>
        </div>
      </div>

      {/* Report Summary */}
      <div className="rounded-lg bg-card border border-border p-5">
        <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
          {t('reportTitle')}
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label={t('filesReceived')} value={data.filesProcessed} />
          <StatWithIcon label={t('processedSuccess')} value={data.filesSuccess} icon={<CheckCircle className="h-3.5 w-3.5 text-success" />} />
          <StatWithIcon label={t('withAlerts')} value={data.filesWithAlerts} icon={<AlertTriangle className="h-3.5 w-3.5 text-warning" />} />
          <StatWithIcon label={t('totalFailure')} value={data.filesWithFailures} icon={<XCircle className="h-3.5 w-3.5 text-destructive" />} />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mt-3 pt-3 border-t border-border">
          <Stat label={t('showsExtracted')} value={sanitized.shows.length} />
          <Stat label={t('setlistsCreated')} value={sanitized.setlists.length} />
          <Stat label={t('totalSongs')} value={totalSongs} />
          <StatWithIcon label={t('rejectedLines')} value={data.rejectedLines} icon={<Ban className="h-3.5 w-3.5 text-muted-foreground" />} />
        </div>

        {data.alerts.length > 0 && (
          <div className="mt-4 space-y-1">
            <p className="text-xs font-semibold text-warning flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {t('alertsTitle')}
            </p>
            {data.alerts.map((alert, i) => (
              <p key={i} className="text-xs text-muted-foreground ml-4">• {alert}</p>
            ))}
          </div>
        )}
      </div>

      {/* Sanitization Report */}
      {totalCorrections > 0 && (
        <div className="rounded-lg bg-card border border-border p-5">
          <button
            onClick={() => setShowSanitization(!showSanitization)}
            className="w-full flex items-center justify-between text-sm font-semibold text-primary uppercase tracking-wider"
          >
            <span className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              {t('sanitizationTitle')} ({totalCorrections})
            </span>
            {showSanitization ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showSanitization && <SanitizationDetails report={report} />}
        </div>
      )}

      {/* Quality Report */}
      {report.artistQuality.length > 0 && (
        <div className="rounded-lg bg-card border border-border p-5">
          <button
            onClick={() => setShowQuality(!showQuality)}
            className="w-full flex items-center justify-between text-sm font-semibold text-primary uppercase tracking-wider"
          >
            <span>{t('qualityTitle')}</span>
            {showQuality ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showQuality && <QualityTable artists={report.artistQuality} />}
        </div>
      )}

      {/* QA Audit Report (v1.2) */}
      {audit.totalChecked > 0 && (
        <div className="rounded-lg bg-card border border-border p-5">
          <button
            onClick={() => setShowAudit(!showAudit)}
            className="w-full flex items-center justify-between text-sm font-semibold text-primary uppercase tracking-wider"
          >
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Auditoria de Qualidade — {audit.totalFixed} corrigidos, {audit.totalWarnings} avisos
            </span>
            {showAudit ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showAudit && (
            <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
              {audit.issues.length === 0 ? (
                <p className="text-sm text-success flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" /> Todos os campos passaram na auditoria.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="rounded bg-secondary p-2 text-center">
                      <p className="text-lg font-bold text-foreground">{audit.totalChecked}</p>
                      <p className="text-xs text-muted-foreground">Campos verificados</p>
                    </div>
                    <div className="rounded bg-secondary p-2 text-center">
                      <p className="text-lg font-bold text-success">{audit.totalFixed}</p>
                      <p className="text-xs text-muted-foreground">Auto-corrigidos</p>
                    </div>
                    <div className="rounded bg-secondary p-2 text-center">
                      <p className="text-lg font-bold text-warning">{audit.totalWarnings}</p>
                      <p className="text-xs text-muted-foreground">Avisos pendentes</p>
                    </div>
                  </div>
                  {audit.issues.filter(i => !i.autoFixed).map((issue, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs">
                      <AlertTriangle className="h-3 w-3 mt-0.5 text-warning shrink-0" />
                      <span className="text-muted-foreground">
                        <strong>[{issue.sheet} L{issue.row}]</strong> {issue.description}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto rounded-lg bg-secondary p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-card text-primary glow-amber-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table Content */}
      <div className="rounded-lg border border-border overflow-hidden">
        {activeTab === 'venues' && <VenuesTable shows={filteredShows} />}
        {sanitized.setlists.map(sl =>
          activeTab === `setlist-${sl.number}` ? (
            <SetlistTable key={sl.number} songs={sl.songs} />
          ) : null
        )}
      </div>

      {filterErrors && filteredShows.length === 0 && (
        <p className="text-center text-sm text-success py-4">✅ Nenhuma linha com erros encontrada!</p>
      )}
    </div>
  );
}

function SanitizationDetails({ report }: { report: SanitizationReport }) {
  const items = [
    { label: 'Date/tour in Artist field', value: report.correction1_dateInArtist + report.correction1_tourInArtist },
    { label: 'Venue in Date field', value: report.correction2_venueInDate },
    { label: 'Metadata propagated', value: report.correction3_metadataPropagated },
    { label: 'Duplicates removed', value: report.correction4_duplicatesRemoved },
    { label: 'BMG Control normalized', value: report.correction5_bmgNormalized },
    { label: 'Dates normalized', value: report.correction6_datesNormalized },
    { label: 'Cancelled shows flagged', value: report.correction7_cancelledShows },
    { label: 'DJ BPM/Key extracted', value: report.correction8_djBpmExtracted },
    { label: 'Territory inferred from comments', value: report.correction9_territoryInferred },
  ].filter(i => i.value > 0);

  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map(item => (
        <div key={item.label} className="rounded bg-secondary p-2">
          <p className="text-lg font-bold text-foreground">{item.value}</p>
          <p className="text-xs text-muted-foreground">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

function QualityTable({ artists }: { artists: { artist: string; totalLines: number; datePercent: number; cityPercent: number; venuePercent: number; composerPercent: number; bmgPercent: number; avgScore: number }[] }) {
  const top = artists.slice(0, 20);
  const pctCell = (val: number) => (
    <span className={val >= 80 ? 'text-success' : val >= 50 ? 'text-warning' : 'text-destructive'}>
      {val}%
    </span>
  );

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-table-header">
            {['Artist', 'Lines', 'Date%', 'City%', 'Venue%', 'Composer%', 'BMG%', 'Score'].map(c => (
              <th key={c} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {top.map((a, i) => (
            <tr key={a.artist} className={i % 2 === 1 ? 'bg-table-row-alt' : ''}>
              <td className="px-3 py-2 font-medium text-foreground truncate max-w-[200px]">{a.artist}</td>
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{a.totalLines}</td>
              <td className="px-3 py-2 font-mono text-xs">{pctCell(a.datePercent)}</td>
              <td className="px-3 py-2 font-mono text-xs">{pctCell(a.cityPercent)}</td>
              <td className="px-3 py-2 font-mono text-xs">{pctCell(a.venuePercent)}</td>
              <td className="px-3 py-2 font-mono text-xs">{pctCell(a.composerPercent)}</td>
              <td className="px-3 py-2 font-mono text-xs">{pctCell(a.bmgPercent)}</td>
              <td className="px-3 py-2 font-mono text-xs font-bold">
                <span className={a.avgScore >= 75 ? 'text-success' : a.avgScore >= 50 ? 'text-warning' : 'text-destructive'}>
                  {a.avgScore}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function StatWithIcon({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div>
      <p className="text-2xl font-bold text-foreground flex items-center gap-1.5">{icon} {value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function VenuesTable({ shows }: { shows: ProcessedData['shows'] }) {
  const cols = ['Artist', 'Date', 'Territory', 'City', 'Venue', 'Set List #', 'Comments', 'Source File'];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-table-header">
            {cols.map(c => (
              <th key={c} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shows.map((show, i) => (
            <tr key={i} className={i % 2 === 1 ? 'bg-table-row-alt' : ''}>
              <td className="px-4 py-2.5 font-medium text-foreground">{show.artist}</td>
              <td className="px-4 py-2.5 font-mono text-sm text-muted-foreground">{show.date}</td>
              <td className="px-4 py-2.5">
                {show.territory && show.territory !== INFO_NAO_LOCALIZADA && (
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{show.territory}</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-secondary-foreground">{show.city}</td>
              <td className="px-4 py-2.5 text-secondary-foreground">{show.venue}</td>
              <td className="px-4 py-2.5 text-center font-mono text-primary">{show.setListNumber}</td>
              <td className="px-4 py-2.5 text-xs text-muted-foreground">{show.comments}</td>
              <td className="px-4 py-2.5 text-xs text-muted-foreground truncate max-w-[200px]">{show.sourceFile}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SetlistTable({ songs }: { songs: ProcessedData['setlists'][0]['songs'] }) {
  const cols = ['#', 'Song Title', 'Composer(s)', 'BMG Control', 'iMaestro Code', 'PRS Tunecode', 'Comments'];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-table-header">
            {cols.map(c => (
              <th key={c} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {songs.map((song, i) => (
            <tr key={i} className={i % 2 === 1 ? 'bg-table-row-alt' : ''}>
              <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{i + 1}</td>
              <td className="px-4 py-2.5 font-medium text-foreground">{song.songTitle}</td>
              <td className="px-4 py-2.5 text-secondary-foreground">{song.composers}</td>
              <td className="px-4 py-2.5 text-center">{song.bmgControl}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{song.iMaestroSongCode}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{song.prsTunecode}</td>
              <td className="px-4 py-2.5">
                {song.comments && (
                  <span className="rounded bg-accent/20 px-2 py-0.5 text-xs text-accent">{song.comments}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
