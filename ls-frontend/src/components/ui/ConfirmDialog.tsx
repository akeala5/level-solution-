'use client'
import { createContext, useContext, useState, useRef, useCallback, useEffect, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'warning'
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

/** Remplace confirm() natif : promise-based, focus par défaut sur Annuler
 *  (anti double-Entrée), Échap / clic externe = annulation, fail-safe
 *  (sans réponse explicite, l'action est bloquée). */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm doit être utilisé sous <ConfirmProvider>')
  return ctx
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  const confirm = useCallback<ConfirmFn>(
    (opts) => new Promise<boolean>((resolve) => setPending({ ...opts, resolve })),
    []
  )

  const close = useCallback((value: boolean) => {
    setPending((current) => {
      current?.resolve(value)
      return null
    })
  }, [])

  useEffect(() => {
    if (!pending) return
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pending, close])

  const tone = pending?.tone ?? 'danger'

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => close(false)} />
          <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl p-5 animate-fade-in">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  tone === 'danger' ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                )}
              >
                <AlertTriangle size={20} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 id="confirm-title" className="font-bold text-dark text-base">{pending.title}</h2>
                {pending.message && <p className="text-sm text-muted mt-1">{pending.message}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                ref={cancelRef}
                type="button"
                onClick={() => close(false)}
                className="btn-base bg-fg/5 text-dark px-4 py-2.5 text-sm hover:bg-fg/10"
              >
                {pending.cancelLabel ?? 'Annuler'}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={cn(
                  'btn-base text-white px-4 py-2.5 text-sm',
                  tone === 'danger' ? 'bg-danger hover:bg-red-600' : 'bg-warning hover:bg-amber-600'
                )}
              >
                {pending.confirmLabel ?? 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
