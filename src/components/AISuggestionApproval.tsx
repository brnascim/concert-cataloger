import { useState, useMemo } from 'react';
import { CheckCircle, XCircle, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { categorizeIssue, type AIShowIssue, type AISongIssue } from '@/lib/aiReview';

type AnyIssue = AIShowIssue | AISongIssue;

interface SuggestionCategory {
  id: string;
  label: string;
  description: string;
  issues: AnyIssue[];
  approved: boolean;
}

const CATEGORY_META: Record<string, { icon: string }> = {
  territory_normalization: { icon: '🌍' },
  artist_correction: { icon: '🎤' },
  composer_attribution: { icon: '🎼' },
  date_normalization: { icon: '📅' },
  venue_city_correction: { icon: '📍' },
  title_normalization: { icon: '🎵' },
  bmg_control: { icon: '🏷️' },
  headliner_correction: { icon: '⭐' },
  other: { icon: '📝' },
};

interface AISuggestionApprovalProps {
  showIssues: AIShowIssue[];
  songIssues: AISongIssue[];
  onApprove: (approvedCategories: Set<string>) => void;
  onCancel: () => void;
}

export function AISuggestionApproval({ showIssues, songIssues, onApprove, onCancel }: AISuggestionApprovalProps) {
  const { t } = useI18n();

  // Only include issues that have suggestedValue
  const allSuggestions = useMemo(() => {
    const issues: AnyIssue[] = [
      ...showIssues.filter(i => i.suggestedValue),
      ...songIssues.filter(i => i.suggestedValue),
    ];
    return issues;
  }, [showIssues, songIssues]);

  const categories = useMemo(() => {
    const grouped = new Map<string, AnyIssue[]>();
    for (const issue of allSuggestions) {
      const cat = categorizeIssue(issue);
      const list = grouped.get(cat) || [];
      list.push(issue);
      grouped.set(cat, list);
    }

    return [...grouped.entries()].map(([id, issues]): SuggestionCategory => ({
      id,
      label: getCategoryLabel(id),
      description: getCategoryDescription(id, issues),
      issues,
      approved: true, // default: all approved
    }));
  }, [allSuggestions]);

  const [approvalState, setApprovalState] = useState<Record<string, boolean>>(() => {
    const state: Record<string, boolean> = {};
    categories.forEach(c => { state[c.id] = true; });
    return state;
  });

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const toggleCategory = (id: string) => {
    setApprovalState(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const approvedSuggestions = categories
    .filter(c => approvalState[c.id])
    .reduce((sum, c) => sum + c.issues.length, 0);
  const totalSuggestions = allSuggestions.length;

  const handleApprove = () => {
    const approved = new Set<string>();
    for (const [id, isApproved] of Object.entries(approvalState)) {
      if (isApproved) approved.add(id);
    }
    onApprove(approved);
  };

  if (categories.length === 0) {
    onApprove(new Set());
    return null;
  }

  return (
    <div className="rounded-lg border border-accent/30 bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-accent uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          {t('aiApprovalTitle')}
        </h3>
        <span className="text-xs text-muted-foreground">
          {approvedSuggestions}/{totalSuggestions} {t('aiApprovalSuggestions')}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">{t('aiApprovalDesc')}</p>

      {/* Select all / deselect all */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            const newState: Record<string, boolean> = {};
            categories.forEach(c => { newState[c.id] = true; });
            setApprovalState(newState);
          }}
          className="text-xs text-accent hover:underline"
        >
          {t('aiApprovalSelectAll')}
        </button>
        <span className="text-xs text-muted-foreground">|</span>
        <button
          onClick={() => {
            const newState: Record<string, boolean> = {};
            categories.forEach(c => { newState[c.id] = false; });
            setApprovalState(newState);
          }}
          className="text-xs text-muted-foreground hover:underline"
        >
          {t('aiApprovalDeselectAll')}
        </button>
      </div>

      {/* Category cards */}
      <div className="space-y-2">
        {categories.map(cat => {
          const isApproved = approvalState[cat.id];
          const isExpanded = expandedCategory === cat.id;
          const meta = CATEGORY_META[cat.id] || CATEGORY_META.other;

          return (
            <div
              key={cat.id}
              className={`rounded-lg border p-3 transition-all ${
                isApproved
                  ? 'border-accent/30 bg-accent/5'
                  : 'border-border bg-secondary/30 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Toggle */}
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                    isApproved
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-secondary text-muted-foreground border border-border'
                  }`}
                >
                  {isApproved ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                </button>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{meta.icon}</span>
                    <span className={`text-sm font-medium ${isApproved ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                      {cat.label}
                    </span>
                    <span className="text-xs text-muted-foreground rounded-full bg-secondary px-2 py-0.5">
                      {cat.issues.length}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{cat.description}</p>
                </div>

                {/* Expand */}
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-3 space-y-1 max-h-48 overflow-y-auto pl-9">
                  {cat.issues.map((issue, idx) => (
                    <div key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5 py-1 border-b border-border/50 last:border-0">
                      <span className="shrink-0 text-accent">→</span>
                      <div className="min-w-0">
                        <span>{issue.message}</span>
                        {issue.suggestedValue && (
                          <span className="block font-medium text-accent mt-0.5">
                            {t('aiApprovalNewValue')}: {issue.suggestedValue}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <button
          onClick={handleApprove}
          className="flex-1 rounded-lg gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-all glow-amber-sm"
        >
          {t('aiApprovalApply')} ({approvedSuggestions})
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors border border-border"
        >
          {t('aiApprovalCancel')}
        </button>
      </div>
    </div>
  );
}

function getCategoryLabel(id: string): string {
  const labels: Record<string, string> = {
    territory_normalization: 'Territory Normalization',
    artist_correction: 'Artist Correction',
    composer_attribution: 'Composer Attribution',
    date_normalization: 'Date Normalization',
    venue_city_correction: 'Venue/City Correction',
    title_normalization: 'Song Title Normalization',
    bmg_control: 'BMG Control',
    headliner_correction: 'Headliner Info',
    other: 'Other Suggestions',
  };
  return labels[id] || id;
}

function getCategoryDescription(id: string, issues: AnyIssue[]): string {
  // Build description from first issue message as example
  const example = issues[0]?.message || '';
  const shortExample = example.length > 80 ? example.substring(0, 77) + '...' : example;
  return `e.g.: ${shortExample}`;
}
