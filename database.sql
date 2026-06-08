-- =============================================================
-- ClinicaGest — Script SQL completo para Supabase
-- Execute este script no SQL Editor do seu projeto Supabase
-- =============================================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- TABELA: profiles (estende auth.users)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'recepcao'
                CHECK (role IN ('admin', 'medico', 'recepcao')),
  status      TEXT NOT NULL DEFAULT 'pendente'
                CHECK (status IN ('activo', 'pendente', 'bloqueado')),
  avatar_url  TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TABELA: patients
-- =============================================================
CREATE TABLE IF NOT EXISTS public.patients (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name   TEXT NOT NULL,
  email       TEXT,
  phone       TEXT NOT NULL,
  cpf         TEXT NOT NULL UNIQUE,
  birth_date  DATE NOT NULL,
  gender      TEXT NOT NULL CHECK (gender IN ('masculino', 'feminino', 'outro')),
  address     TEXT,
  city        TEXT,
  state       TEXT,
  zip_code    TEXT,
  blood_type  TEXT CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  allergies   TEXT,
  notes       TEXT,
  created_by  UUID NOT NULL REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TABELA: services
-- =============================================================
CREATE TABLE IF NOT EXISTS public.services (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  description      TEXT,
  price            NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),
  category         TEXT NOT NULL DEFAULT 'Consulta',
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TABELA: appointments
-- =============================================================
CREATE TABLE IF NOT EXISTS public.appointments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id   UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  service_id   UUID NOT NULL REFERENCES public.services(id),
  doctor_id    UUID NOT NULL REFERENCES public.profiles(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status       TEXT NOT NULL DEFAULT 'agendado'
                 CHECK (status IN ('agendado','confirmado','realizado','cancelado','falta')),
  notes        TEXT,
  created_by   UUID NOT NULL REFERENCES public.profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TABELA: payments
-- =============================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  amount         NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  method         TEXT CHECK (method IN ('dinheiro','cartao_credito','cartao_debito','pix','convenio')),
  status         TEXT NOT NULL DEFAULT 'pendente'
                   CHECK (status IN ('pendente','pago','cancelado','reembolsado')),
  paid_at        TIMESTAMPTZ,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- ÍNDICES para performance
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_patients_full_name ON public.patients(full_name);
CREATE INDEX IF NOT EXISTS idx_patients_cpf ON public.patients(cpf);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON public.appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_payments_appointment_id ON public.payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON public.payments(paid_at);

-- =============================================================
-- FUNÇÃO: auto-atualiza updated_at
-- =============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGERS updated_at
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================
-- FUNÇÃO: cria profile automaticamente após signup
-- =============================================================
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

CREATE OR REPLACE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================
ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments     ENABLE ROW LEVEL SECURITY;

-- PROFILES: usuário vê/edita seu próprio perfil; admin vê todos
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- PATIENTS: autenticados podem criar e acessar; admin gerencia tudo
CREATE POLICY "patients_select" ON public.patients
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "patients_insert" ON public.patients
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "patients_update" ON public.patients
  FOR UPDATE USING (
    auth.uid() = created_by OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "patients_delete" ON public.patients
  FOR DELETE USING (
    auth.uid() = created_by OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- SERVICES: qualquer autenticado lê; apenas admin gerencia
CREATE POLICY "services_select" ON public.services
  FOR SELECT USING (auth.role() = 'authenticated');

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

-- APPOINTMENTS: autenticados podem criar e acessar; criador/admin/recepcionista gerenciam
CREATE POLICY "appointments_select" ON public.appointments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "appointments_insert" ON public.appointments
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "appointments_update" ON public.appointments
  FOR UPDATE USING (
    auth.uid() = created_by OR 
    auth.uid() = doctor_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'recepcionista'))
  );

CREATE POLICY "appointments_delete" ON public.appointments
  FOR DELETE USING (
    auth.uid() = created_by OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'recepcionista'))
  );

-- PAYMENTS: autenticados podem gerenciar
CREATE POLICY "payments_select" ON public.payments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "payments_insert" ON public.payments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "payments_update" ON public.payments
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "payments_delete" ON public.payments
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'recepcionista'))
  );

-- =============================================================
-- DADOS DE EXEMPLO (seed)
-- =============================================================

-- Serviços de exemplo (inseridos diretamente, sem depender de auth)
INSERT INTO public.services (name, description, price, duration_minutes, category, active)
VALUES
  ('Consulta Clínica Geral',     'Atendimento clínico geral',                   150.00, 30, 'Consulta',    TRUE),
  ('Consulta Cardiológica',      'Avaliação cardiológica completa',              250.00, 45, 'Consulta',    TRUE),
  ('Eletrocardiograma',          'ECG em repouso de 12 derivações',              120.00, 20, 'Exame',       TRUE),
  ('Hemograma Completo',         'Exame de sangue completo',                      80.00, 15, 'Exame',       TRUE),
  ('Ultrassonografia Abdominal', 'Ultrassom do abdômen total',                   200.00, 30, 'Exame',       TRUE),
  ('Consulta Dermatológica',     'Avaliação e tratamento de pele',               220.00, 40, 'Consulta',    TRUE),
  ('Fisioterapia',               'Sessão de fisioterapia individual',            100.00, 50, 'Terapia',     TRUE),
  ('Psicoterapia',               'Sessão de psicoterapia individual',            180.00, 50, 'Terapia',     TRUE),
  ('Pequena Cirurgia',           'Procedimentos cirúrgicos ambulatoriais',       350.00, 60, 'Cirurgia',    TRUE),
  ('Consulta Pediátrica',        'Atendimento médico para crianças',             180.00, 30, 'Consulta',    TRUE)
ON CONFLICT DO NOTHING;
