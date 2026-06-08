-- Migração: Adicionar campo status à tabela profiles e atualizar lógica de validação
-- Data: 2026-06-03

-- 1. Adicionar coluna status se não existir
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pendente'
CHECK (status IN ('activo', 'pendente', 'bloqueado'));

-- 2. Atualizar status existentes: admin = 'activo', outros = 'pendente'
UPDATE public.profiles 
SET status = CASE 
  WHEN role = 'admin' THEN 'activo'
  ELSE 'pendente'
END
WHERE status = 'pendente' OR status IS NULL;

-- 3. Recriar o trigger para handle_new_user com a lógica do status
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'recepcao');
  
  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    user_role,
    CASE WHEN user_role = 'admin' THEN 'activo' ELSE 'pendente' END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Confirmação
SELECT 'Migração aplicada com sucesso!' as status;
