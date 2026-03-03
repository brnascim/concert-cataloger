import { useState } from 'react';
import { Download, FileText, CheckCircle, BookOpen, Code, FolderTree, AlertTriangle, Wrench } from 'lucide-react';
import { generateDocumentation, downloadDocumentation } from '@/lib/docGenerator';
import { Button } from '@/components/ui/button';

export default function DocumentationPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = () => {
    const content = generateDocumentation();
    setPreview(content);
    setGenerated(true);
  };

  const handleDownload = () => {
    downloadDocumentation();
  };

  const sections = [
    { icon: FolderTree, label: 'Mapeamento Arquitetural', desc: 'Diagrama, fluxos, dependências e pontos críticos' },
    { icon: FolderTree, label: 'Estrutura por Pastas', desc: 'Hierarquia completa com propósito e relações' },
    { icon: Code, label: 'Descrição Técnica por Arquivo', desc: 'Fluxo lógico, hooks, props, regras de negócio' },
    { icon: BookOpen, label: 'Segmentação por Tipo', desc: 'Responsabilidades, dependências, complexidade' },
    { icon: AlertTriangle, label: 'Análise Crítica', desc: 'Code smells, acoplamento, violações de SRP' },
    { icon: Wrench, label: 'Sugestões de Refatoração', desc: 'Melhorias estruturais, performance, testes' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <FileText className="h-4 w-4" />
          Documentação Técnica
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          Gerador de Documentação Completa
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Gera automaticamente um arquivo <code className="text-primary font-mono text-sm">.txt</code> com a 
          descrição técnica aprofundada de todo o código da aplicação.
        </p>
      </div>

      {/* Sections Preview */}
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

      {/* Actions */}
      <div className="flex items-center justify-center gap-3">
        <Button
          onClick={handleGenerate}
          variant="outline"
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          {generated ? 'Regerar Preview' : 'Gerar Preview'}
        </Button>
        <Button
          onClick={handleDownload}
          className="gap-2 gradient-primary text-primary-foreground hover:opacity-90 glow-amber-sm"
        >
          <Download className="h-4 w-4" />
          📥 Baixar documentacao_tecnica_completa.txt
        </Button>
      </div>

      {generated && (
        <div className="flex items-center justify-center gap-2 text-sm text-success">
          <CheckCircle className="h-4 w-4" />
          Documentação gerada com sucesso!
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="bg-secondary px-4 py-2 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              📄 documentacao_tecnica_completa.txt
            </span>
            <span className="text-xs text-muted-foreground">
              {(new Blob([preview]).size / 1024).toFixed(1)} KB
            </span>
          </div>
          <pre className="p-4 text-xs text-muted-foreground font-mono overflow-auto max-h-[600px] whitespace-pre-wrap leading-relaxed">
            {preview}
          </pre>
        </div>
      )}
    </div>
  );
}
