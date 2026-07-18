'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Flag } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal, Button } from '@/components/ui'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'

const REASONS: { value: string; label: string }[] = [
  { value: 'SCAM', label: 'Arnaque / tentative de fraude' },
  { value: 'COUNTERFEIT', label: 'Contrefaçon' },
  { value: 'PROHIBITED', label: 'Produit interdit ou illégal' },
  { value: 'OFFENSIVE', label: 'Contenu offensant' },
  { value: 'SPAM', label: 'Spam / doublon' },
  { value: 'OTHER', label: 'Autre' },
]

export default function ReportProductButton({ productId }: { productId: string }) {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('SCAM')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const openModal = () => {
    if (!isAuthenticated) {
      toast('Connectez-vous pour signaler une annonce', { icon: '🔒' })
      router.push('/auth/login')
      return
    }
    setOpen(true)
  }

  const submit = async () => {
    setSubmitting(true)
    try {
      await api.post('/reports', {
        targetType: 'PRODUCT',
        targetId: productId,
        reason,
        description: description.trim() || undefined,
      })
      toast.success('Merci, votre signalement a été transmis à notre équipe.')
      setOpen(false)
      setReason('SCAM')
      setDescription('')
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Impossible d'envoyer le signalement.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-danger transition-colors"
      >
        <Flag size={13} /> Signaler cette annonce
      </button>

      <Modal open={open} onClose={() => !submitting && setOpen(false)} title="Signaler cette annonce" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">Motif du signalement</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-dark focus:border-primary focus:outline-none"
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">Détails (facultatif)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Décrivez le problème rencontré…"
              className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-dark resize-none focus:border-primary focus:outline-none"
            />
          </div>
          <p className="text-xs text-muted">
            Les signalements abusifs peuvent entraîner des restrictions sur votre compte.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={submitting}>Annuler</Button>
            <Button variant="danger" onClick={submit} loading={submitting}>Envoyer le signalement</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
