'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import Image from 'next/image'
import {
  User, Mail, Phone, MapPin, Camera, Loader2, Save,
  Lock, Shield, Bell, Eye, EyeOff, CheckCircle, LogOut, Award
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/auth.store'
import { initials, cn } from '@/lib/utils'
import api from '@/lib/api'

const profileSchema = z.object({
  firstName: z.string().min(2, 'Prénom requis'),
  lastName: z.string().min(2, 'Nom requis'),
  phone: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  bio: z.string().max(300, 'Maximum 300 caractères').optional(),
  language: z.string().optional(),
  currency: z.string().optional(),
})
type ProfileData = z.infer<typeof profileSchema>

const passwordSchema = z.object({
  currentPassword: z.string().min(6, 'Mot de passe actuel requis'),
  newPassword: z.string().min(8, 'Minimum 8 caractères'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})
type PasswordData = z.infer<typeof passwordSchema>

const TABS = [
  { id: 'info', label: 'Informations', icon: User },
  { id: 'security', label: 'Sécurité', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
]

const COUNTRIES = ['Togo', 'Côte d\'Ivoire', 'Sénégal', 'Ghana', 'Bénin', 'Burkina Faso', 'Mali', 'Niger', 'Autre']
const LANGUAGES = [{ value: 'fr', label: 'Français' }, { value: 'en', label: 'English' }]
const CURRENCIES = [{ value: 'XOF', label: 'FCFA (XOF)' }, { value: 'EUR', label: 'Euro (EUR)' }, { value: 'USD', label: 'Dollar (USD)' }]

export default function ProfilePage() {
  const router = useRouter()
  const { user, isAuthenticated, updateUser, logout } = useAuthStore()
  const [activeTab, setActiveTab] = useState('info')
  const [showCurrentPass, setShowCurrentPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()

  if (!isAuthenticated) {
    router.push('/auth/login')
    return null
  }

  const { register: regProfile, handleSubmit: submitProfile, formState: { errors: profileErrors, isSubmitting: profileSubmitting } } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      city: user?.profile?.city || '',
      country: user?.profile?.country || 'Togo',
      bio: user?.profile?.bio || '',
      language: user?.profile?.language || 'fr',
      currency: user?.profile?.currency || 'XOF',
    },
  })

  const { register: regPass, handleSubmit: submitPass, reset: resetPass, formState: { errors: passErrors, isSubmitting: passSubmitting } } = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
  })

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileData) => api.patch('/users/me/profile', data),
    onSuccess: (res) => {
      updateUser(res.data.data)
      toast.success('Profil mis à jour')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erreur lors de la mise à jour'),
  })

  const changePasswordMutation = useMutation({
    mutationFn: (data: PasswordData) =>
      api.patch('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }),
    onSuccess: () => {
      toast.success('Mot de passe modifié')
      resetPass()
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Mot de passe actuel incorrect'),
  })

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image trop lourde (max 5 Mo)')
      return
    }

    setUploadingAvatar(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('type', 'avatar')
      const res = await api.post('/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const avatarUrl = res.data.data.url
      await api.patch('/users/me/profile', { avatarUrl })
      updateUser({ profile: { ...user?.profile, avatarUrl } as any })
      toast.success('Photo de profil mise à jour')
    } catch {
      toast.error('Erreur lors de l\'upload')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/')
    toast('Déconnecté', { icon: '👋' })
  }

  const avatarUrl = user?.profile?.avatarUrl

  return (
    <div className="min-h-screen bg-surface">
      <div className="container-custom py-8 max-w-3xl">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 border border-border/50 shadow-card mb-5">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center border-2 border-border">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="Avatar" width={80} height={80} className="object-cover w-full h-full" />
                ) : (
                  <span className="text-primary font-black text-2xl">
                    {initials(user?.firstName || '?', user?.lastName || '')}
                  </span>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-md hover:bg-primary-600 transition-colors"
              >
                {uploadingAvatar ? (
                  <Loader2 size={13} className="text-white animate-spin" />
                ) : (
                  <Camera size={13} className="text-white" />
                )}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-dark text-xl">{user?.firstName} {user?.lastName}</h1>
                {user?.isKycVerified && (
                  <Award size={16} className="text-blue-500" title="KYC vérifié" />
                )}
              </div>
              <p className="text-muted text-sm">{user?.email}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  {user?.role === 'SELLER' ? 'Vendeur' : user?.role === 'ADMIN' ? 'Admin' : 'Acheteur'}
                </span>
                {user?.subscription?.plan && user.subscription.plan !== 'FREE' && (
                  <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">
                    Plan {user.subscription.plan}
                  </span>
                )}
                {user?.isEmailVerified && (
                  <span className="flex items-center gap-1 text-xs text-success">
                    <CheckCircle size={11} /> Email vérifié
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-xs text-muted hover:text-danger transition-colors flex-shrink-0"
            >
              <LogOut size={15} /> Déconnexion
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-border/50 rounded-2xl p-1 mb-5 shadow-card w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-dark hover:bg-surface'
              )}
            >
              <tab.icon size={15} /> {tab.label}
            </button>
          ))}
        </div>

        {/* INFO */}
        {activeTab === 'info' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 border border-border/50 shadow-card"
          >
            <h2 className="font-bold text-dark mb-5">Informations personnelles</h2>
            <form onSubmit={submitProfile((data) => updateProfileMutation.mutate(data))} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Prénom</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input {...regProfile('firstName')} className={`input pl-9 ${profileErrors.firstName ? 'input-error' : ''}`} />
                  </div>
                  {profileErrors.firstName && <p className="text-xs text-danger mt-1">{profileErrors.firstName.message}</p>}
                </div>
                <div>
                  <label className="label">Nom</label>
                  <input {...regProfile('lastName')} className={`input ${profileErrors.lastName ? 'input-error' : ''}`} />
                  {profileErrors.lastName && <p className="text-xs text-danger mt-1">{profileErrors.lastName.message}</p>}
                </div>
                <div>
                  <label className="label">Téléphone</label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input {...regProfile('phone')} className="input pl-9" placeholder="+228 90 00 00 00" />
                  </div>
                </div>
                <div>
                  <label className="label">Ville</label>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input {...regProfile('city')} className="input pl-9" placeholder="Lomé, Abidjan..." />
                  </div>
                </div>
                <div>
                  <label className="label">Pays</label>
                  <select {...regProfile('country')} className="input">
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Langue</label>
                  <select {...regProfile('language')} className="input">
                    {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Devise préférée</label>
                  <select {...regProfile('currency')} className="input">
                    {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Bio <span className="text-muted font-normal">(optionnel)</span></label>
                  <textarea
                    {...regProfile('bio')}
                    rows={3}
                    className="input resize-none"
                    placeholder="Quelques mots sur vous..."
                  />
                  {profileErrors.bio && <p className="text-xs text-danger mt-1">{profileErrors.bio.message}</p>}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button type="submit" disabled={profileSubmitting} className="btn-primary gap-2">
                  {profileSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Enregistrer
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* SECURITY */}
        {activeTab === 'security' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Change password */}
            <div className="bg-white rounded-2xl p-6 border border-border/50 shadow-card">
              <h2 className="font-bold text-dark mb-5 flex items-center gap-2">
                <Lock size={17} className="text-primary" /> Changer le mot de passe
              </h2>
              <form onSubmit={submitPass((data) => changePasswordMutation.mutate(data))} className="space-y-4">
                <div>
                  <label className="label">Mot de passe actuel</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      {...regPass('currentPassword')}
                      type={showCurrentPass ? 'text' : 'password'}
                      className={`input pl-9 pr-10 ${passErrors.currentPassword ? 'input-error' : ''}`}
                    />
                    <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-dark">
                      {showCurrentPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {passErrors.currentPassword && <p className="text-xs text-danger mt-1">{passErrors.currentPassword.message}</p>}
                </div>

                <div>
                  <label className="label">Nouveau mot de passe</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      {...regPass('newPassword')}
                      type={showNewPass ? 'text' : 'password'}
                      className={`input pl-9 pr-10 ${passErrors.newPassword ? 'input-error' : ''}`}
                      placeholder="Minimum 8 caractères"
                    />
                    <button type="button" onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-dark">
                      {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {passErrors.newPassword && <p className="text-xs text-danger mt-1">{passErrors.newPassword.message}</p>}
                </div>

                <div>
                  <label className="label">Confirmer le nouveau mot de passe</label>
                  <input
                    {...regPass('confirmPassword')}
                    type="password"
                    className={`input ${passErrors.confirmPassword ? 'input-error' : ''}`}
                  />
                  {passErrors.confirmPassword && <p className="text-xs text-danger mt-1">{passErrors.confirmPassword.message}</p>}
                </div>

                <div className="flex justify-end">
                  <button type="submit" disabled={passSubmitting} className="btn-primary gap-2">
                    {passSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Mettre à jour
                  </button>
                </div>
              </form>
            </div>

            {/* 2FA */}
            <div className="bg-white rounded-2xl p-6 border border-border/50 shadow-card">
              <h2 className="font-bold text-dark mb-1 flex items-center gap-2">
                <Shield size={17} className="text-primary" /> Double authentification (2FA)
              </h2>
              <p className="text-muted text-sm mb-4">
                Ajoutez une couche de sécurité supplémentaire à votre compte.
              </p>
              <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <Shield size={20} className={user?.twoFactorEnabled ? 'text-success' : 'text-muted'} />
                  <div>
                    <p className="font-medium text-dark text-sm">
                      {user?.twoFactorEnabled ? '2FA activé' : '2FA désactivé'}
                    </p>
                    <p className="text-xs text-muted">Application Authenticator (TOTP)</p>
                  </div>
                </div>
                <button
                  onClick={() => toast('Gestion 2FA bientôt disponible', { icon: '🔐' })}
                  className={cn('btn-sm', user?.twoFactorEnabled ? 'btn-outline' : 'btn-primary')}
                >
                  {user?.twoFactorEnabled ? 'Désactiver' : 'Activer'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 border border-border/50 shadow-card"
          >
            <h2 className="font-bold text-dark mb-5 flex items-center gap-2">
              <Bell size={17} className="text-primary" /> Préférences de notifications
            </h2>
            <div className="space-y-4">
              {[
                { label: 'Nouvelles commandes', desc: 'Être notifié quand une commande est passée', key: 'orders' },
                { label: 'Messages', desc: 'Recevoir les notifications de chat', key: 'messages' },
                { label: 'Avis clients', desc: 'Être notifié des nouveaux avis', key: 'reviews' },
                { label: 'Offres et promotions', desc: 'Recevoir les actualités et offres de LS', key: 'marketing' },
                { label: 'Alertes de sécurité', desc: 'Connexions suspectes et changements de compte', key: 'security' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4 bg-surface rounded-xl border border-border">
                  <div>
                    <p className="font-medium text-dark text-sm">{item.label}</p>
                    <p className="text-xs text-muted">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked={item.key !== 'marketing'}
                      className="sr-only peer"
                      onChange={() => toast('Préférences sauvegardées', { icon: '🔔' })}
                    />
                    <div className="w-10 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                  </label>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
