/**
 * Documentation Generator — Generates comprehensive technical documentation
 * of the entire Setlist Agent codebase as a downloadable .txt file.
 */

import type { Locale } from './i18n';

const DOC_TITLES: Record<string, { title: string; generated: string; filename: string }> = {
  pt: { title: 'DOCUMENTAÇÃO TÉCNICA COMPLETA — SETLIST AGENT', generated: 'Gerado automaticamente em', filename: 'documentacao_tecnica_completa.txt' },
  en: { title: 'COMPLETE TECHNICAL DOCUMENTATION — SETLIST AGENT', generated: 'Automatically generated on', filename: 'technical_documentation_complete.txt' },
  es: { title: 'DOCUMENTACIÓN TÉCNICA COMPLETA — SETLIST AGENT', generated: 'Generado automáticamente en', filename: 'documentacion_tecnica_completa.txt' },
  de: { title: 'VOLLSTÄNDIGE TECHNISCHE DOKUMENTATION — SETLIST AGENT', generated: 'Automatisch generiert am', filename: 'technische_dokumentation_vollstaendig.txt' },
};

export function generateDocumentation(locale: Locale = 'pt'): string {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const titles = DOC_TITLES[locale] || DOC_TITLES.pt;
  
  return `
================================================================================
  ${titles.title}
  ${titles.generated}: ${now}
================================================================================

================================================================================
4️⃣ MAPEAMENTO ARQUITETURAL GERAL
================================================================================

4.1 Descrição da Arquitetura
────────────────────────────
  Tipo: SPA (Single Page Application)
  Stack: React 18 + Vite 5 + TypeScript 5 + Tailwind CSS 3
  Backend: Lovable Cloud (Supabase) — banco de dados, autenticação, edge functions
  Padrão: Component-driven, modular, com separação clara entre UI e lógica de negócio

4.2 Padrão Arquitetural
────────────────────────
  - Component-Driven Architecture com hooks customizados
  - Modularização por responsabilidade (parsers, validators, exporters, sanitizers)
  - Pipeline de dados: Upload → Parse → Sanitize → Audit → Preview → Export
  - Autenticação local (in-memory) com sessões em sessionStorage
  - Internacionalização (i18n) com 4 idiomas (PT, EN, ES, DE)
  - Temas dinâmicos (Light, Dark, BMG) via CSS variables

4.3 Fluxo Principal da Aplicação
─────────────────────────────────
  1. Usuário faz login (email/senha ou Google simulado)
  2. Seleciona aba "Importação" ou "Consulta"
  3. [Importação] Upload de arquivos → processamento → preview → exportação
  4. [Consulta] Busca no banco de dados com filtros fuzzy e exatos

4.4 Fluxo de Dados (Pipeline de Processamento)
───────────────────────────────────────────────
  Upload (FileUploadZone)
    → Leitura de arquivos (.txt, .csv, .rtf, .docx, .xlsx, .xlsm)
    → Parser (parser.ts) — extrai shows e setlists
      → xlsxParser.ts (para Excel)
      → docxParser.ts (para DOCX/RTF)
      → parseTxtContent (para texto puro)
    → Validação (validator.ts) — rejeita linhas inválidas/ruído
    → De-duplicação (parser.ts) — agrupa shows idênticos
    → Sanitização (sanitizer.ts) — 9 correções automáticas
    → Auditoria QA (qaAuditor.ts) — valida campos, datas, separadores
    → Preview (DataPreview.tsx) — exibe tabelas com filtros
    → Exportação (exporter.ts / csvExporter.ts) — gera Excel/CSV

4.5 Diagrama Textual Simplificado
──────────────────────────────────
  ┌─────────────────┐
  │   AuthPage       │ ← Login (localAuth.ts)
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │   AppHeader      │ ← Navegação, Tema, i18n, Logout
  └────────┬────────┘
           ▼
  ┌─────────────────────────────────────────────┐
  │                Index (pages)                 │
  ├───────────────┬─────────────────────────────┤
  │  Importação    │        Consulta              │
  │                │                              │
  │ FileUploadZone │     Search.tsx               │
  │      ▼         │   (Supabase queries)         │
  │  processFiles  │   fuzzySearch.ts             │
  │      ▼         │   confidence.ts              │
  │  DataPreview   │                              │
  │   ▼       ▼    │                              │
  │ Excel    CSV   │                              │
  └───────────────┴─────────────────────────────┘
           │
           ▼
  ┌─────────────────────────────────────────┐
  │           Módulos de Suporte             │
  │                                          │
  │  normalizer.ts  — limpeza de texto/datas │
  │  validator.ts   — validação de registros │
  │  sanitizer.ts   — 9 correções pipeline   │
  │  qaAuditor.ts   — auditoria de qualidade │
  │  territory.ts   — mapeamento territorial │
  │  confidence.ts  — score de confiança     │
  │  fuzzySearch.ts — busca fuzzy            │
  │  infoNaoLocalizada.ts — campos vazios    │
  │  i18n.ts        — internacionalização    │
  │  theme.ts       — temas visuais          │
  └─────────────────────────────────────────┘

4.6 Dependências Principais
────────────────────────────
  - react / react-dom 18.3 — UI framework
  - vite 5 — bundler e dev server
  - typescript 5 — tipagem estática
  - tailwindcss 3 — utility-first CSS
  - exceljs — geração de arquivos Excel
  - mammoth — leitura de DOCX
  - @supabase/supabase-js — cliente de banco de dados
  - @tanstack/react-query — gerenciamento de estado assíncrono
  - lucide-react — ícones SVG
  - recharts — visualização de dados
  - sonner — toasts/notificações
  - zod — validação de schemas
  - react-router-dom — roteamento SPA

4.7 Pontos Críticos de Acoplamento
───────────────────────────────────
  1. parser.ts ↔ validator.ts — parsing depende das regras de validação
  2. sanitizer.ts ↔ normalizer.ts — sanitização usa normalização de datas
  3. DataPreview.tsx ↔ sanitizer.ts + qaAuditor.ts — preview executa pipeline completo
  4. localAuth.ts ↔ useAuth.tsx — autenticação local acoplada ao hook
  5. exporter.ts ↔ infoNaoLocalizada.ts — exportação depende do preenchimento de campos


================================================================================
1️⃣ ESTRUTURA POR PASTAS
================================================================================

──────────────────────────────────────────────
📁 public/
──────────────────────────────────────────────
  Propósito: Arquivos estáticos servidos diretamente pelo Vite sem processamento.
  Papel Arquitetural: Assets públicos acessíveis via URL direta.
  Relação: Referenciados em index.html e CSS.
  
  Arquivos:
  - favicon.ico — Ícone do navegador
  - placeholder.svg — Imagem placeholder genérica
  - robots.txt — Instruções para crawlers/SEO

──────────────────────────────────────────────
📁 src/components/
──────────────────────────────────────────────
  Propósito: Componentes React reutilizáveis da aplicação.
  Papel Arquitetural: Camada de apresentação (View layer).
  Relação: Consumidos pelas pages/, usam hooks/ e lib/.
  
  Arquivos:
  - AppHeader.tsx — Header persistente com navegação, temas e logout
  - AuthPage.tsx — Página de login com email/senha e Google
  - DataPreview.tsx — Visualização de dados processados com tabelas
  - FileUploadZone.tsx — Zona de drag-and-drop para upload de arquivos/pastas
  - NavLink.tsx — Wrapper do NavLink do react-router

  📁 src/components/ui/ — Componentes shadcn/ui (60+ arquivos)
    Propósito: Design system baseado em Radix UI + Tailwind CSS.
    Papel: Primitivos de UI consistentes e acessíveis.

──────────────────────────────────────────────
📁 src/hooks/
──────────────────────────────────────────────
  Propósito: Hooks customizados para lógica reutilizável.
  Papel Arquitetural: Camada de lógica compartilhada entre componentes.
  Relação: Consumidos por components/ e pages/.
  
  Arquivos:
  - useAuth.tsx — Gerencia sessão de autenticação local
  - useUserRole.tsx — Controle de permissões baseado em roles
  - use-mobile.tsx — Detecção de viewport mobile
  - use-toast.ts — Hook de notificações toast

──────────────────────────────────────────────
📁 src/integrations/
──────────────────────────────────────────────
  Propósito: Integrações com serviços externos (Lovable Cloud).
  Papel Arquitetural: Camada de acesso a dados e APIs externas.
  Relação: Consumido por pages/Search.tsx e componentes que acessam o banco.
  
  Arquivos:
  - supabase/client.ts — Cliente configurado do Supabase (auto-gerado)
  - supabase/types.ts — Tipagens do banco de dados (auto-gerado)
  - lovable/index.ts — Integração com Lovable platform

──────────────────────────────────────────────
📁 src/lib/
──────────────────────────────────────────────
  Propósito: Módulos de lógica de negócio pura (sem UI).
  Papel Arquitetural: Core da aplicação — parsing, validação, exportação.
  Relação: Consumido por components/, pages/ e hooks/.
  
  Arquivos:
  - parser.ts — Orquestrador principal de processamento de arquivos
  - xlsxParser.ts — Parser especializado para Excel (.xlsx/.xlsm)
  - docxParser.ts — Parser para DOCX (mammoth) e RTF
  - normalizer.ts — Normalização de texto Unicode e datas multi-idioma
  - validator.ts — Validação de shows e músicas (rejeição de ruído)
  - sanitizer.ts — Pipeline de 9 correções automáticas de dados
  - qaAuditor.ts — Auditoria de qualidade pós-processamento
  - exporter.ts — Exportação para Excel com formatação BMG
  - csvExporter.ts — Exportação para CSV com BOM UTF-8
  - confidence.ts — Cálculo de score de confiança por registro
  - fuzzySearch.ts — Busca fuzzy (Levenshtein, Jaro-Winkler, token set ratio)
  - territory.ts — Mapeamento e inferência de territórios
  - infoNaoLocalizada.ts — Preenchimento de campos vazios com texto padrão
  - i18n.ts — Sistema de internacionalização (PT, EN, ES, DE)
  - theme.ts — Gerenciamento de temas (Light, Dark, BMG)
  - localAuth.ts — Autenticação local em memória com sessões
  - types.ts — Interfaces TypeScript compartilhadas
  - utils.ts — Utilitários gerais (cn para classes CSS)

──────────────────────────────────────────────
📁 src/pages/
──────────────────────────────────────────────
  Propósito: Componentes de página (rotas).
  Papel Arquitetural: Entry points de navegação da SPA.
  Relação: Montados pelo react-router em App.tsx.
  
  Arquivos:
  - Index.tsx — Página principal (importação + consulta)
  - Search.tsx — Página de consulta avançada com filtros fuzzy
  - NotFound.tsx — Página 404

──────────────────────────────────────────────
📁 src/test/
──────────────────────────────────────────────
  Propósito: Testes unitários e configuração de test runner.
  Papel Arquitetural: Quality assurance automatizado.
  
  Arquivos:
  - setup.ts — Configuração do Vitest
  - example.test.ts — Teste de exemplo


================================================================================
2️⃣ e 3️⃣ SEGMENTAÇÃO POR TIPO E DESCRIÇÃO TÉCNICA APROFUNDADA
================================================================================

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 src/App.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tipo: .tsx (React Component)
  Responsabilidade: Root component — orquestra autenticação e roteamento
  Dependências: react-query, react-router-dom, useAuth hook
  Componentes exportados: App (default)
  Hooks utilizados: useAuth
  Complexidade: Baixa

  Fluxo lógico:
  - Cria QueryClient para react-query
  - AppContent verifica sessão via useAuth()
  - Se loading → exibe spinner
  - Se !session → renderiza AuthPage
  - Se autenticado → renderiza BrowserRouter com rotas
  
  Gestão de estado:
  - session/loading gerenciados pelo hook useAuth
  - setLoggedIn callback passado ao AuthPage
  
  Props: Nenhuma (root component)
  Side effects: Nenhum direto
  Persistência: Delegada ao useAuth (sessionStorage)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 src/main.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tipo: .tsx
  Responsabilidade: Entry point — monta App no DOM
  Dependências: react-dom, App, index.css
  Complexidade: Baixa
  
  Fluxo: createRoot → render(<App />)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 src/pages/Index.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tipo: .tsx (Page Component)
  Responsabilidade: Página principal com abas de importação e consulta
  Dependências: FileUploadZone, DataPreview, AppHeader, processFiles, useI18n, SearchPage
  Hooks: useState, useI18n
  Complexidade: Média

  Gestão de estado:
  - data: ProcessedData | null — dados processados dos arquivos
  - activeTab: 'import' | 'search' — aba ativa

  Fluxo lógico:
  1. Exibe AppHeader com controle de abas
  2. Aba 'import': se !data → FileUploadZone; se data → DataPreview
  3. Aba 'search': renderiza SearchPage
  
  Funções:
  - handleFilesLoaded: recebe arquivos, chama processFiles, armazena resultado
  - handleReset: limpa estado para novo upload
  - handleSaveDraft: salva dados sanitizados no localStorage

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 src/components/AppHeader.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tipo: .tsx (Component)
  Responsabilidade: Header persistente com navegação, temas, idiomas e logout
  Dependências: useTheme, useI18n, useAuth, Select (shadcn), Button, lucide icons
  Props: activeTab, onTabChange
  Hooks: useTheme, useI18n, useAuth
  Complexidade: Média

  Estrutura JSX:
  - Logo + nome do app
  - Navegação por abas (import/search)
  - Seletor de tema (Light/Dark/BMG)
  - Seletor de idioma (PT/EN/ES/DE)
  - Nome do usuário + botão Sign Out

  Regras de negócio:
  - Sticky top com backdrop-blur
  - Tema ativo destacado com bg-primary

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 src/components/AuthPage.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tipo: .tsx (Component)
  Responsabilidade: Formulário de login com email/senha e Google OAuth simulado
  Dependências: localAuth (loginComEmail, loginComGoogle), Input, Button, useToast, useTheme
  Props: onLogin (callback com LocalSession)
  Hooks: useState, useToast, useTheme
  Complexidade: Média

  Gestão de estado:
  - email, password, showPass, loading
  
  Fluxo:
  1. Google OAuth (simulado) → loginComGoogle() → onLogin()
  2. Email/password → loginComEmail() → onLogin()
  3. Erro → toast destructive
  
  Tratamento de erros: try/catch com toast notifications
  Side effects: Nenhum direto (sessão gerenciada pelo localAuth)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 src/components/FileUploadZone.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tipo: .tsx (Component)
  Responsabilidade: Zona de upload com drag-and-drop, suporte a pastas e múltiplos formatos
  Dependências: lucide icons, types.ts
  Props: onFilesLoaded (callback com UploadedFile[])
  Hooks: useState, useCallback, useRef
  Complexidade: Alta

  Gestão de estado:
  - files: File[] — arquivos selecionados
  - isDragging: boolean — estado visual de drag
  - isProcessing: boolean — processamento em andamento

  Funções principais:
  - filterValidFiles: filtra por extensões aceitas (.txt, .csv, .rtf, .docx, .pdf, .xlsx, .xlsm)
  - handleDrop: processa drop com suporte a webkitGetAsEntry para diretórios
  - handleFileInput: processa seleção via input file
  - processFiles: lê conteúdo (text ou binary) e chama onFilesLoaded
  - readEntriesRecursively: leitura recursiva de diretórios via FileSystem API

  Regras de negócio:
  - DOCX e XLSX são lidos como ArrayBuffer (binário)
  - RTF e TXT são lidos como texto
  - webkitRelativePath preservado para contexto de pasta
  - Suporte a upload de pastas inteiras via webkitdirectory

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 src/components/DataPreview.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tipo: .tsx (Component)
  Responsabilidade: Visualização completa dos dados processados com relatórios e exportação
  Dependências: exporter, csvExporter, sanitizer, qaAuditor, useI18n, infoNaoLocalizada, lucide
  Props: data (ProcessedData), onReset, onSaveDraft
  Hooks: useState, useMemo, useI18n
  Complexidade: Alta

  Gestão de estado:
  - activeTab: string — aba ativa (venues ou setlist-N)
  - showSanitization/showQuality/showAudit: boolean — painéis expansíveis
  - filterErrors: boolean — filtro de linhas com erros

  Pipeline executado via useMemo:
  1. sanitizeData(data) → dados sanitizados + relatório
  2. runQAAudit(sanitizedRaw) → dados auditados + relatório de auditoria

  Componentes internos:
  - SanitizationDetails — grid com contadores de cada correção
  - QualityTable — tabela de qualidade por artista
  - VenuesTable — tabela de shows (Dates & Venues)
  - SetlistTable — tabela de músicas por setlist
  - Stat / StatWithIcon — componentes de estatísticas

  Barra de ações (sticky):
  - ➕ Novo Processamento
  - 💾 Salvar Rascunho
  - 📊 Exportar Excel
  - Exportar CSV
  - Filtro de qualidade (apenas com erros)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 src/pages/Search.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tipo: .tsx (Page Component)
  Responsabilidade: Consulta avançada de setlists com filtros fuzzy e exatos
  Dependências: supabase client, fuzzySearch, confidence, useI18n, shadcn components
  Hooks: useState, useEffect, useMemo, useI18n
  Complexidade: Alta (573 linhas)

  Gestão de estado (15+ variáveis):
  - Filtros: artist, song, dateFrom/To, territory, city, composer, bmgControl,
    headliner, imaestroCode, prsTunecode, statusFilter
  - Resultados: results[], loading, totalCount
  - Tabela: page, perPage, sortCol, sortDir, selectedRows, visibleCols, searchTerm
  - Variantes fuzzy: artistVariants, songVariants, composerVariants

  Fluxo de busca (fetchResults):
  1. Query shows no Supabase com filtros exatos (date, territory, headliner, status)
  2. Filtro ilike para artist e city
  3. Query setlists relacionados via processamento_id
  4. Join em memória (shows × setlists)
  5. Fuzzy search em memória para artist, song, composer
  6. Cálculo de confidence scores (M18)

  Regras de negócio:
  - iMaestro Code e PRS Tunecode: SEMPRE match exato (M17)
  - Artist, Song, Composer: fuzzy search com thresholds diferentes
  - Suporte a seleção múltipla e exportação de selecionados
  - Colunas visíveis configuráveis
  - Highlight de termos buscados nos resultados

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 src/lib/parser.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tipo: .ts (Module)
  Responsabilidade: Orquestrador principal de processamento de arquivos
  Dependências: types, validator, normalizer, xlsxParser, docxParser, territory
  Funções exportadas: processFiles
  Complexidade: Alta (406 linhas)

  Funções internas:
  - extractComposersFromLine: extrai compositores de parênteses ou "written by"
  - cleanSongTitle: remove info de compositor do título
  - parseTxtContent: parser de texto livre com detecção multi-idioma
  - inferArtistFromPath: extrai artista do nome da pasta/arquivo
  - deduplicateShows: agrupa shows com mesma data+venue+artista

  parseTxtContent — Fluxo detalhado:
  1. Normaliza texto e split por linhas
  2. Para cada linha:
    - Filtra linhas de ruído (isNoiseLine)
    - Detecta compositores no nível do documento
    - Detecta labels: Artist, Date, Venue, City, Territory (multi-idioma)
    - Detecta separadores (----)
    - Detecta BIS/Encore
    - Detecta músicas numeradas ou não numeradas
  3. finishShow(): agrupa músicas em setlists e cria registro de show
  4. De-duplicação e validação

  processFiles — Fluxo detalhado:
  1. Para cada arquivo:
    - Detecta formato (xlsx, docx, rtf, txt/csv)
    - Converte para ArrayBuffer se binário
    - Chama parser apropriado
    - Propaga artista da pasta (inferArtistFromPath)
    - Valida shows (isValidShow) — requer Data ou Venue
    - De-duplica shows
    - Valida títulos de músicas
    - Acumula estatísticas e alertas
  2. Sanity check: avisa se count de shows parece irreal
  3. Retorna ProcessedData consolidado

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 src/lib/xlsxParser.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tipo: .ts (Module)
  Responsabilidade: Parser especializado para arquivos Excel (.xlsx/.xlsm)
  Dependências: exceljs, types, normalizer
  Funções exportadas: parseXlsxContentAsync, parseXlsxContent (deprecated)
  Complexidade: Alta (252 linhas)

  Fluxo:
  1. Carrega workbook via ExcelJS
  2. Classifica cada aba: 'setlist', 'dates' ou 'unknown'
  3. Extrai dados usando fuzzy column matching (M5)
  4. Fallback: se nenhuma aba reconhecida, tenta extração genérica
  
  Funções internas:
  - classifySheet: classifica aba por nome e cabeçalhos (multi-idioma)
  - fuzzyMatch: matching fuzzy de nomes de colunas
  - findColumn: localiza coluna por múltiplos aliases
  - findTitleColumn: localiza coluna de título de música
  - worksheetToJson: converte worksheet em array de objetos

  Keywords multi-idioma suportados:
  - Setlist: set list, songs, músicas, tracklist, chansons, lieder, canciones
  - Dates: dates, venues, datas, shows, konzerte, spectacles, conciertos
  - Columns: artiste, künstler, lieu, ort, canción, titre, etc.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 src/lib/docxParser.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tipo: .ts (Module)
  Responsabilidade: Extração de texto de DOCX e RTF
  Dependências: mammoth
  Funções exportadas: extractDocxText, extractRtfText
  Complexidade: Média

  extractDocxText:
  - Usa mammoth.extractRawText com ArrayBuffer
  - Retorna texto limpo sem formatação
  
  extractRtfText:
  - Remove grupos RTF (\\fonttbl, etc.)
  - Remove control words (\\par, \\b0)
  - Decodifica hex chars (\\' ) e unicode (\\u)
  - Limpa whitespace excessivo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 src/lib/normalizer.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tipo: .ts (Module)
  Responsabilidade: Normalização de texto Unicode e datas multi-idioma
  Funções exportadas: normalizeText, normalizeDate
  Complexidade: Média

  normalizeText:
  - NFC Unicode normalization
  - Remove control characters (exceto \\n e \\t)
  - Substitui curly quotes, dashes, NBSP, BOM

  normalizeDate:
  - Suporta: Excel serial numbers, Date objects, strings
  - Formatos: ISO (YYYY-MM-DD), DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  - Datas por extenso em 5 idiomas (PT, EN, ES, FR, DE)
  - "Tue, MAY 27, 2025" → "27/05/2025"
  - Output sempre DD/MM/YYYY

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 src/lib/validator.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tipo: .ts (Module — v1.3)
  Responsabilidade: Validação de registros de shows e músicas
  Funções exportadas: isValidShow, isValidSongTitle, isCorruptedText, isNoiseLine
  Complexidade: Média

  Regras de validação de show:
  - DEVE ter pelo menos Data OU Venue
  - Rejeita se todos os campos principais são ruído

  Padrões de ruído rejeitados:
  - Copyright, page numbers, totais, URLs, datas de geração

  Padrões de título inválido:
  - Apenas números, separadores, page refs, texto corrompido, texto legal

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 src/lib/sanitizer.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tipo: .ts (Module)
  Responsabilidade: Pipeline de 9 correções automáticas + quality scoring
  Funções exportadas: sanitizeData, calculateShowQuality, calculateSongQuality, generateArtistQualityReport
  Complexidade: Alta (333 linhas)

  Pipeline de correções:
  1. Date/tour in Artist field → move para campos corretos
  2. Venue/label in Date field → move para campo venue
  3. Forward-fill metadata by Set List # → propaga artista/data
  4. Deduplicate → remove linhas idênticas
  5. BMG Control normalization → YES/NO/SIM → Y/N
  6. Date normalization → formatos variados → DD/MM/YYYY
  7. Cancelled shows → extrai [CANCELLED] para comments
  8. DJ BPM/Key extraction → move info técnica para comments
  9. Territory inference → infere território de comments

  Quality scoring:
  - calculateShowQuality: penaliza campos ausentes (-30 artist, -25 date, etc.)
  - calculateSongQuality: penaliza título (-30), compositor (-3), BMG (-2)
  - generateArtistQualityReport: agrega métricas por artista

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 src/lib/qaAuditor.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tipo: .ts (Module — v1.2)
  Responsabilidade: Auditoria de qualidade pós-sanitização
  Funções exportadas: runQAAudit
  Interfaces exportadas: AuditIssue, AuditReport
  Complexidade: Alta (187 linhas)

  Verificações por registro:
  1. Campos em branco → preenchidos com "informação não localizada"
  2. Formato de data → deve ser DD/MM/AAAA
  3. Separadores de compositores → normaliza para " / "
  4. Headliner Y/N → padroniza YES/SIM/SI → Y
  5. Conflito artista pasta vs arquivo → flagga
  6. Títulos vazios → "[título não localizado — faixa N]"

  Output:
  - issues[]: lista detalhada de problemas encontrados
  - totalChecked: total de campos verificados
  - totalFixed: total de correções automáticas
  - totalWarnings: total de avisos que requerem atenção manual

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 src/lib/exporter.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tipo: .ts (Module)
  Responsabilidade: Exportação para Excel com formatação padrão BMG
  Dependências: exceljs, types, infoNaoLocalizada
  Funções exportadas: exportToExcel
  Complexidade: Média

  Formatação aplicada:
  - Font: Arial 10pt
  - Headers: fundo cinza #D9D9D9, negrito, borda inferior
  - Linhas alternadas: fundo #F5F5F5
  - Colunas: 20px de largura
  - Campos vazios: preenchidos com "informação não localizada"
  - Compositores: normalizados com " / "
  - Títulos vazios: "[título não localizado — faixa N]"

  Abas geradas:
  - "Dates & Venues": 13 colunas incluindo Source File
  - "Set List N": 6 colunas por setlist

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 src/lib/csvExporter.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tipo: .ts (Module)
  Responsabilidade: Exportação para CSV consolidado
  Dependências: types, infoNaoLocalizada
  Funções exportadas: exportToCsv
  Complexidade: Baixa

  Formato: CSV com BOM UTF-8, campos entre aspas duplas
  15 colunas: Artist, Date, Territory, City, Venue, Set List #, Song Order,
  Song Title, Composers, BMG Control, iMaestro Code, PRS Tunecode,
  Show Comments, Song Comments, Source File

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 src/lib/confidence.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tipo: .ts (Module — M18)
  Responsabilidade: Cálculo de score de confiança por registro
  Funções exportadas: calculateConfidence
  Tipos exportados: ConfidenceLevel, ConfidenceResult
  Complexidade: Baixa

  Penalidades:
  - Campos críticos: Artist (-35), Song (-35), Date (-25)
  - Campos importantes: City (-5), Venue (-5), Territory (-5)
  - Campos editoriais: Composer (-3), BMG Control (-2)
  - Dados inferidos: Territory inferido (-5), Metadata propagada (-8)

  Níveis: HIGH (≥80), MEDIUM (≥55), LOW (<55)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 src/lib/fuzzySearch.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tipo: .ts (Module — M17)
  Responsabilidade: Busca fuzzy com múltiplos algoritmos
  Funções exportadas: fuzzySearch, findVariants
  Tipos exportados: FuzzyMatchType, FuzzyResult
  Complexidade: Alta (176 linhas)

  Algoritmos implementados:
  - Levenshtein distance: distância de edição clássica
  - Jaro-Winkler: otimizado para nomes próprios (compositores)
  - Token Set Ratio: lida com reordenação de palavras
  
  Modos de busca:
  - 'exact': match exato
  - 'partial': inclusão parcial
  - 'jaro_winkler': similaridade Jaro-Winkler
  - 'fuzzy': token set ratio (padrão)

  findVariants: identifica grafias variantes nos resultados

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 src/lib/territory.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tipo: .ts (Module — M16)
  Responsabilidade: Mapeamento e inferência de territórios
  Funções exportadas: inferTerritoryFromComment, validateTerritory, inferTerritory
  Complexidade: Média

  Territórios mapeados: EU, UK, USA, JPN, CHN, BRA, AUS, LATAM, ASIA, INTL
  Países/regiões: 40+ mapeamentos (germany→EU, france→EU, japan→JPN, etc.)
  Inferência: busca keywords em comments, city, venue

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 src/lib/infoNaoLocalizada.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tipo: .ts (Module)
  Responsabilidade: Preenchimento padronizado de campos vazios
  Funções exportadas: fillMissing, normalizeComposers
  Constantes exportadas: INFO_NAO_LOCALIZADA
  Complexidade: Baixa

  fillMissing: substitui null, "", "-", "?", "N/A" por "informação não localizada"
  normalizeComposers: converte separadores (virgula, &, and, e, und, et, y) para " / "

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 src/lib/i18n.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tipo: .ts (Module)
  Responsabilidade: Sistema de internacionalização
  Funções exportadas: useI18n, getStoredLocale
  Tipos exportados: Locale, TranslationKey
  Constantes: LOCALE_LABELS
  Complexidade: Média (353 linhas)

  Idiomas suportados: pt, en, es, de
  ~90 chaves de tradução por idioma
  Persistência: localStorage (setlist_agent_locale)
  Suporte a variáveis: {count}, {from}, {to}, {total}, {plural}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 src/lib/theme.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tipo: .ts (Module)
  Responsabilidade: Gerenciamento de temas visuais
  Funções exportadas: useTheme
  Tipos exportados: Theme
  Complexidade: Baixa

  Temas: 'light', 'dark', 'bmg'
  Persistência: localStorage (setlist_agent_theme)
  Implementação: data-theme attribute no <html>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 src/lib/localAuth.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tipo: .ts (Module)
  Responsabilidade: Autenticação local em memória com 3 usuários hardcoded
  Funções exportadas: loginComEmail, loginComGoogle, getSessao, logout
  Interfaces exportadas: LocalUser, LocalSession
  Complexidade: Baixa

  Usuários cadastrados:
  - revenue.assurance@bmg.com (revenue_assurance)
  - admin@setlistagent.com (admin)
  - bruno-bsn@hotmail.com (revenue_assurance)

  Sessão:
  - Armazenada em sessionStorage
  - Expira em 8 horas
  - Token local gerado (local-token-{id}-{timestamp})

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 src/lib/types.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tipo: .ts (Type Definitions)
  Responsabilidade: Interfaces TypeScript compartilhadas
  Complexidade: Baixa

  Interfaces:
  - ShowEntry: 14 campos (artist, date, territory, city, venue, etc.)
  - SongEntry: 6 campos (songTitle, composers, bmgControl, etc.)
  - SetlistData: { number, songs[] }
  - FileStatus: { name, status, method, alerts, rejectedLines }
  - ProcessedData: resultado consolidado do processamento
  - UploadedFile: { name, content, type }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 src/hooks/useAuth.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tipo: .tsx (Custom Hook)
  Responsabilidade: Gerencia estado de autenticação
  Dependências: localAuth (getSessao, logout)
  Hooks utilizados: useState, useEffect, useCallback
  Complexidade: Baixa

  Retorno: { session, loading, signOut, setLoggedIn }
  Side effects: escuta 'storage' event para sincronização
  Persistência: sessionStorage via localAuth

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 src/hooks/useUserRole.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tipo: .tsx (Custom Hook)
  Responsabilidade: Controle de permissões baseado em roles
  Dependências: useAuth
  Complexidade: Baixa

  Roles: admin, revenue_assurance, viewer
  9 permissões granulares: import, search, export_excel, export_csv,
  view_reports, manage_users, view_quarantine, delete_records, edit_records

  Retorno: { role, permissions, hasPermission, loading }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 src/index.css
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tipo: .css (Tailwind + Custom Properties)
  Responsabilidade: Design system com 3 temas e CSS variables
  Complexidade: Média (199 linhas)

  Temas definidos:
  - Dark (padrão): tons de cinza-azulado com dourado
  - Light: branco limpo com preto e dourado
  - BMG: azul petróleo (#1F4D5A) com verde lima (#C8DA00)

  Tokens customizados:
  - --surface-elevated, --glow-primary, --table-row-alt, --table-header
  - --success, --warning

  Fontes:
  - Space Grotesk (default)
  - DM Sans (tema BMG)
  - JetBrains Mono (monospace)

  Utilitários:
  - .glow-amber / .glow-amber-sm — efeito de brilho
  - .gradient-primary — gradiente primary → accent
  - .gradient-surface — gradiente card → background

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 src/lib/utils.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tipo: .ts (Utility)
  Responsabilidade: Utilitário de merge de classes CSS (cn)
  Dependências: clsx, tailwind-merge
  Complexidade: Baixa

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 Arquivos de Configuração (Raiz)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  - vite.config.ts: Vite config com HMR, alias @/, lovable-tagger
  - tailwind.config.ts: Extensão do Tailwind com tokens do design system
  - tsconfig.json / tsconfig.app.json: TypeScript config (ES2020, bundler mode)
  - postcss.config.js: PostCSS com Tailwind e Autoprefixer
  - eslint.config.js: ESLint com React hooks e refresh plugins
  - vitest.config.ts: Vitest com jsdom e alias
  - components.json: Configuração shadcn/ui
  - index.html: HTML shell com meta tags
  - package.json: Dependências e scripts

================================================================================
5️⃣ ANÁLISE CRÍTICA DA ARQUITETURA
================================================================================

🔍 Análise Crítica da Arquitetura
──────────────────────────────────

5.1 Code Smells Identificados
─────────────────────────────
  ⚠️ CS-1: Search.tsx (573 linhas) — componente monolítico
    - Mistura filtros, tabela, paginação, exportação e lógica de busca
    - Deveria ser dividido em SearchFilters, SearchResults, SearchTable

  ⚠️ CS-2: DataPreview.tsx (405 linhas) — componente grande
    - Contém 6 subcomponentes inline (SanitizationDetails, QualityTable, etc.)
    - Subcomponentes deveriam ser extraídos para arquivos próprios

  ⚠️ CS-3: localAuth.ts — credenciais hardcoded em código
    - Senhas em texto plano no código fonte
    - Risco de segurança se publicado
    - Deveria usar autenticação via Supabase Auth

  ⚠️ CS-4: parser.ts (406 linhas) — responsabilidades excessivas
    - parseTxtContent faz parsing, detecção de idioma, extração de composers
    - Deveria ser dividido em parser + detector + extractor

  ⚠️ CS-5: Duplicação de lógica de BMG normalization
    - sanitizer.ts e qaAuditor.ts ambos normalizam BMG Control
    - Deveria haver uma única fonte de verdade

5.2 Violação de Responsabilidade Única
──────────────────────────────────────
  ❌ sanitizer.ts: faz sanitização, quality scoring E quality reporting
  ❌ parser.ts: faz parsing, inferência de artista E de-duplicação
  ❌ Search.tsx: filtros, busca, tabela, paginação, exportação, highlight

5.3 Acoplamento Excessivo
─────────────────────────
  ⚠️ DataPreview executa pipeline completo (sanitize + audit) via useMemo
     → Se o pipeline mudar, DataPreview precisa ser atualizado
  ⚠️ Index.tsx depende diretamente de processFiles (acoplamento lib ↔ page)
  ⚠️ localAuth é importado em 3 locais diferentes

5.4 Repetição de Lógica
────────────────────────
  - fillMissing() chamado tanto no exporter quanto no csvExporter
  - Normalização de datas repetida em sanitizer.ts e normalizer.ts
  - Detecção de Y/N duplicada em sanitizer.ts e qaAuditor.ts

5.5 Oportunidades de Hooks Customizados
────────────────────────────────────────
  - useProcessedData: encapsular pipeline sanitize → audit → filter
  - useFileUpload: separar lógica de upload/drag do FileUploadZone
  - useSearch: extrair toda lógica de busca do Search.tsx
  - useExport: centralizar lógica de exportação Excel/CSV

5.6 Avaliação de Escalabilidade: 6/10
──────────────────────────────────────
  ✅ Modularização razoável na camada lib/
  ✅ i18n preparado para novos idiomas
  ✅ Temas facilmente extensíveis
  ❌ Search.tsx difícil de manter conforme filtros crescem
  ❌ Sem lazy loading de rotas
  ❌ Sem code splitting

5.7 Avaliação de Manutenibilidade: 7/10
────────────────────────────────────────
  ✅ TypeScript bem tipado com interfaces claras
  ✅ Separação lib/ vs components/ vs pages/
  ✅ CSS variables centralizados
  ❌ Poucos testes (apenas 1 test de exemplo)
  ❌ Sem documentação inline consistente

5.8 Avaliação de Legibilidade: 7/10
────────────────────────────────────
  ✅ Nomes descritivos de funções e variáveis
  ✅ Comentários de seção em sanitizer.ts
  ✅ Tipagem TypeScript clara
  ❌ Search.tsx muito longo para leitura linear
  ❌ Inconsistência idiomática (mistura PT e EN nos nomes)


================================================================================
6️⃣ SUGESTÕES DE REFATORAÇÃO
================================================================================

🛠 Sugestões de Refatoração
────────────────────────────

6.1 Refatorações Estruturais
─────────────────────────────
  R-1: Dividir Search.tsx em:
    - SearchFilters.tsx (painel de filtros)
    - SearchResultsTable.tsx (tabela de resultados)
    - useSearchQuery.ts (hook com lógica de busca)
    Impacto: Alta manutenibilidade, cada arquivo < 150 linhas

  R-2: Dividir DataPreview.tsx em:
    - ActionBar.tsx (barra de ações sticky)
    - ReportSummary.tsx (resumo do processamento)
    - SanitizationPanel.tsx
    - QualityPanel.tsx
    - AuditPanel.tsx
    - VenuesTable.tsx e SetlistTable.tsx (já são subcomponentes)

  R-3: Dividir parser.ts em:
    - parseTxtContent.ts (parser de texto)
    - parseOrchestrator.ts (processFiles)
    - composerExtractor.ts (extractComposersFromLine)

6.2 Separação de Responsabilidades
───────────────────────────────────
  R-4: Extrair quality scoring do sanitizer.ts para quality.ts
  R-5: Criar normalization.ts unificando BMG, Y/N e date normalization
  R-6: Mover de-duplicação para deduplicate.ts

6.3 Melhorias de Organização de Pastas
───────────────────────────────────────
  Sugestão de nova estrutura:
  src/
  ├── components/
  │   ├── import/         ← FileUploadZone, DataPreview, ActionBar
  │   ├── search/         ← SearchFilters, SearchResults
  │   ├── layout/         ← AppHeader, NavLink
  │   ├── auth/           ← AuthPage
  │   └── ui/             ← shadcn (sem mudança)
  ├── hooks/
  │   ├── useProcessedData.ts
  │   ├── useSearch.ts
  │   └── useExport.ts
  ├── lib/
  │   ├── parsers/        ← parser, xlsxParser, docxParser
  │   ├── validators/     ← validator, qaAuditor
  │   ├── exporters/      ← exporter, csvExporter
  │   └── utils/          ← normalizer, territory, confidence, etc.

6.4 Melhorias em Tipagem TypeScript
────────────────────────────────────
  R-7: Usar discriminated unions para FileStatus.status
    type FileStatus = SuccessFile | AlertFile | FailureFile

  R-8: Tipagem mais estrita para campos de show
    type HeadlinerYN = 'Y' | 'N' | '';
    type Territory = 'EU' | 'UK' | 'USA' | ... | '';

  R-9: Usar branded types para IDs
    type ProcessamentoId = string & { __brand: 'ProcessamentoId' };

6.5 Padrões Recomendados
─────────────────────────
  R-10: Container/Presenter pattern para Search e DataPreview
    - Container: gerencia estado e lógica
    - Presenter: renderiza UI pura baseada em props

  R-11: Service Layer para acesso ao Supabase
    - searchService.ts: encapsula queries
    - processService.ts: encapsula lógica de processamento
    → Facilita testes e mock

6.6 Melhorias de Performance
─────────────────────────────
  R-12: React.lazy + Suspense para Search e DataPreview
    const Search = lazy(() => import('./pages/Search'));
    → Reduz bundle inicial

  R-13: Web Workers para processamento de arquivos grandes
    → Evita bloqueio do main thread durante parse de Excel

  R-14: Virtualização de tabelas (react-virtual / tanstack-table)
    → Performance com milhares de linhas

6.7 Melhorias de Testabilidade
───────────────────────────────
  R-15: Criar testes unitários para:
    - normalizeDate (todos os formatos)
    - parseTxtContent (múltiplos cenários)
    - sanitizeData (cada correção)
    - fuzzySearch (thresholds e algoritmos)

  R-16: Criar testes de integração para:
    - Pipeline completo: upload → parse → sanitize → audit → export
    - Fluxo de busca com dados reais

6.8 Melhorias de Reutilização
──────────────────────────────
  R-17: Extrair FilterField do Search.tsx para componente reutilizável
  R-18: Criar DataTable genérico substituindo VenuesTable e SetlistTable
  R-19: Criar ExportButton genérico com dropdown (Excel, CSV, PDF)

6.9 Migração de Autenticação (Crítico)
────────────────────────────────────────
  R-20: Migrar de localAuth para Supabase Auth
    - Remover credenciais hardcoded
    - Usar sign up/sign in via Supabase
    - RLS policies para proteção de dados
    - Sessão gerenciada pelo SDK

  Exemplo prático:
    // Antes (localAuth.ts)
    const user = USUARIOS.find(u => u.email === email && u.password === password);
    
    // Depois (Supabase Auth)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });


================================================================================
  FIM DA DOCUMENTAÇÃO TÉCNICA
  Total de arquivos documentados: 25+ (excluindo ui/ components)
  Gerado automaticamente pelo Setlist Agent Documentation Generator
================================================================================
`.trim();
}

/**
 * Download the documentation as a .txt file.
 */
export function downloadDocumentation(locale: Locale = 'pt'): void {
  const content = generateDocumentation(locale);
  const titles = DOC_TITLES[locale] || DOC_TITLES.pt;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = titles.filename;
  a.click();
  URL.revokeObjectURL(url);
}
