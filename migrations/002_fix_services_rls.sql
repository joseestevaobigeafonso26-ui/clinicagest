-- Migração: Corrigir RLS para tabela services
-- Data: 2026-06-03

-- Drop a política problemática
DROP POLICY IF EXISTS "services_insert_update_delete" ON public.services;

-- Criar políticas separadas e corretas
CREATE POLICY "services_insert" ON public.services
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "services_update" ON public.services
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "services_delete" ON public.services
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Confirmação
SELECT 'RLS para services corrigido!' as status;
