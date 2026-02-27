
-- Processamentos (processing runs)
CREATE TABLE public.processamentos (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    arquivos_recebidos INTEGER NOT NULL DEFAULT 0,
    arquivos_sucesso INTEGER NOT NULL DEFAULT 0,
    arquivos_com_alerta INTEGER NOT NULL DEFAULT 0,
    arquivos_com_falha INTEGER NOT NULL DEFAULT 0,
    shows_extraidos INTEGER NOT NULL DEFAULT 0,
    setlists_criados INTEGER NOT NULL DEFAULT 0,
    musicas_catalogadas INTEGER NOT NULL DEFAULT 0,
    linhas_rejeitadas INTEGER NOT NULL DEFAULT 0,
    status_geral TEXT NOT NULL DEFAULT 'success',
    relatorio_json JSONB
);

-- Shows
CREATE TABLE public.shows (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    processamento_id TEXT NOT NULL REFERENCES public.processamentos(id) ON DELETE CASCADE,
    artist TEXT NOT NULL,
    date TEXT NOT NULL,
    territory TEXT DEFAULT '',
    city TEXT DEFAULT '',
    venue TEXT DEFAULT '',
    venue_address TEXT DEFAULT '',
    prs_venue_id TEXT DEFAULT '',
    promoter_contact TEXT DEFAULT '',
    comments TEXT DEFAULT '',
    set_list_number INTEGER DEFAULT 1,
    headliner_yn TEXT DEFAULT '',
    headliner_name TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'active'
);

-- Setlists
CREATE TABLE public.setlists (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    processamento_id TEXT NOT NULL REFERENCES public.processamentos(id) ON DELETE CASCADE,
    set_list_number INTEGER NOT NULL,
    ordem INTEGER NOT NULL,
    song_title TEXT NOT NULL,
    composers TEXT DEFAULT '',
    bmg_control TEXT DEFAULT '',
    imaestro_code TEXT DEFAULT '',
    prs_tunecode TEXT DEFAULT '',
    comments TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Error logs
CREATE TABLE public.erros_processamento (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    processamento_id TEXT REFERENCES public.processamentos(id) ON DELETE CASCADE,
    arquivo_nome TEXT,
    tipo_erro TEXT,
    descricao TEXT,
    linha_afetada TEXT,
    metodo_tentado TEXT,
    resolvido BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Allow public access (no auth required for this tool)
ALTER TABLE public.processamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erros_processamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to processamentos" ON public.processamentos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to shows" ON public.shows FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to setlists" ON public.setlists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to erros_processamento" ON public.erros_processamento FOR ALL USING (true) WITH CHECK (true);
