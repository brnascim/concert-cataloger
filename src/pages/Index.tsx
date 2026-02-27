import { useState } from 'react';
import { FileUploadZone } from '@/components/FileUploadZone';
import { DataPreview } from '@/components/DataPreview';
import { AppHeader } from '@/components/AppHeader';
import { processFiles } from '@/lib/parser';
import { useI18n } from '@/lib/i18n';
import type { ProcessedData, UploadedFile } from '@/lib/types';
import SearchPage from '@/pages/Search';

const Index = () => {
  const [data, setData] = useState<ProcessedData | null>(null);
  const [activeTab, setActiveTab] = useState<'import' | 'search'>('import');
  const { t } = useI18n();

  const handleFilesLoaded = async (files: UploadedFile[]) => {
    const result = await processFiles(files);
    setData(result);
  };

  const handleReset = () => setData(null);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="mx-auto max-w-5xl px-6 py-8">
        {activeTab === 'import' ? (
          !data ? (
            <div className="mx-auto max-w-2xl space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-foreground">{t('uploadTitle')}</h2>
                <p className="text-muted-foreground">{t('uploadDesc')}</p>
              </div>
              <FileUploadZone onFilesLoaded={handleFilesLoaded} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">{t('result')}</h2>
                <button
                  onClick={handleReset}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('newProcessing')}
                </button>
              </div>
              <DataPreview data={data} />
            </div>
          )
        ) : (
          <SearchPage />
        )}
      </main>
    </div>
  );
};

export default Index;
