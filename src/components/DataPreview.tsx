import { useState } from 'react';
import { Download, Calendar, Music, AlertTriangle, CheckCircle, XCircle, Ban } from 'lucide-react';
import type { ProcessedData } from '@/lib/types';
import { exportToExcel } from '@/lib/exporter';

interface DataPreviewProps {
  data: ProcessedData;
}

export function DataPreview({ data }: DataPreviewProps) {
  const [activeTab, setActiveTab] = useState<string>('venues');
  const totalSongs = data.setlists.reduce((sum, sl) => sum + sl.songs.length, 0);

  const tabs = [
    { id: 'venues', label: 'Dates & Venues', icon: Calendar },
    ...data.setlists.map(sl => ({
      id: `setlist-${sl.number}`,
      label: `Set List ${sl.number}`,
      icon: Music,
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Report Summary */}
      <div className="rounded-lg bg-card border border-border p-5">
        <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
          📊 Relatório de Processamento
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Arquivos recebidos" value={data.filesProcessed} />
          <StatWithIcon label="Processados com sucesso" value={data.filesSuccess} icon={<CheckCircle className="h-3.5 w-3.5 text-green-500" />} />
          <StatWithIcon label="Com alertas" value={data.filesWithAlerts} icon={<AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />} />
          <StatWithIcon label="Falha total" value={data.filesWithFailures} icon={<XCircle className="h-3.5 w-3.5 text-destructive" />} />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mt-3 pt-3 border-t border-border">
          <Stat label="Shows extraídos" value={data.shows.length} />
          <Stat label="Setlists criados" value={data.setlists.length} />
          <Stat label="Total de músicas" value={totalSongs} />
          <StatWithIcon label="Linhas rejeitadas" value={data.rejectedLines} icon={<Ban className="h-3.5 w-3.5 text-muted-foreground" />} />
        </div>

        {data.alerts.length > 0 && (
          <div className="mt-4 space-y-1">
            <p className="text-xs font-semibold text-warning flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> ALERTAS / AMBIGUIDADES
            </p>
            {data.alerts.map((alert, i) => (
              <p key={i} className="text-xs text-muted-foreground ml-4">• {alert}</p>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
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
        {activeTab === 'venues' && <VenuesTable shows={data.shows} />}
        {data.setlists.map(sl =>
          activeTab === `setlist-${sl.number}` ? (
            <SetlistTable key={sl.number} songs={sl.songs} />
          ) : null
        )}
      </div>

      {/* Export */}
      <button
        onClick={() => exportToExcel(data)}
        className="flex items-center gap-2 rounded-md gradient-primary px-5 py-3 font-semibold text-primary-foreground transition-all hover:opacity-90 glow-amber"
      >
        <Download className="h-4 w-4" />
        Exportar Excel (.xlsx)
      </button>
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
  const cols = ['Artist', 'Date', 'Territory', 'City', 'Venue', 'Set List #', 'Comments'];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-table-header">
            {cols.map(c => (
              <th key={c} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shows.map((show, i) => (
            <tr key={i} className={i % 2 === 1 ? 'bg-table-row-alt' : ''}>
              <td className="px-4 py-2.5 font-medium text-foreground">{show.artist}</td>
              <td className="px-4 py-2.5 font-mono text-sm text-muted-foreground">{show.date}</td>
              <td className="px-4 py-2.5">
                {show.territory && (
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {show.territory}
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5 text-secondary-foreground">{show.city}</td>
              <td className="px-4 py-2.5 text-secondary-foreground">{show.venue}</td>
              <td className="px-4 py-2.5 text-center font-mono text-primary">{show.setListNumber}</td>
              <td className="px-4 py-2.5 text-xs text-muted-foreground">{show.comments}</td>
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
              <th key={c} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {c}
              </th>
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
                  <span className="rounded bg-accent/20 px-2 py-0.5 text-xs text-accent">
                    {song.comments}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
