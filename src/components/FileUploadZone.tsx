import { useCallback, useState, useRef } from 'react';
import { Upload, FileText, X, FolderOpen } from 'lucide-react';
import type { UploadedFile } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

interface FileUploadZoneProps {
  onFilesLoaded: (files: UploadedFile[]) => void;
}

export function FileUploadZone({ onFilesLoaded }: FileUploadZoneProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  const ACCEPTED_EXTENSIONS = ['.txt', '.csv', '.rtf', '.docx', '.pdf', '.xlsx', '.xlsm'];

  const filterValidFiles = (fileList: File[]): File[] => {
    return fileList.filter(f => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      return ACCEPTED_EXTENSIONS.includes(ext);
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const entries: FileSystemEntry[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry) entries.push(entry);
      }
      if (entries.some(e => e.isDirectory)) {
        readEntriesRecursively(entries).then(readFiles => {
          const valid = filterValidFiles(readFiles);
          setFiles(prev => [...prev, ...valid]);
        });
        return;
      }
    }
    const dropped = filterValidFiles(Array.from(e.dataTransfer.files));
    setFiles(prev => [...prev, ...dropped]);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const valid = filterValidFiles(Array.from(e.target.files));
      setFiles(prev => [...prev, ...valid]);
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
      const fullName = (file as any).webkitRelativePath || file.name;
      if (isBinary) {
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
        <input
          ref={folderInputRef}
          type="file"
          // @ts-ignore
          webkitdirectory=""
          directory=""
          multiple
          className="hidden"
          onChange={handleFileInput}
        />
        <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-medium text-foreground">{t('dragDrop')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('dragDropFormats')}</p>
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
        className="w-full flex items-center justify-center gap-2 rounded-md bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors border border-border"
      >
        <FolderOpen className="h-4 w-4" />
        {t('selectFolder')}
      </button>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="flex items-center justify-between rounded-md bg-secondary px-4 py-2"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm text-secondary-foreground truncate max-w-[300px]">
                  {(file as any).webkitRelativePath || file.name}
                </span>
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
            {isProcessing ? t('processing') : t('processFiles', { count: files.length, plural: files.length > 1 ? 's' : '' })}
          </button>
        </div>
      )}
    </div>
  );
}

async function readEntriesRecursively(entries: FileSystemEntry[]): Promise<File[]> {
  const files: File[] = [];

  async function readEntry(entry: FileSystemEntry, path: string): Promise<void> {
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      const file = await new Promise<File>((resolve, reject) => {
        fileEntry.file(resolve, reject);
      });
      Object.defineProperty(file, 'webkitRelativePath', {
        value: path + file.name,
        writable: false,
      });
      files.push(file);
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry;
      const reader = dirEntry.createReader();
      const subEntries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });
      for (const sub of subEntries) {
        await readEntry(sub, path + entry.name + '/');
      }
    }
  }

  for (const entry of entries) {
    await readEntry(entry, '');
  }

  return files;
}
