'use client'
import { useEffect, useState } from 'react'
import { MailWarning, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'

// Bandeau rappelant de vérifier l'e-mail. Les actions sensibles (publier une
// annonce, commander, retirer) sont bloquées côté serveur par EmailVerifiedGuard
// tant que isEmailVerified est false ; ce bandeau est le pendant UX.
export default function EmailVerificationBanner() {
  const { user, isAuthenticated, _hasHydrated, updateUser } = useAuthStore()
  const [sending, setSending] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Rafraîchit l'état au montage (ex. e-mail vérifié depuis un autre onglet/appareil).
  useEffect(() => {
    if (!isAuthenticated) return
    api.get('/users/me')
      .then((res) => {
        const v = res?.data?.data?.isEmailVerified
        if (typeof v === 'boolean') updateUser({ isEmailVerified: v })
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  if (!_hasHydrated || !isAuthenticated || !user) return null
  if (user.isEmailVerified !== false) return null
  if (dismissed) return null

  const resend = async () => {
    setSending(true)
    try {
      await api.post('/auth/resend-verification')
      toast.success('E-mail de vérification renvoyé. Vérifiez votre boîte de réception.')
    } catch {
      toast.error("Impossible d'envoyer l'e-mail pour le moment.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-amber-50 text-amber-900">
      <div className="container-custom flex items-center gap-3 py-2.5 text-[13px]">
        <MailWarning size={17} className="text-amber-600 shrink-0" />
        <p className="flex-1 min-w-0">
          <span className="font-semibold">Vérifiez votre adresse e-mail</span>{' '}
          <span className="text-amber-800 hidden sm:inline">pour publier une annonce, commander ou retirer vos gains.</span>
        </p>
        <button
          onClick={resend}
          disabled={sending}
          className="shrink-0 font-bold underline underline-offset-2 hover:text-amber-950 disabled:opacity-60 whitespace-nowrap"
        >
          {sending ? 'Envoi…' : "Renvoyer l'e-mail"}
        </button>
        <button onClick={() => setDismissed(true)} aria-label="Masquer" className="shrink-0 text-amber-500 hover:text-amber-800">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
