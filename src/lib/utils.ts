import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { pt } from 'date-fns/locale'   // locale pt (Portugal/Angola) em vez de ptBR

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Moeda ────────────────────────────────────────────────────────────────────
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    minimumFractionDigits: 2,
  }).format(value)
}

// ─── Datas ────────────────────────────────────────────────────────────────────
export function formatDate(date: string | Date, fmt = 'dd/MM/yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt, { locale: pt })
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: pt })
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: pt })
}

// ─── BI angolano (Bilhete de Identidade) ─────────────────────────────────────
// Formato: 000000000LA000 (9 dígitos + 2 letras + 3 dígitos)
export function formatBI(bi: string): string {
  if (!bi) return ''
  // Remove tudo que não seja alfanumérico
  const clean = bi.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  return clean
}

export function validateBI(bi: string): boolean {
  const clean = bi.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  // BI angolano: 9 dígitos + 2 letras + 3 dígitos = 14 caracteres
  return /^\d{9}[A-Z]{2}\d{3}$/.test(clean)
}

// ─── Telefone angolano ────────────────────────────────────────────────────────
// Formato: +244 9XX XXX XXX
export function formatPhone(phone: string): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  // Com código de país 244
  if (digits.startsWith('244') && digits.length === 12) {
    return `+244 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`
  }
  // Sem código de país — 9 dígitos
  if (digits.length === 9) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }
  return phone
}

// ─── Iniciais ─────────────────────────────────────────────────────────────────
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}

// ─── Status de agendamentos / pagamentos ─────────────────────────────────────
export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    agendado:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    confirmado: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    rejeitado:  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    realizado:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    cancelado:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    falta:      'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    pendente:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    pago:       'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    reembolsado:'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  }
  return map[status] ?? 'bg-gray-100 text-gray-700'
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    agendado:       'Agendado',
    confirmado:     'Confirmado',
    rejeitado:      'Rejeitado',
    realizado:      'Realizado',
    cancelado:      'Cancelado',
    falta:          'Faltou',
    pendente:       'Pendente',
    pago:           'Pago',
    reembolsado:    'Reembolsado',
    dinheiro:       'Dinheiro',
    cartao_credito: 'Cartão de Crédito',
    cartao_debito:  'Cartão de Débito',
    transferencia:  'Transferência Bancária',
    convenio:       'Convénio / Seguro',
  }
  return map[status] ?? status
}

// Mantido por retrocompatibilidade (usado noutros sítios como formatCPF)
export const formatCPF = formatBI
