'use client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, Loader2, User, Phone, ArrowRight, Check } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

const schema = z.object({
  firstName: z.string().min(2, 'Prénom trop court'),
  lastName: z.string().min(2, 'Nom trop court'),
  email: z.string().email('Email invalide'),
  phone: z.string().optional(),
  password: z.string()
    .min(8, 'Minimum 8 caractères')
    .regex(/[A-Z]/, 'Au moins une majuscule')
    .regex(/[0-9]/, 'Au moins un chiffre'),
  role: z.enum(['BUYER', 'SELLER']),
  referralCode: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const params = useSearchParams()
  const { login } = useAuthStore()
  const [showPass, setShowPass] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'BUYER' | 'SELLER'>('BUYER')

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'BUYER', referralCode: params.get('ref') || '' },
  })

  const password = watch('password', '')

  const strengthChecks = [
    { label: '8 caractères minimum', ok: password.length >= 8 },
    { label: 'Une majuscule', ok: /[A-Z]/.test(password) },
    { label: 'Un chiffre', ok: /[0-9]/.test(password) },
  ]

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post('/auth/register', { ...data, role: selectedRole })
      const result = res.data.data
      login(result.user, result.accessToken, result.refreshToken)
      toast.success('Compte créé ! Vérifiez votre email.')
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'inscription')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-black font-display text-2xl">L</span>
            </div>
            <div>
              <div className="font-display font-black text-primary text-2xl leading-none">LS</div>
              <div className="text-xs text-muted tracking-widest uppercase">Marketplace</div>
            </div>
          </Link>
          <h1 className="heading-sm text-dark">Créer un compte</h1>
          <p className="text-muted text-sm mt-1">Rejoignez des milliers d'utilisateurs</p>
        </div>

        <div className="card p-6 shadow-card-hover">
          {/* Role selector */}
          <div className="mb-5">
            <label className="label">Je veux</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'BUYER', label: 'Acheter', desc: 'Trouver les meilleures offres' },
                { value: 'SELLER', label: 'Vendre', desc: 'Publier mes annonces' },
              ].map(({ value, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setSelectedRole(value as any); setValue('role', value as any) }}
                  className={cn(
                    'border-2 rounded-xl p-3 text-left transition-all',
                    selectedRole === value ? 'border-primary bg-primary-50' : 'border-border hover:border-primary/40'
                  )}
                >
                  <div className={cn('font-semibold text-sm', selectedRole === value ? 'text-primary' : 'text-dark')}>
                    {label}
                  </div>
                  <div className="text-xs text-muted mt-0.5">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Prénom</label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input {...register('firstName')} placeholder="Jean" className={`input pl-10 ${errors.firstName ? 'input-error' : ''}`} />
                </div>
                {errors.firstName && <p className="text-xs text-danger mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="label">Nom</label>
                <input {...register('lastName')} placeholder="Dupont" className={`input ${errors.lastName ? 'input-error' : ''}`} />
                {errors.lastName && <p className="text-xs text-danger mt-1">{errors.lastName.message}</p>}
              </div>
            </div>

            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input {...register('email')} type="email" placeholder="votre@email.com" className={`input pl-10 ${errors.email ? 'input-error' : ''}`} />
              </div>
              {errors.email && <p className="text-xs text-danger mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Téléphone <span className="text-muted font-normal">(optionnel)</span></label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input {...register('phone')} placeholder="+228 91 00 00 00" className="input pl-10" />
              </div>
            </div>

            <div>
              <label className="label">Mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  placeholder="Créez un mot de passe fort"
                  className={`input pl-10 pr-10 ${errors.password ? 'input-error' : ''}`}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Strength indicators */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  {strengthChecks.map(({ label, ok }) => (
                    <div key={label} className={cn('flex items-center gap-1.5 text-xs', ok ? 'text-success' : 'text-muted')}>
                      <Check size={12} className={ok ? 'opacity-100' : 'opacity-30'} />
                      {label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="label">Code de parrainage <span className="text-muted font-normal">(optionnel)</span></label>
              <input {...register('referralCode')} placeholder="Ex: REF123" className="input" />
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center btn-lg">
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <>
                Créer mon compte <ArrowRight size={16} />
              </>}
            </button>

            <p className="text-xs text-muted text-center">
              En créant un compte, vous acceptez nos{' '}
              <Link href="/legal/cgu" className="text-primary hover:underline">CGU</Link>
              {' '}et notre{' '}
              <Link href="/legal/privacy" className="text-primary hover:underline">politique de confidentialité</Link>.
            </p>
          </form>

          <p className="text-center text-sm text-muted mt-4">
            Déjà un compte ?{' '}
            <Link href="/auth/login" className="text-primary font-semibold hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
