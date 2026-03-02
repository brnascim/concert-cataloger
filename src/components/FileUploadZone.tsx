import { useCallback, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import type { UploadedFile } from '@/lib/types';

interface FileUploadZoneProps {
  onFilesLoaded: (files: UploadedFile[]) => void;
}

export function FileUploadZone({ onFilesLoaded }: FileUploadZoneProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...dropped]);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    setIsProcessing(true);
    const loaded: UploadedFile[] = [];

    for (const file of files) {
      const ext = file.name.toLowerCase();
      const isBinary = ext.endsWith('.xlsx') || ext.endsWith('.xlsm') || ext.endsWith('.docx');
      // Preserve folder path from webkitRelativePath if available
      const fullName = (file as any).webkitRelativePath || file.name;
      if (isBinary) {
        // Read as binary string for ExcelJS / mammoth
        const buffer = await file.arrayBuffer();
        const binary = Array.from(new Uint8Array(buffer))
          .map(b => String.fromCharCode(b))
          .join('');
        loaded.push({ name: fullName, content: binary, type: file.type || 'application/octet-stream' });
      } else {
        const content = await file.text();
        loaded.push({ name: fullName, content, type: file.type || 'text/plain' });
      }
    }

    onFilesLoaded(loaded);
    setIsProcessing(false);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-10 text-center transition-all cursor-pointer
          ${isDragging
            ? 'border-primary bg-primary/5 glow-amber'
            : 'border-border hover:border-muted-foreground'
          }
        `}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept=".txt,.csv,.rtf,.docx,.pdf,.xlsx,.xlsm"
          className="hidden"
          onChange={handleFileInput}
        />
        <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-medium text-foreground">
          Arraste arquivos aqui ou clique para selecionar
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          TXT, CSV, RTF, DOCX, PDF, XLSX, XLSM
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="flex items-center justify-between rounded-md bg-secondary px-4 py-2"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm text-secondary-foreground">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}

          <button
            onClick={processFiles}
            disabled={isProcessing}
            className="w-full rounded-md gradient-primary py-3 px-4 font-semibold text-primary-foreground transition-all hover:opacity-90 glow-amber disabled:opacity-50"
          >
            {isProcessing ? 'Processando...' : `Processar ${files.length} arquivo${files.length > 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  );
}
