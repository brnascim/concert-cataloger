
-- Add user_id to all tables
ALTER TABLE public.processamentos ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.shows ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.setlists ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.erros_processamento ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop old permissive policies
DROP POLICY IF EXISTS "Allow all access to processamentos" ON public.processamentos;
DROP POLICY IF EXISTS "Allow all access to shows" ON public.shows;
DROP POLICY IF EXISTS "Allow all access to setlists" ON public.setlists;
DROP POLICY IF EXISTS "Allow all access to erros_processamento" ON public.erros_processamento;

-- Owner-scoped policies for processamentos
CREATE POLICY "Users can select own processamentos"
  ON public.processamentos FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own processamentos"
  ON public.processamentos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own processamentos"
  ON public.processamentos FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own processamentos"
  ON public.processamentos FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Owner-scoped policies for shows
CREATE POLICY "Users can select own shows"
  ON public.shows FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shows"
  ON public.shows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shows"
  ON public.shows FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own shows"
  ON public.shows FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Owner-scoped policies for setlists
CREATE POLICY "Users can select own setlists"
  ON public.setlists FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own setlists"
  ON public.setlists FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own setlists"
  ON public.setlists FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own setlists"
  ON public.setlists FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Owner-scoped policies for erros_processamento
CREATE POLICY "Users can select own erros_processamento"
  ON public.erros_processamento FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own erros_processamento"
  ON public.erros_processamento FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own erros_processamento"
  ON public.erros_processamento FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own erros_processamento"
  ON public.erros_processamento FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
