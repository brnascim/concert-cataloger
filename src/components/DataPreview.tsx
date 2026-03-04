import { useState, useMemo } from 'react';
import { Download, Calendar, Music, AlertTriangle, CheckCircle, XCircle, Ban, ChevronDown, ChevronUp, Wrench, ShieldCheck, RotateCcw, Save, FileText, Filter, Bot, Sparkles, Loader2, ExternalLink, ListMusic } from 'lucide-react';
import type { ProcessedData, ShowEntry } from '@/lib/types';
import { exportToExcel } from '@/lib/exporter';
import { exportToCsv } from '@/lib/csvExporter';
import { sanitizeData, type SanitizationReport } from '@/lib/sanitizer';
import { runQAAudit, type AuditReport } from '@/lib/qaAuditor';
import { useI18n } from '@/lib/i18n';
// placeholder matching is handled by isMissing() function below
import { requestAIReview, applyAISuggestions, generateWorksList, categorizeIssue, type AIReviewResult, type AIShowIssue, type AISongIssue, type WorksListResult } from '@/lib/aiReview';
import { exportWorksList } from '@/lib/worksListExporter';
import { AISuggestionApproval } from './AISuggestionApproval';
import { toast } from 'sonner';

type QualityFilter = 'all' | 'invalid' | 'suspect' | 'valid';

const ALL_PLACEHOLDERS = ['informação não localizada', 'information not found', 'información no localizada', 'information nicht gefunden'];

function isMissing(v: string | null | undefined): boolean {
  if (!v || !v.trim()) return true;
  return ALL_PLACEHOLDERS.includes(v.trim().toLowerCase());
}

function classifyShow(s: ShowEntry): 'invalid' | 'suspect' | 'valid' {
  const vals = [s.artist, s.date, s.city, s.venue];
  const missing = vals.filter(v => isMissing(v)).length;
  if (missing >= 2) return 'invalid';
  const extras = [s.territory, s.venueAddress, s.comments];
  const partialMissing = extras.filter(v => isMissing(v)).length;
  if (missing >= 1 || partialMissing >= 2) return 'suspect';
  return 'valid';
}

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
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>('all');
  const [aiReview, setAiReview] = useState<AIReviewResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiEnhancedData, setAiEnhancedData] = useState<ProcessedData | null>(null);
  const [worksLoading, setWorksLoading] = useState(false);
  const [showApprovalPanel, setShowApprovalPanel] = useState(false);
  const { t, locale } = useI18n();

  const { data: sanitizedRaw, report } = useMemo(() => sanitizeData(data), [data]);
  const { data: sanitized, audit } = useMemo(() => runQAAudit(sanitizedRaw), [sanitizedRaw]);
  
  // Use AI-enhanced data if available, otherwise use sanitized data
  const displayData = aiEnhancedData || sanitized;
  const isBlockedByDataGuard = audit.dataGuard.blocked;

  const totalSongs = displayData.setlists.reduce((sum, sl) => sum + sl.songs.length, 0);
  const totalCorrections = report.correction1_dateInArtist + report.correction1_tourInArtist +
    report.correction2_venueInDate + report.correction3_metadataPropagated +
    report.correction4_duplicatesRemoved + report.correction5_bmgNormalized +
    report.correction6_datesNormalized + report.correction7_cancelledShows +
    report.correction8_djBpmExtracted + report.correction9_territoryInferred;

  const showClassifications = useMemo(() => {
    const map = new Map<number, 'invalid' | 'suspect' | 'valid'>();
    displayData.shows.forEach((s, i) => map.set(i, classifyShow(s)));
    return map;
  }, [displayData.shows]);

  const counts = useMemo(() => {
    let invalid = 0, suspect = 0, valid = 0;
    showClassifications.forEach(c => { if (c === 'invalid') invalid++; else if (c === 'suspect') suspect++; else valid++; });
    return { invalid, suspect, valid };
  }, [showClassifications]);

  const filteredShows = useMemo(() => {
    if (qualityFilter === 'all') return displayData.shows;
    return displayData.shows.filter((_, i) => showClassifications.get(i) === qualityFilter);
  }, [displayData.shows, qualityFilter, showClassifications]);

  // Index AI issues by row for inline display
  const showIssuesByRow = useMemo(() => {
    if (!aiReview) return new Map<number, AIShowIssue[]>();
    const map = new Map<number, AIShowIssue[]>();
    for (const issue of aiReview.showIssues) {
      const list = map.get(issue.rowIndex) || [];
      list.push(issue);
      map.set(issue.rowIndex, list);
    }
    return map;
  }, [aiReview]);

  const songIssuesByKey = useMemo(() => {
    if (!aiReview) return new Map<string, AISongIssue[]>();
    const map = new Map<string, AISongIssue[]>();
    for (const issue of aiReview.songIssues) {
      const key = `${issue.setlistNumber}-${issue.songIndex}`;
      const list = map.get(key) || [];
      list.push(issue);
      map.set(key, list);
    }
    return map;
  }, [aiReview]);

  const handleAIReview = async () => {
    setAiLoading(true);
    try {
      const result = await requestAIReview(sanitized, locale);
      setAiReview(result);
      setShowAiPanel(true);
      
      // Check if there are suggestions to approve
      const hasSuggestions = [...result.showIssues, ...result.songIssues].some(i => i.suggestedValue);
      if (hasSuggestions) {
        setShowApprovalPanel(true);
        toast.info(t('aiReviewTitle'), { description: `Score: ${result.qualityScore}/100` });
      } else {
        toast.success(`AI Review: Score ${result.qualityScore}/100`);
      }
    } catch (err: any) {
      toast.error(t('aiError'), { description: err.message });
    } finally {
      setAiLoading(false);
    }
  };

  const handleApproveCategories = (approvedCategories: Set<string>) => {
    if (!aiReview) return;
    const enhanced = applyAISuggestions(sanitized, aiReview, approvedCategories);
    setAiEnhancedData(enhanced);
    setShowApprovalPanel(false);
    
    const totalSuggestions = [...aiReview.showIssues, ...aiReview.songIssues].filter(i => i.suggestedValue).length;
    const appliedCount = [...aiReview.showIssues, ...aiReview.songIssues]
      .filter(i => i.suggestedValue && approvedCategories.has(categorizeIssue(i))).length;
    
    toast.success(t('aiApprovalApplied', { count: appliedCount, total: totalSuggestions }));
  };

  const handleCancelApproval = () => {
    setShowApprovalPanel(false);
    // Don't apply any suggestions
  };

  const handleExportWithAI = () => {
    exportToExcel(displayData, locale, aiReview);
  };

  const handleWorksList = async () => {
    setWorksLoading(true);
    try {
      const result = generateWorksList(displayData);
      if (result.works && result.works.length > 0) {
        await exportWorksList(result.works);
        toast.success(t('worksListSuccess', { count: result.works.length }));
      } else {
        toast.warning(t('worksListEmpty'));
      }
    } catch (err: any) {
      toast.error(t('worksListError'), { description: err.message });
    } finally {
      setWorksLoading(false);
    }
  };

  const tabs = [
    { id: 'venues', label: t('datesAndVenues'), icon: Calendar },
    ...displayData.setlists.map(sl => ({
      id: `setlist-${sl.number}`,
      label: t('setListN', { n: sl.number }),
      icon: Music,
    })),
  ];

  return (
    <div className="space-y-4">
      {/* Sticky Action Bar */}
      <div className="sticky top-[73px] z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border -mx-6 px-6 py-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {onReset && (
              <button onClick={onReset} className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors border border-border">
                <RotateCcw className="h-3.5 w-3.5" />
                ➕ {t('newProcessing')}
              </button>
            )}
            {onSaveDraft && (
              <button onClick={() => onSaveDraft(displayData)} className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors border border-border">
                <Save className="h-3.5 w-3.5" />
                {t('saveDraft')}
              </button>
            )}
            
            {/* Export buttons */}
            {aiReview ? (
              <button onClick={handleExportWithAI} disabled={isBlockedByDataGuard} className="flex items-center gap-1.5 rounded-md gradient-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-all glow-amber-sm disabled:opacity-50 disabled:cursor-not-allowed">
                <Download className="h-3.5 w-3.5" />
                📊 {t('exportExcelAI')}
              </button>
            ) : (
              <button onClick={() => exportToExcel(displayData, locale)} disabled={isBlockedByDataGuard} className="flex items-center gap-1.5 rounded-md gradient-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-all glow-amber-sm disabled:opacity-50 disabled:cursor-not-allowed">
                <Download className="h-3.5 w-3.5" />
                📊 {t('exportExcel')}
              </button>
            )}
            <button onClick={() => exportToCsv(displayData, locale)} disabled={isBlockedByDataGuard} className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors border border-border">
              <Download className="h-3.5 w-3.5" />
              {t('exportCsv')}
            </button>
            
            {/* AI Review Button */}
            <button
              onClick={handleAIReview}
              disabled={aiLoading}
              className="flex items-center gap-1.5 rounded-md bg-accent/20 border border-accent/40 px-3 py-2 text-sm font-semibold text-accent hover:bg-accent/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
              {aiLoading ? t('aiReviewing') : t('aiReviewBtn')}
            </button>

            {/* Works List Button */}
            <button
              onClick={handleWorksList}
              disabled={worksLoading}
              className="flex items-center gap-1.5 rounded-md bg-primary/10 border border-primary/30 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {worksLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ListMusic className="h-3.5 w-3.5" />}
              {worksLoading ? t('worksListGenerating') : t('worksListBtn')}
            </button>
          </div>

          {/* Quality Filter Buttons */}
          <div className="flex items-center gap-1 rounded-lg bg-secondary p-1 border border-border">
            <button onClick={() => setQualityFilter('all')} className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${qualityFilter === 'all' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <Filter className="h-3 w-3" />
              {t('filterAll')}
            </button>
            <button onClick={() => setQualityFilter('invalid')} className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${qualityFilter === 'invalid' ? 'bg-destructive/15 text-destructive shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <XCircle className="h-3 w-3" />
              {counts.invalid} {t('filterInvalid')}
            </button>
            <button onClick={() => setQualityFilter('suspect')} className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${qualityFilter === 'suspect' ? 'bg-warning/15 text-warning shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <AlertTriangle className="h-3 w-3" />
              {counts.suspect} {t('filterSuspect')}
            </button>
            <button onClick={() => setQualityFilter('valid')} className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${qualityFilter === 'valid' ? 'bg-success/15 text-success shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <CheckCircle className="h-3 w-3" />
              {counts.valid} {t('filterValid')}
            </button>
          </div>
        </div>
      </div>

      {/* Report Summary */}
      <div className="rounded-lg bg-card border border-border p-5">
        <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">{t('reportTitle')}</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label={t('filesReceived')} value={data.filesProcessed} />
          <StatWithIcon label={t('processedSuccess')} value={data.filesSuccess} icon={<CheckCircle className="h-3.5 w-3.5 text-success" />} />
          <StatWithIcon label={t('withAlerts')} value={data.filesWithAlerts} icon={<AlertTriangle className="h-3.5 w-3.5 text-warning" />} />
          <StatWithIcon label={t('totalFailure')} value={data.filesWithFailures} icon={<XCircle className="h-3.5 w-3.5 text-destructive" />} />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mt-3 pt-3 border-t border-border">
          <Stat label={t('showsExtracted')} value={displayData.shows.length} />
          <Stat label={t('setlistsCreated')} value={displayData.setlists.length} />
          <Stat label={t('totalSongs')} value={totalSongs} />
          <StatWithIcon label={t('rejectedLines')} value={data.rejectedLines} icon={<Ban className="h-3.5 w-3.5 text-muted-foreground" />} />
        </div>

        {data.alerts.length > 0 && (
          <details className="mt-4 group">
            <summary className="text-xs font-semibold text-warning flex items-center gap-1 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
              <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
              <AlertTriangle className="h-3 w-3" /> {t('alertsTitle')} ({data.alerts.length})
            </summary>
            <div className="mt-1 space-y-1">
              {data.alerts.map((alert, i) => (
                <p key={i} className="text-xs text-muted-foreground ml-4">• {alert}</p>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* AI Review Panel — always visible after review */}
      {aiReview && (
        <div className="rounded-lg bg-card border border-accent/30 p-5">
          <button onClick={() => setShowAiPanel(!showAiPanel)} className="w-full flex items-center justify-between text-sm font-semibold text-accent uppercase tracking-wider">
            <span className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              {t('aiReviewTitle')} — Score: {aiReview.qualityScore}/100
            </span>
            {showAiPanel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showAiPanel && (
            <div className="mt-3 space-y-3">
              {/* Score bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      aiReview.qualityScore >= 75 ? 'bg-success' : aiReview.qualityScore >= 50 ? 'bg-warning' : 'bg-destructive'
                    }`}
                    style={{ width: `${aiReview.qualityScore}%` }}
                  />
                </div>
                <span className={`text-lg font-bold ${
                  aiReview.qualityScore >= 75 ? 'text-success' : aiReview.qualityScore >= 50 ? 'text-warning' : 'text-destructive'
                }`}>{aiReview.qualityScore}</span>
              </div>

              <p className="text-sm text-muted-foreground">{aiReview.summary}</p>

              {/* Auto-fill notice */}
              {[...aiReview.showIssues, ...aiReview.songIssues].filter(i => i.suggestedValue).length > 0 && !showApprovalPanel && aiEnhancedData && (
                <div className="rounded bg-success/10 border border-success/20 p-2 text-xs text-success flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                  {t('aiAutoFillNotice', { count: [...aiReview.showIssues, ...aiReview.songIssues].filter(i => i.suggestedValue).length })}
                </div>
              )}

              {/* Duplicates */}
              {aiReview.duplicates.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-warning flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {t('aiDuplicatesFound')}
                  </p>
                  {aiReview.duplicates.map((dup, i) => (
                    <p key={i} className="text-xs text-muted-foreground ml-4">• {dup.description}</p>
                  ))}
                </div>
              )}

              {/* Issues summary */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded bg-secondary p-2 text-center">
                  <p className="text-lg font-bold text-destructive">{aiReview.showIssues.filter(i => i.type === 'error').length + aiReview.songIssues.filter(i => i.type === 'error').length}</p>
                  <p className="text-xs text-muted-foreground">{t('aiErrorLabel')}</p>
                </div>
                <div className="rounded bg-secondary p-2 text-center">
                  <p className="text-lg font-bold text-warning">{aiReview.showIssues.filter(i => i.type === 'warning').length + aiReview.songIssues.filter(i => i.type === 'warning').length}</p>
                  <p className="text-xs text-muted-foreground">{t('aiWarning')}</p>
                </div>
                <div className="rounded bg-secondary p-2 text-center">
                  <p className="text-lg font-bold text-accent">{aiReview.showIssues.filter(i => i.type === 'suggestion').length + aiReview.songIssues.filter(i => i.type === 'suggestion').length}</p>
                  <p className="text-xs text-muted-foreground">{t('aiSuggestion')}</p>
                </div>
              </div>

              {aiReview.showIssues.length === 0 && aiReview.songIssues.length === 0 && aiReview.duplicates.length === 0 && (
                <p className="text-sm text-success flex items-center gap-1"><CheckCircle className="h-4 w-4" /> {t('aiNoIssues')}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* AI Suggestion Approval Panel */}
      {showApprovalPanel && aiReview && (
        <AISuggestionApproval
          showIssues={aiReview.showIssues}
          songIssues={aiReview.songIssues}
          onApprove={handleApproveCategories}
          onCancel={handleCancelApproval}
        />
      )}

      {/* Sanitization Report */}
      {totalCorrections > 0 && (
        <div className="rounded-lg bg-card border border-border p-5">
          <button onClick={() => setShowSanitization(!showSanitization)} className="w-full flex items-center justify-between text-sm font-semibold text-primary uppercase tracking-wider">
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
          <button onClick={() => setShowQuality(!showQuality)} className="w-full flex items-center justify-between text-sm font-semibold text-primary uppercase tracking-wider">
            <span>{t('qualityTitle')}</span>
            {showQuality ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showQuality && <QualityTable artists={report.artistQuality} />}
        </div>
      )}

      {/* QA Audit Report */}
      {audit.totalChecked > 0 && (
        <div className="rounded-lg bg-card border border-border p-5">
          <button onClick={() => setShowAudit(!showAudit)} className="w-full flex items-center justify-between text-sm font-semibold text-primary uppercase tracking-wider">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              {t('qaAuditTitle')} — {audit.totalFixed} {t('qaFixed')}, {audit.totalWarnings} {t('qaWarnings')}
            </span>
            {showAudit ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showAudit && (
            <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
              {audit.issues.length === 0 ? (
                <p className="text-sm text-success flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" /> {t('qaAllPassed')}
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="rounded bg-secondary p-2 text-center">
                      <p className="text-lg font-bold text-foreground">{audit.totalChecked}</p>
                      <p className="text-xs text-muted-foreground">{t('qaFieldsChecked')}</p>
                    </div>
                    <div className="rounded bg-secondary p-2 text-center">
                      <p className="text-lg font-bold text-success">{audit.totalFixed}</p>
                      <p className="text-xs text-muted-foreground">{t('qaAutoFixed')}</p>
                    </div>
                    <div className="rounded bg-secondary p-2 text-center">
                      <p className="text-lg font-bold text-warning">{audit.totalWarnings}</p>
                      <p className="text-xs text-muted-foreground">{t('qaPendingWarnings')}</p>
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

      {isBlockedByDataGuard && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
          <p className="text-sm font-semibold text-destructive flex items-center gap-2">
            <Ban className="h-4 w-4" />
            {t('dataGuardBlocked')}
          </p>
          <ul className="mt-2 list-disc pl-5 text-xs text-destructive/90 space-y-1">
            {audit.dataGuard.blockedReasons.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto rounded-lg bg-secondary p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-all ${
              activeTab === tab.id ? 'bg-card text-primary glow-amber-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table Content */}
      <div className="rounded-lg border border-border overflow-hidden">
        {activeTab === 'venues' && <VenuesTable shows={filteredShows} highlightedRows={audit.dataGuard.highlightedShowRows} aiIssues={showIssuesByRow} />}
        {displayData.setlists.map(sl =>
          activeTab === `setlist-${sl.number}` ? (
            <SetlistTable key={sl.number} setlistNumber={sl.number} songs={sl.songs} aiIssues={songIssuesByKey} />
          ) : null
        )}
      </div>

      {qualityFilter !== 'all' && filteredShows.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">{t('noFilterResults')}</p>
      )}
    </div>
  );
}

// --- Sub-components ---

function AIIssueIndicator({ issues }: { issues: (AIShowIssue | AISongIssue)[] }) {
  if (!issues || issues.length === 0) return null;

  return (
    <div className="space-y-1 mt-1">
      {issues.map((issue, idx) => {
        const colorClass = issue.type === 'error' ? 'text-destructive bg-destructive/10 border-destructive/20'
          : issue.type === 'warning' ? 'text-warning bg-warning/10 border-warning/20'
          : 'text-accent bg-accent/10 border-accent/20';

        const icon = issue.type === 'error' ? <XCircle className="h-3 w-3 shrink-0" />
          : issue.type === 'warning' ? <AlertTriangle className="h-3 w-3 shrink-0" />
          : <Sparkles className="h-3 w-3 shrink-0" />;

        return (
          <div key={idx} className={`flex items-start gap-1.5 rounded px-2 py-1 text-xs border ${colorClass}`}>
            {icon}
            <div className="min-w-0">
              <span>{issue.message}</span>
              {issue.suggestedValue && (
                <span className="block font-medium mt-0.5">→ {issue.suggestedValue} ✅</span>
              )}
              {'confidence' in issue && issue.confidence && (
                <span className={`inline-block mt-0.5 mr-1 rounded px-1 py-0.5 text-[10px] font-medium ${
                  issue.confidence === 'high' ? 'bg-success/20 text-success' :
                  issue.confidence === 'medium' ? 'bg-warning/20 text-warning' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {issue.confidence}
                </span>
              )}
              {'source' in issue && issue.source && (
                <span className="inline-block mt-0.5 text-[10px] text-muted-foreground italic">{issue.source}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SanitizationDetails({ report }: { report: SanitizationReport }) {
  const { t } = useI18n();
  const items = [
    { label: t('corrDateInArtist'), value: report.correction1_dateInArtist + report.correction1_tourInArtist },
    { label: t('corrVenueInDate'), value: report.correction2_venueInDate },
    { label: t('corrMetadata'), value: report.correction3_metadataPropagated },
    { label: t('corrDuplicates'), value: report.correction4_duplicatesRemoved },
    { label: t('corrBmg'), value: report.correction5_bmgNormalized },
    { label: t('corrDates'), value: report.correction6_datesNormalized },
    { label: t('corrCancelled'), value: report.correction7_cancelledShows },
    { label: t('corrDjBpm'), value: report.correction8_djBpmExtracted },
    { label: t('corrTerritory'), value: report.correction9_territoryInferred },
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
  const { t } = useI18n();
  const top = artists.slice(0, 20);
  const pctCell = (val: number) => (
    <span className={val >= 80 ? 'text-success' : val >= 50 ? 'text-warning' : 'text-destructive'}>
      {val}%
    </span>
  );

  const headers = [t('artist'), t('qualityLines'), `${t('date')}%`, `${t('city')}%`, `${t('venue')}%`, `${t('composers')}%`, `${t('bmgControl')}%`, t('avgScore')];

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-table-header">
            {headers.map(c => (
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

function VenuesTable({ shows, highlightedRows = [], aiIssues }: { shows: ProcessedData['shows']; highlightedRows?: number[]; aiIssues: Map<number, AIShowIssue[]> }) {
  const { t } = useI18n();
  const highlighted = new Set(highlightedRows);
  const hasAI = aiIssues.size > 0;
  const cols = [t('artist'), t('date'), t('territory'), t('city'), t('venue'), t('setListNum'), t('comments'), t('sourceFile')];
  if (hasAI) cols.push(t('aiComments'));

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
          {shows.map((show, i) => {
            const rowIssues = aiIssues.get(i) || [];
            return (
              <tr key={i} className={highlighted.has(i + 1) ? 'bg-destructive/20' : i % 2 === 1 ? 'bg-table-row-alt' : ''}>
                <td className="px-4 py-2.5 font-medium text-foreground">{show.artist}</td>
                <td className="px-4 py-2.5 font-mono text-sm text-muted-foreground">{show.date}</td>
                <td className="px-4 py-2.5">
                  {show.territory && !isMissing(show.territory) && (
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{show.territory}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-secondary-foreground">{show.city}</td>
                <td className="px-4 py-2.5 text-secondary-foreground">{show.venue}</td>
                <td className="px-4 py-2.5 text-center font-mono text-primary">{show.setListNumber}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{show.comments}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground truncate max-w-[200px]">{show.sourceFile}</td>
                {hasAI && (
                  <td className="px-4 py-2.5 min-w-[220px]">
                    <AIIssueIndicator issues={rowIssues} />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SetlistTable({ setlistNumber, songs, aiIssues }: { setlistNumber: number; songs: ProcessedData['setlists'][0]['songs']; aiIssues: Map<string, AISongIssue[]> }) {
  const { t } = useI18n();
  const hasAI = aiIssues.size > 0;
  const cols = ['#', t('songTitle'), t('composers'), t('bmgControl'), t('imaestroCode'), t('prsTunecode'), t('comments')];
  if (hasAI) cols.push(t('aiComments'));

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
          {songs.map((song, i) => {
            const key = `${setlistNumber}-${i}`;
            const songIssues = aiIssues.get(key) || [];
            return (
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
                {hasAI && (
                  <td className="px-4 py-2.5 min-w-[250px]">
                    <AIIssueIndicator issues={songIssues} />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
