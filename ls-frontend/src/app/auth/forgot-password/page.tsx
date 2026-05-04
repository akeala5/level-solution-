'use client'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '@/lib/api'

const schema = z.object({
  email: z.string().email('Email invalide'),
})
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [sentEmail, setSentEmail] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/auth/forgot-password', { email: data.email })
      setSentEmail(data.email)
      setSent(true)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'envoi')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-black font-display text-2xl">L</span>
            </div>
            <div className="text-left">
              <div className="font-display font-black text-primary text-2xl leading-none">LS</div>
              <div className="text-xs text-muted tracking-widest uppercase">Marketplace</div>
            </div>
          </Link>
        </div>

        <div className="card p-6 shadow-card-hover">
          {!sent ? (
            <>
              <div className="mb-6">
                <h1 className="heading-sm text-dark">Mot de passe oublié ?</h1>
                <p className="text-muted text-sm mt-1">
                  Entrez votre email et on vous envoie un lien de réinitialisation.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="label">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="votre@email.com"
                      className={`input pl-10 ${errors.email ? 'input-error' : ''}`}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-danger mt-1">{errors.email.message}</p>}
                </div>

                <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center">
                  {isSubmitting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    'Envoyer le lien'
                  )}
                </button>
              </form>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-success" />
              </div>
              <h2 className="font-bold text-dark text-lg mb-2">Email envoyé !</h2>
              <p className="text-muted text-sm mb-1">
                Un lien de réinitialisation a été envoyé à
              </p>
              <p className="font-semibold text-dark text-sm mb-4">{sentEmail}</p>
              <p className="text-xs text-muted">
                Vérifiez votre boîte de réception (et les spams). Le lien expire dans 1 heure.
              </p>
            </motion.div>
          )}

          <div className="mt-5 pt-4 border-t border-border">
            <Link
              href="/auth/login"
              className="flex items-center justify-center gap-2 text-sm text-muted hover:text-primary transition-colors"
            >
              <ArrowLeft size={15} /> Retour à la connexion
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
