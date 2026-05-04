'use client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '@/lib/api'

const schema = z.object({
  password: z.string().min(8, 'Minimum 8 caractères'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})
type FormData = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    if (!token) {
      toast.error('Token invalide ou expiré')
      return
    }
    try {
      await api.post('/auth/reset-password', { token, newPassword: data.password })
      setSuccess(true)
      setTimeout(() => router.push('/auth/login'), 3000)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lien expiré ou invalide')
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4">
        <div className="card p-8 text-center max-w-md w-full">
          <AlertCircle size={40} className="text-danger mx-auto mb-4" />
          <h2 className="font-bold text-dark text-lg mb-2">Lien invalide</h2>
          <p className="text-muted text-sm mb-4">Ce lien de réinitialisation est invalide ou a expiré.</p>
          <Link href="/auth/forgot-password" className="btn-primary">
            Demander un nouveau lien
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
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
          {!success ? (
            <>
              <div className="mb-6">
                <h1 className="heading-sm text-dark">Nouveau mot de passe</h1>
                <p className="text-muted text-sm mt-1">Choisissez un mot de passe sécurisé.</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="label">Nouveau mot de passe</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      {...register('password')}
                      type={showPass ? 'text' : 'password'}
                      placeholder="Minimum 8 caractères"
                      className={`input pl-10 pr-10 ${errors.password ? 'input-error' : ''}`}
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-dark">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-danger mt-1">{errors.password.message}</p>}
                </div>

                <div>
                  <label className="label">Confirmer le mot de passe</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      {...register('confirmPassword')}
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Répétez le mot de passe"
                      className={`input pl-10 pr-10 ${errors.confirmPassword ? 'input-error' : ''}`}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-dark">
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-danger mt-1">{errors.confirmPassword.message}</p>}
                </div>

                <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center">
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Réinitialiser le mot de passe'}
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
              <h2 className="font-bold text-dark text-lg mb-2">Mot de passe mis à jour !</h2>
              <p className="text-muted text-sm">Vous allez être redirigé vers la connexion...</p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
