'use client'
import { useState, useEffect } from 'react'
import { X, Download, Share2 } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [ready, setReady] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (sessionStorage.getItem('pwa-banner-dismissed')) { setDismissed(true); return }

    const ua = navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window)
    setIsIOS(ios)
    if (ios) { setReady(true); return }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setReady(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setDeferredPrompt(null)
    dismiss()
  }

  const dismiss = () => {
    sessionStorage.setItem('pwa-banner-dismissed', '1')
    setDismissed(true)
  }

  if (!ready || dismissed) return null

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-[85] bg-white border-t border-slate-200 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="max-w-screen-sm mx-auto flex items-center gap-3 px-4 py-3">
        <img
          src="/icons/icon-96x96.png"
          alt="LS Marketplace"
          width={48}
          height={48}
          className="rounded-[14px] shrink-0 shadow-sm border border-slate-100"
        />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 leading-tight">Installer LS Marketplace</p>
          {isIOS ? (
            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 flex-wrap">
              Appuyez sur <Share2 size={10} className="inline shrink-0" /> puis
              <span className="font-medium text-slate-700">«&nbsp;Sur l'écran d'accueil&nbsp;»</span>
            </p>
          ) : (
            <p className="text-[11px] text-slate-500 mt-0.5">
              Accès rapide · Mode hors-ligne disponible
            </p>
          )}
        </div>

        {!isIOS && (
          <button
            onClick={handleInstall}
            className="shrink-0 inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all shadow-sm"
          >
            <Download size={12} />
            Installer
          </button>
        )}

        <button
          onClick={dismiss}
          aria-label="Fermer"
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  )
}
