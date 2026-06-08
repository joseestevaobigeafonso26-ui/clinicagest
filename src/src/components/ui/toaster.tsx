'use client'

import { useToastState } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react'

export function Toaster() {
  const { toasts, dismiss } = useToastState()

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex items-start gap-3 rounded-xl border p-4 shadow-lg animate-fade-in',
            t.variant === 'destructive'
              ? 'bg-destructive text-destructive-foreground border-destructive/20'
              : t.variant === 'success'
              ? 'bg-card border-emerald-200 dark:border-emerald-800'
              : 'bg-card border-border'
          )}
        >
          {t.variant === 'destructive' ? (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          ) : t.variant === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
          ) : (
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{t.title}</p>
            {t.description && <p className="text-xs opacity-80 mt-0.5">{t.description}</p>}
          </div>
          <button onClick={() => dismiss(t.id)} className="shrink-0 opacity-60 hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
