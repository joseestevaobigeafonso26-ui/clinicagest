import { Outlet } from 'react-router-dom'
import { Activity } from 'lucide-react'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel - decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-blue-400 blur-3xl" />
        </div>

        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">ClinicaGest</span>
        </div>

        <div className="relative space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Gestão clínica<br />
            <span className="text-primary">simplificada</span>
          </h1>
          <p className="text-lg text-white/70 max-w-md leading-relaxed">
            Sistema integrado para gerenciar pacientes, consultas, serviços e finanças da sua clínica em um só lugar.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            {[
              { label: 'Pacientes', value: '+2.400' },
              { label: 'Consultas/mês', value: '+800' },
              { label: 'Satisfação', value: '98%' },
              { label: 'Clínicas', value: '+120' },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-white/5 p-4 border border-white/10">
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-sm text-white/60">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-sm text-white/40">
          © 2024 ClinicaGest. Todos os direitos reservados.
        </p>
      </div>

      {/* Right panel - form */}
      <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md animate-fade-in">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold">ClinicaGest</span>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
