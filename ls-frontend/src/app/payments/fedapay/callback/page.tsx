'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function FedapayCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    // Cette page ne doit jamais traiter le statut depuis l'URL (risque de forge).
    // Le backend redirige directement vers /orders/:id?payment=... après vérification DB.
    // Si on arrive ici c'est un cas exceptionnel — rediriger vers le tableau de bord.
    router.replace('/dashboard/buyer')
  }, [router])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 size={32} className="animate-spin text-indigo-600 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Vérification du paiement…</p>
      </div>
    </div>
  )
}
