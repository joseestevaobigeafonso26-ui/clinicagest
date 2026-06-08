# 🏥 ClinicaGest — Sistema Integrado de Gestão para Clínicas

Sistema completo de gestão clínica com React + Vite + Supabase.

---

## 🚀 Início Rápido

### Pré-requisitos
- Node.js 18+
- Conta gratuita no [Supabase](https://supabase.com)

---

## ⚙️ 1. Configurar o Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Vá em **SQL Editor** e execute o conteúdo de `database.sql`
3. Vá em **Project Settings > API** e copie:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`

---

## 🔧 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env`:
```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

---

## 📦 3. Instalar dependências

```bash
npm install
```

---

## ▶️ 4. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse: [http://localhost:5173](http://localhost:5173)

---

## 🏗️ 5. Build para produção

```bash
npm run build
npm run preview
```

---

## 👤 Criar primeiro usuário Admin

1. Acesse `/register` no navegador
2. Preencha o nome, email, senha e selecione **Administrador**
3. Confirme o email (verifique a caixa de entrada ou desative confirmação no Supabase)
4. Faça login em `/login`

> **Dica:** Para pular a confirmação de email em desenvolvimento, vá em **Supabase > Authentication > Settings > Email** e desative "Confirm email".

---

## 🗂️ Estrutura do Projeto

```
src/
├── components/
│   ├── auth/           # ProtectedRoute, AuthProvider
│   ├── layout/         # Sidebar, TopBar
│   └── ui/             # Button, Card, Dialog, Select, Toast, etc.
├── hooks/
│   ├── useAuth.ts      # Hook de autenticação
│   └── useToast.ts     # Hook de notificações
├── layouts/
│   ├── AppLayout.tsx   # Layout principal (sidebar + topbar)
│   └── AuthLayout.tsx  # Layout de autenticação
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   └── RegisterPage.tsx (+ ForgotPasswordPage)
│   ├── DashboardPage.tsx
│   ├── PatientsPage.tsx
│   ├── AppointmentsPage.tsx
│   ├── ServicesPage.tsx
│   └── FinancialPage.tsx
├── services/
│   ├── supabase.ts     # Cliente Supabase
│   ├── auth.ts         # Serviços de autenticação
│   ├── patients.ts     # CRUD pacientes
│   ├── appointments.ts # CRUD agendamentos
│   ├── services.ts     # CRUD serviços
│   └── payments.ts     # CRUD pagamentos
├── store/
│   ├── auth.ts         # Zustand store (usuário)
│   └── ui.ts           # Zustand store (tema, sidebar)
├── types/
│   └── index.ts        # TypeScript types globais
├── utils/
│   └── index.ts        # Utilitários (formatação, validação)
├── main.tsx            # Entry point
└── router.tsx          # Configuração de rotas
```

---

## ✨ Funcionalidades

| Módulo          | Funcionalidades                                              |
|-----------------|--------------------------------------------------------------|
| 🔐 Auth         | Login, Registro, Recuperação de senha, Roles (Admin/Médico/Recepção) |
| 👤 Pacientes    | CRUD completo, busca por nome/CPF/telefone                   |
| 📅 Agendamentos | Calendário semanal, criação/edição/cancelamento, filtros     |
| 💊 Serviços     | CRUD, categorias, ativar/desativar, preços e duração         |
| 💰 Financeiro   | Pagamentos, gráficos de receita, registrar método de pagamento |
| 📊 Dashboard    | KPIs em tempo real, gráficos de área e pizza                 |
| 🌙 Tema         | Dark/Light mode persistido                                   |
| 📱 Responsivo   | Mobile-first, sidebar colapsável                             |

---

## 🧱 Stack Tecnológica

- **Frontend:** React 18 + Vite + TypeScript
- **Estilização:** Tailwind CSS + Radix UI
- **Backend:** Supabase (Auth + PostgreSQL + RLS)
- **Estado:** Zustand
- **Formulários:** React Hook Form + Zod
- **Queries:** TanStack Query v5
- **Gráficos:** Recharts
- **Ícones:** Lucide React
- **Roteamento:** React Router DOM v6
- **Fontes:** Sora + JetBrains Mono

---

## 🗄️ Schema do Banco

```
profiles      → id, email, full_name, role, avatar_url, phone
patients      → id, full_name, cpf, phone, email, birth_date, gender, blood_type, ...
services      → id, name, description, price, duration_minutes, category, active
appointments  → id, patient_id, service_id, doctor_id, scheduled_at, status, notes
payments      → id, appointment_id, amount, method, status, paid_at
```

---

## 📝 Licença

MIT — use livremente para projetos comerciais e pessoais.
