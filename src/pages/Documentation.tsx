import { useState } from 'react';
import { Download, FileText, CheckCircle, BookOpen, Code, FolderTree, AlertTriangle, Wrench } from 'lucide-react';
import { generateDocumentation, downloadDocumentation } from '@/lib/docGenerator';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';

export default function DocumentationPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);
  const { t, locale } = useI18n();

  const handleGenerate = () => {
    const content = generateDocumentation(locale);
    setPreview(content);
    setGenerated(true);
  };

  const handleDownload = () => {
    downloadDocumentation(locale);
  };

  const sections = [
    { icon: FolderTree, label: t('docArchMap'), desc: t('docArchMapDesc') },
    { icon: FolderTree, label: t('docFolderStruct'), desc: t('docFolderStructDesc') },
    { icon: Code, label: t('docTechDesc'), desc: t('docTechDescDesc') },
    { icon: BookOpen, label: t('docSegmentation'), desc: t('docSegmentationDesc') },
    { icon: AlertTriangle, label: t('docCritical'), desc: t('docCriticalDesc') },
    { icon: Wrench, label: t('docRefactor'), desc: t('docRefactorDesc') },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <FileText className="h-4 w-4" />
          {t('docTitle')}
        </div>
        <h2 className="text-2xl font-bold text-foreground">{t('docHeading')}</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          {t('docDesc')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sections.map((s, i) => (
          <div key={i} className="rounded-lg bg-card border border-border p-4 flex items-start gap-3">
            <div className="flex-shrink-0 h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{s.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-3">
        <Button onClick={handleGenerate} variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          {generated ? t('docRegenPreview') : t('docGenPreview')}
        </Button>
        <Button onClick={handleDownload} className="gap-2 gradient-primary text-primary-foreground hover:opacity-90 glow-amber-sm">
          <Download className="h-4 w-4" />
          {t('docDownload')}
        </Button>
      </div>

      {generated && (
        <div className="flex items-center justify-center gap-2 text-sm text-success">
          <CheckCircle className="h-4 w-4" />
          {t('docGenSuccess')}
        </div>
      )}

      {preview && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="bg-secondary px-4 py-2 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">📄 documentacao_tecnica_completa.txt</span>
            <span className="text-xs text-muted-foreground">{(new Blob([preview]).size / 1024).toFixed(1)} KB</span>
          </div>
          <pre className="p-4 text-xs text-muted-foreground font-mono overflow-auto max-h-[600px] whitespace-pre-wrap leading-relaxed">
            {preview}
          </pre>
        </div>
      )}
    </div>
  );
}
