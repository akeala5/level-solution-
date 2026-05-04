'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe trop court'),
  otpCode: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [showPass, setShowPass] = useState(false)
  const [requires2FA, setRequires2FA] = useState(false)
  const [userId2FA, setUserId2FA] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post('/auth/login', data)
      const result = res.data.data

      if (result.requires2FA) {
        setRequires2FA(true)
        setUserId2FA(result.userId)
        toast('Entrez votre code 2FA', { icon: '🔐' })
        return
      }

      login(result.user, result.accessToken, result.refreshToken)
      toast.success(`Bienvenue, ${result.user.firstName} !`)
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Identifiants incorrects')
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
          <h1 className="heading-sm text-dark">Connexion</h1>
          <p className="text-muted text-sm mt-1">Content de vous revoir !</p>
        </div>

        <div className="card p-6 shadow-card-hover">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
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

            {/* Password */}
            <div>
              <label className="label">Mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  placeholder="Votre mot de passe"
                  className={`input pl-10 pr-10 ${errors.password ? 'input-error' : ''}`}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-dark">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-danger mt-1">{errors.password.message}</p>}
            </div>

            {/* 2FA code */}
            {requires2FA && (
              <div>
                <label className="label">Code 2FA (Application Authenticator)</label>
                <input
                  {...register('otpCode')}
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  className="input text-center tracking-widest text-lg font-mono"
                />
              </div>
            )}

            <div className="flex justify-end">
              <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center">
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <>
                Se connecter <ArrowRight size={16} />
              </>}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-muted">ou</span>
            </div>
          </div>

          <p className="text-center text-sm text-muted">
            Pas encore de compte ?{' '}
            <Link href="/auth/register" className="text-primary font-semibold hover:underline">
              Créer un compte
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
