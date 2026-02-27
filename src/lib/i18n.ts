import { useState, useCallback, useEffect } from 'react';

export type Locale = 'pt' | 'en' | 'es' | 'de';

const translations = {
  pt: {
    // App
    appName: 'Setlist Agent',
    appSubtitle: 'Extração e padronização de setlists musicais',
    
    // Nav
    navImport: 'Importação',
    navSearch: 'Consulta',
    
    // Upload
    uploadTitle: 'Importe seus arquivos de setlist',
    uploadDesc: 'Envie arquivos TXT, CSV, DOCX, PDF ou XLSX e receba um Excel padronizado com shows e setlists.',
    dragDrop: 'Arraste arquivos aqui ou clique para selecionar',
    processing: 'Processando...',
    processFiles: 'Processar {count} arquivo{plural}',
    
    // Results
    result: 'Resultado',
    newProcessing: '← Novo processamento',
    reportTitle: '📊 Relatório de Processamento',
    filesReceived: 'Arquivos recebidos',
    processedSuccess: 'Processados com sucesso',
    withAlerts: 'Com alertas',
    totalFailure: 'Falha total',
    showsExtracted: 'Shows extraídos',
    setlistsCreated: 'Setlists criados',
    totalSongs: 'Total de músicas',
    rejectedLines: 'Linhas rejeitadas',
    alertsTitle: 'ALERTAS / AMBIGUIDADES',
    
    // Table headers
    artist: 'Artista',
    date: 'Data',
    territory: 'Território',
    city: 'Cidade',
    venue: 'Venue',
    setListNum: 'Set List #',
    comments: 'Comentários',
    songTitle: 'Título da Música',
    composers: 'Compositor(es)',
    bmgControl: 'Controle BMG',
    imaestroCode: 'Código iMaestro',
    prsTunecode: 'PRS Tunecode',
    
    // Export
    exportExcel: 'Exportar Excel (.xlsx)',
    exportCsv: 'Exportar CSV',
    exportResults: 'Exportar Resultados',
    
    // Search
    searchTitle: 'Consulta de Setlists',
    searchBtn: 'Buscar',
    clearFilters: 'Limpar filtros',
    period: 'Período',
    from: 'De',
    to: 'Até',
    all: 'Todos',
    headliner: 'Headliner',
    status: 'Status',
    statusSuccess: 'Sucesso',
    statusPartial: 'Parcial',
    statusFailed: 'Falha',
    resultsCount: 'Exibindo {from}–{to} de {total} resultados',
    noResults: 'Nenhum resultado encontrado.',
    perPage: 'por página',
    previous: 'Anterior',
    next: 'Próximo',
    columns: 'Colunas',
    selectAll: 'Selecionar todos',
    exportSelected: 'Exportar selecionados',
    
    // Theme
    themeLight: '☀️ Claro',
    themeDark: '🌑 Escuro',
    themeBmg: '🎵 BMG',
    
    // Language
    language: 'Idioma',
  },
  en: {
    appName: 'Setlist Agent',
    appSubtitle: 'Extraction and standardization of music setlists',
    navImport: 'Import',
    navSearch: 'Search',
    uploadTitle: 'Import your setlist files',
    uploadDesc: 'Upload TXT, CSV, DOCX, PDF or XLSX files and get a standardized Excel with shows and setlists.',
    dragDrop: 'Drag files here or click to select',
    processing: 'Processing...',
    processFiles: 'Process {count} file{plural}',
    result: 'Result',
    newProcessing: '← New processing',
    reportTitle: '📊 Processing Report',
    filesReceived: 'Files received',
    processedSuccess: 'Processed successfully',
    withAlerts: 'With alerts',
    totalFailure: 'Total failure',
    showsExtracted: 'Shows extracted',
    setlistsCreated: 'Setlists created',
    totalSongs: 'Total songs',
    rejectedLines: 'Rejected lines',
    alertsTitle: 'ALERTS / AMBIGUITIES',
    artist: 'Artist',
    date: 'Date',
    territory: 'Territory',
    city: 'City',
    venue: 'Venue',
    setListNum: 'Set List #',
    comments: 'Comments',
    songTitle: 'Song Title',
    composers: 'Composer(s)',
    bmgControl: 'BMG Control',
    imaestroCode: 'iMaestro Code',
    prsTunecode: 'PRS Tunecode',
    exportExcel: 'Export Excel (.xlsx)',
    exportCsv: 'Export CSV',
    exportResults: 'Export Results',
    searchTitle: 'Setlist Search',
    searchBtn: 'Search',
    clearFilters: 'Clear filters',
    period: 'Period',
    from: 'From',
    to: 'To',
    all: 'All',
    headliner: 'Headliner',
    status: 'Status',
    statusSuccess: 'Success',
    statusPartial: 'Partial',
    statusFailed: 'Failed',
    resultsCount: 'Showing {from}–{to} of {total} results',
    noResults: 'No results found.',
    perPage: 'per page',
    previous: 'Previous',
    next: 'Next',
    columns: 'Columns',
    selectAll: 'Select all',
    exportSelected: 'Export selected',
    themeLight: '☀️ Light',
    themeDark: '🌑 Dark',
    themeBmg: '🎵 BMG',
    language: 'Language',
  },
  es: {
    appName: 'Setlist Agent',
    appSubtitle: 'Extracción y estandarización de setlists musicales',
    navImport: 'Importación',
    navSearch: 'Consulta',
    uploadTitle: 'Importe sus archivos de setlist',
    uploadDesc: 'Envíe archivos TXT, CSV, DOCX, PDF o XLSX y reciba un Excel estandarizado con shows y setlists.',
    dragDrop: 'Arrastre archivos aquí o haga clic para seleccionar',
    processing: 'Procesando...',
    processFiles: 'Procesar {count} archivo{plural}',
    result: 'Resultado',
    newProcessing: '← Nuevo procesamiento',
    reportTitle: '📊 Informe de Procesamiento',
    filesReceived: 'Archivos recibidos',
    processedSuccess: 'Procesados con éxito',
    withAlerts: 'Con alertas',
    totalFailure: 'Falla total',
    showsExtracted: 'Shows extraídos',
    setlistsCreated: 'Setlists creados',
    totalSongs: 'Total de canciones',
    rejectedLines: 'Líneas rechazadas',
    alertsTitle: 'ALERTAS / AMBIGÜEDADES',
    artist: 'Artista',
    date: 'Fecha',
    territory: 'Territorio',
    city: 'Ciudad',
    venue: 'Venue',
    setListNum: 'Set List #',
    comments: 'Comentarios',
    songTitle: 'Título de la Canción',
    composers: 'Compositor(es)',
    bmgControl: 'Control BMG',
    imaestroCode: 'Código iMaestro',
    prsTunecode: 'PRS Tunecode',
    exportExcel: 'Exportar Excel (.xlsx)',
    exportCsv: 'Exportar CSV',
    exportResults: 'Exportar Resultados',
    searchTitle: 'Consulta de Setlists',
    searchBtn: 'Buscar',
    clearFilters: 'Limpiar filtros',
    period: 'Período',
    from: 'Desde',
    to: 'Hasta',
    all: 'Todos',
    headliner: 'Headliner',
    status: 'Estado',
    statusSuccess: 'Éxito',
    statusPartial: 'Parcial',
    statusFailed: 'Fallido',
    resultsCount: 'Mostrando {from}–{to} de {total} resultados',
    noResults: 'No se encontraron resultados.',
    perPage: 'por página',
    previous: 'Anterior',
    next: 'Siguiente',
    columns: 'Columnas',
    selectAll: 'Seleccionar todos',
    exportSelected: 'Exportar seleccionados',
    themeLight: '☀️ Claro',
    themeDark: '🌑 Oscuro',
    themeBmg: '🎵 BMG',
    language: 'Idioma',
  },
  de: {
    appName: 'Setlist Agent',
    appSubtitle: 'Extraktion und Standardisierung von Musik-Setlists',
    navImport: 'Import',
    navSearch: 'Suche',
    uploadTitle: 'Importieren Sie Ihre Setlist-Dateien',
    uploadDesc: 'Laden Sie TXT, CSV, DOCX, PDF oder XLSX Dateien hoch und erhalten Sie ein standardisiertes Excel mit Shows und Setlists.',
    dragDrop: 'Dateien hierher ziehen oder klicken zum Auswählen',
    processing: 'Verarbeitung...',
    processFiles: '{count} Datei{plural} verarbeiten',
    result: 'Ergebnis',
    newProcessing: '← Neue Verarbeitung',
    reportTitle: '📊 Verarbeitungsbericht',
    filesReceived: 'Empfangene Dateien',
    processedSuccess: 'Erfolgreich verarbeitet',
    withAlerts: 'Mit Warnungen',
    totalFailure: 'Totalausfall',
    showsExtracted: 'Extrahierte Shows',
    setlistsCreated: 'Erstellte Setlists',
    totalSongs: 'Gesamte Lieder',
    rejectedLines: 'Abgelehnte Zeilen',
    alertsTitle: 'WARNUNGEN / MEHRDEUTIGKEITEN',
    artist: 'Künstler',
    date: 'Datum',
    territory: 'Gebiet',
    city: 'Stadt',
    venue: 'Veranstaltungsort',
    setListNum: 'Set List #',
    comments: 'Kommentare',
    songTitle: 'Songtitel',
    composers: 'Komponist(en)',
    bmgControl: 'BMG Kontrolle',
    imaestroCode: 'iMaestro Code',
    prsTunecode: 'PRS Tunecode',
    exportExcel: 'Excel exportieren (.xlsx)',
    exportCsv: 'CSV exportieren',
    exportResults: 'Ergebnisse exportieren',
    searchTitle: 'Setlist-Suche',
    searchBtn: 'Suchen',
    clearFilters: 'Filter löschen',
    period: 'Zeitraum',
    from: 'Von',
    to: 'Bis',
    all: 'Alle',
    headliner: 'Headliner',
    status: 'Status',
    statusSuccess: 'Erfolg',
    statusPartial: 'Teilweise',
    statusFailed: 'Fehlgeschlagen',
    resultsCount: 'Zeige {from}–{to} von {total} Ergebnissen',
    noResults: 'Keine Ergebnisse gefunden.',
    perPage: 'pro Seite',
    previous: 'Zurück',
    next: 'Weiter',
    columns: 'Spalten',
    selectAll: 'Alle auswählen',
    exportSelected: 'Ausgewählte exportieren',
    themeLight: '☀️ Hell',
    themeDark: '🌑 Dunkel',
    themeBmg: '🎵 BMG',
    language: 'Sprache',
  },
} as const;

export type TranslationKey = keyof typeof translations.pt;

const STORAGE_KEY = 'setlist_agent_locale';

export function getStoredLocale(): Locale {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && ['pt', 'en', 'es', 'de'].includes(v)) return v as Locale;
  } catch {}
  return 'pt';
}

export function useI18n() {
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
  }, []);

  const t = useCallback((key: TranslationKey, vars?: Record<string, string | number>): string => {
    let text = (translations[locale] as any)[key] || (translations.pt as any)[key] || key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }
    return text;
  }, [locale]);

  return { locale, setLocale, t };
}

export const LOCALE_LABELS: Record<Locale, string> = {
  pt: 'Português',
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
};
