import { useState } from 'react';
import { Music } from 'lucide-react';
import { FileUploadZone } from '@/components/FileUploadZone';
import { DataPreview } from '@/components/DataPreview';
import { processFiles } from '@/lib/parser';
import type { ProcessedData, UploadedFile } from '@/lib/types';

const Index = () => {
  const [data, setData] = useState<ProcessedData | null>(null);

  const handleFilesLoaded = (files: UploadedFile[]) => {
    const result = processFiles(files);
    setData(result);
  };

  const handleReset = () => setData(null);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
            <Music className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">Setlist Agent</h1>
            <p className="text-xs text-muted-foreground">Extração e padronização de setlists musicais</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {!data ? (
          <div className="mx-auto max-w-2xl space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                Importe seus arquivos de setlist
              </h2>
              <p className="text-muted-foreground">
                Envie arquivos TXT, CSV, DOCX, PDF ou XLSX e receba um Excel padronizado com shows e setlists.
              </p>
            </div>
            <FileUploadZone onFilesLoaded={handleFilesLoaded} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Resultado</h2>
              <button
                onClick={handleReset}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Novo processamento
              </button>
            </div>
            <DataPreview data={data} />
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
