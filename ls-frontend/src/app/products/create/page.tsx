'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import Image from 'next/image'
import {
  Upload, X, Plus, Loader2, ArrowLeft, Package,
  Tag, MapPin, Truck, Info, CheckCircle, Image as ImageIcon, TrendingUp, Layers,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/auth.store'
import { Category } from '@/types'
import { cn, formatPrice } from '@/lib/utils'
import api from '@/lib/api'
import Link from 'next/link'

const CONDITIONS = [
  { value: 'NEW', label: 'Neuf', desc: 'Jamais utilisé, dans sa boîte d\'origine' },
  { value: 'VERY_GOOD', label: 'Très bon état', desc: 'Utilisé mais comme neuf, sans défauts' },
  { value: 'GOOD', label: 'Bon état', desc: 'Quelques traces d\'usage légères' },
  { value: 'FAIR', label: 'État correct', desc: 'Traces d\'usage visibles, fonctionne bien' },
  { value: 'FOR_PARTS', label: 'Pour pièces', desc: 'Non fonctionnel, pour pièces détachées' },
]

const GUARANTEES = [
  { value: 'NONE', label: 'Aucune garantie' },
  { value: '1_MONTH', label: '1 mois' },
  { value: '3_MONTHS', label: '3 mois' },
  { value: '6_MONTHS', label: '6 mois' },
  { value: '1_YEAR', label: '1 an' },
  { value: '2_YEARS', label: '2 ans' },
]

const schema = z.object({
  title: z.string().min(5, 'Titre trop court (min 5 caractères)').max(150),
  description: z.string().min(20, 'Description trop courte (min 20 caractères)').max(5000),
  categoryId: z.string().min(1, 'Catégorie requise'),
  condition: z.enum(['NEW', 'VERY_GOOD', 'GOOD', 'FAIR', 'FOR_PARTS']),
  price: z.number({ invalid_type_error: 'Prix requis' }).positive('Prix invalide'),
  originalPrice: z.number().positive().optional().or(z.literal(0)),
  quantity: z.number().int().positive().default(1),
  brand: z.string().optional(),
  model: z.string().optional(),
  city: z.string().min(2, 'Ville requise'),
  country: z.string().default('Togo'),
  hasDelivery: z.boolean().default(false),
  deliveryPrice: z.number().min(0).optional(),
  isNegotiable: z.boolean().default(false),
  guarantee: z.string().default('NONE'),
  tags: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function CreateProductPage() {
  const router = useRouter()
  const { user, isAuthenticated, _hasHydrated } = useAuthStore()
  const [images, setImages] = useState<{ file: File; preview: string }[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [selectedCondition, setSelectedCondition] = useState('NEW')
  const [isBundle, setIsBundle] = useState(false)
  const [bundleDiscount, setBundleDiscount] = useState(0)
  const [bundleItems, setBundleItems] = useState<{ name: string; quantity: number; unitPrice: number }[]>([
    { name: '', quantity: 1, unitPrice: 0 },
    { name: '', quantity: 1, unitPrice: 0 },
  ])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) router.push('/auth/login')
  }, [_hasHydrated, isAuthenticated, router])

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data.data as Category[]),
    enabled: isAuthenticated,
  })

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      condition: 'NEW',
      quantity: 1,
      hasDelivery: false,
      isNegotiable: false,
      guarantee: 'NONE',
      country: user?.profile?.country || 'Togo',
      city: user?.profile?.city || '',
    },
  })

  const hasDelivery = watch('hasDelivery')
  const watchedCategoryId = watch('categoryId')

  const { data: priceStats } = useQuery({
    queryKey: ['price-stats', watchedCategoryId],
    queryFn: () => api.get('/products/price-stats', { params: { categoryId: watchedCategoryId } })
      .then((r) => r.data.data as { median: number; min: number; max: number; count: number; suggested: number } | null),
    enabled: !!watchedCategoryId,
    staleTime: 5 * 60 * 1000,
  })

  if (!_hasHydrated) return <div className="min-h-screen flex items-center justify-center"><Loader2 size={28} className="animate-spin text-primary" /></div>

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const remaining = 8 - images.length
    const toAdd = files.slice(0, remaining)

    toAdd.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} dépasse 10 Mo`)
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setImages((prev) => [...prev, { file, preview: reader.result as string }])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx))
  }

  const uploadImages = async (): Promise<string[] | null> => {
    if (images.length === 0) return []
    setUploadingImages(true)
    const ids: string[] = []
    try {
      for (const img of images) {
        const form = new FormData()
        form.append('file', img.file)
        form.append('type', 'product')
        const res = await api.post('/upload/image', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        ids.push(res.data.data.id || res.data.data.url)
      }
      return ids
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erreur lors de l'upload des photos")
      return null
    } finally {
      setUploadingImages(false)
    }
  }

  const onSubmit = async (data: FormData) => {
    if (images.length === 0) {
      toast.error('Ajoutez au moins une photo')
      return
    }

    try {
      const imageIds = await uploadImages()
      if (imageIds === null) return

      const validBundleItems = bundleItems.filter((i) => i.name.trim().length > 0)
      if (isBundle && validBundleItems.length < 2) {
        toast.error('Un lot doit contenir au moins 2 articles nommés')
        return
      }

      const payload = {
        ...data,
        price: Number(data.price),
        originalPrice: data.originalPrice ? Number(data.originalPrice) : undefined,
        deliveryPrice: data.hasDelivery ? Number(data.deliveryPrice || 0) : undefined,
        quantity: Number(data.quantity),
        imageIds,
        tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        isBundle,
        bundleItems: isBundle ? validBundleItems : undefined,
        bundleDiscount: isBundle && bundleDiscount > 0 ? bundleDiscount : undefined,
      }

      await api.post('/products', payload)
      toast.success('Annonce publiée avec succès !')
      router.push('/dashboard/seller')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de la publication')
    }
  }

  const categories = categoriesData || []
  const flatCategories = categories.flatMap((c) =>
    c.children?.length ? c.children.map((sub) => ({ ...sub, parentName: c.name })) : [{ ...c, parentName: null }]
  )

  return (
    <div className="min-h-screen bg-surface">
      <div className="container-custom py-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard/seller" className="w-9 h-9 border border-border rounded-xl flex items-center justify-center hover:bg-white transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="heading-sm text-dark">Publier une annonce</h1>
            <p className="text-muted text-sm">Les champs marqués * sont obligatoires</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* PHOTOS */}
          <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card">
            <h2 className="font-bold text-dark mb-1 flex items-center gap-2">
              <ImageIcon size={17} className="text-primary" /> Photos *
            </h2>
            <p className="text-xs text-muted mb-4">Maximum 8 photos — JPG, PNG, WEBP (max 10 Mo chacune)</p>

            <div className="grid grid-cols-4 gap-2">
              {images.map((img, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative aspect-square rounded-xl overflow-hidden border-2 border-border group"
                >
                  <Image src={img.preview} alt="" fill className="object-cover" />
                  {idx === 0 && (
                    <div className="absolute top-1 left-1 bg-primary text-white text-xs px-1.5 py-0.5 rounded-md font-medium">
                      Principale
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 w-6 h-6 bg-danger rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} className="text-white" />
                  </button>
                </motion.div>
              ))}
              {images.length < 8 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 flex flex-col items-center justify-center gap-1 transition-all"
                >
                  <Plus size={20} className="text-muted" />
                  <span className="text-xs text-muted">Ajouter</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageSelect}
            />
          </div>

          {/* INFOS GÉNÉRALES */}
          <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card space-y-4">
            <h2 className="font-bold text-dark flex items-center gap-2">
              <Info size={17} className="text-primary" /> Informations générales
            </h2>

            <div>
              <label className="label">Titre *</label>
              <input
                {...register('title')}
                placeholder="Ex: MacBook Pro M3 14 pouces — Très bon état"
                className={`input ${errors.title ? 'input-error' : ''}`}
              />
              {errors.title && <p className="text-xs text-danger mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="label">Catégorie *</label>
              <select {...register('categoryId')} className={`input ${errors.categoryId ? 'input-error' : ''}`}>
                <option value="">Sélectionner une catégorie</option>
                {flatCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.parentName ? `${cat.parentName} › ${cat.name}` : cat.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && <p className="text-xs text-danger mt-1">{errors.categoryId.message}</p>}
            </div>

            <div>
              <label className="label">Description *</label>
              <textarea
                {...register('description')}
                rows={5}
                placeholder="Décrivez votre produit en détail : caractéristiques, état, accessoires inclus, raison de vente..."
                className={`input resize-none ${errors.description ? 'input-error' : ''}`}
              />
              {errors.description && <p className="text-xs text-danger mt-1">{errors.description.message}</p>}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Marque</label>
                <input {...register('brand')} placeholder="Apple, Dell, HP..." className="input" />
              </div>
              <div>
                <label className="label">Modèle</label>
                <input {...register('model')} placeholder="MacBook Pro M3, Latitude 5540..." className="input" />
              </div>
            </div>

            <div>
              <label className="label">Tags (séparés par des virgules)</label>
              <input {...register('tags')} placeholder="laptop, gaming, rtx, reconditionné..." className="input" />
              <p className="text-xs text-muted mt-1">Aide les acheteurs à trouver votre annonce</p>
            </div>
          </div>

          {/* ÉTAT */}
          <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card">
            <h2 className="font-bold text-dark mb-4 flex items-center gap-2">
              <Package size={17} className="text-primary" /> État du produit *
            </h2>
            <div className="space-y-2">
              {CONDITIONS.map((cond) => (
                <button
                  key={cond.value}
                  type="button"
                  onClick={() => { setSelectedCondition(cond.value); setValue('condition', cond.value as any) }}
                  className={cn(
                    'w-full flex items-center gap-4 p-3.5 rounded-xl border-2 text-left transition-all',
                    selectedCondition === cond.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                    selectedCondition === cond.value ? 'border-primary bg-primary' : 'border-border'
                  )}>
                    {selectedCondition === cond.value && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <div>
                    <span className="font-semibold text-dark text-sm">{cond.label}</span>
                    <p className="text-xs text-muted">{cond.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* PRIX */}
          <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card space-y-4">
            <h2 className="font-bold text-dark flex items-center gap-2">
              <Tag size={17} className="text-primary" /> Prix et quantité
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Prix de vente * (FCFA)</label>
                <input
                  {...register('price', { valueAsNumber: true })}
                  type="number"
                  placeholder="Ex: 450000"
                  className={`input ${errors.price ? 'input-error' : ''}`}
                />
                {errors.price && <p className="text-xs text-danger mt-1">{errors.price.message}</p>}

                {/* Smart Pricing widget */}
                {priceStats && priceStats.count >= 3 && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <TrendingUp size={13} className="text-blue-500" />
                      <span className="text-xs font-semibold text-blue-700">Smart Pricing</span>
                      <span className="text-[10px] text-blue-500">({priceStats.count} annonces similaires)</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-blue-700 space-y-0.5">
                        <p>Médiane : <span className="font-bold">{formatPrice(priceStats.median)}</span></p>
                        <p className="text-blue-500">Fourchette : {formatPrice(priceStats.min)} – {formatPrice(priceStats.max)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setValue('price', priceStats.suggested, { shouldValidate: true })}
                        className="shrink-0 text-xs font-semibold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Appliquer {formatPrice(priceStats.suggested)}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="label">Prix original <span className="text-muted font-normal">(pour afficher la réduction)</span></label>
                <input
                  {...register('originalPrice', { valueAsNumber: true })}
                  type="number"
                  placeholder="Ex: 600000"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Quantité disponible *</label>
                <input
                  {...register('quantity', { valueAsNumber: true })}
                  type="number"
                  min="1"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Garantie</label>
                <select {...register('guarantee')} className="input">
                  {GUARANTEES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...register('isNegotiable')} className="w-4 h-4 accent-primary" />
              <span className="text-sm text-dark">Prix négociable</span>
            </label>
          </div>

          {/* LOCALISATION & LIVRAISON */}
          <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card space-y-4">
            <h2 className="font-bold text-dark flex items-center gap-2">
              <MapPin size={17} className="text-primary" /> Localisation et livraison
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Ville *</label>
                <input {...register('city')} placeholder="Lomé, Abidjan, Dakar..." className={`input ${errors.city ? 'input-error' : ''}`} />
                {errors.city && <p className="text-xs text-danger mt-1">{errors.city.message}</p>}
              </div>
              <div>
                <label className="label">Pays</label>
                <select {...register('country')} className="input">
                  {['Togo', 'Côte d\'Ivoire', 'Sénégal', 'Ghana', 'Bénin', 'Burkina Faso', 'Mali', 'Autre'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('hasDelivery')}
                  className="w-4 h-4 accent-primary"
                />
                <div>
                  <span className="text-sm font-medium text-dark">Livraison disponible</span>
                  <p className="text-xs text-muted">Vous pouvez livrer le produit à l'acheteur</p>
                </div>
              </label>

              {hasDelivery && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                >
                  <label className="label">Frais de livraison (FCFA, 0 = gratuit)</label>
                  <input
                    {...register('deliveryPrice', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    placeholder="Ex: 2000"
                    className="input"
                  />
                </motion.div>
              )}
            </div>
          </div>

          {/* VENTE EN LOT */}
          <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isBundle}
                onChange={(e) => setIsBundle(e.target.checked)}
                className="w-4 h-4 accent-violet-600"
              />
              <div className="flex items-center gap-2">
                <Layers size={17} className="text-violet-600" />
                <div>
                  <span className="text-sm font-medium text-dark">Vente en lot (bundle)</span>
                  <p className="text-xs text-muted">Plusieurs articles vendus ensemble à un prix groupé</p>
                </div>
              </div>
            </label>

            {isBundle && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3"
              >
                <div className="p-3 bg-violet-50 rounded-xl border border-violet-100">
                  <p className="text-xs text-violet-700 font-medium mb-3">Articles inclus dans le lot</p>
                  <div className="space-y-2">
                    {bundleItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={`Article ${idx + 1} (ex: Chargeur USB-C)`}
                          value={item.name}
                          onChange={(e) => {
                            const next = [...bundleItems]
                            next[idx] = { ...next[idx], name: e.target.value }
                            setBundleItems(next)
                          }}
                          className="input flex-1 text-sm py-2"
                        />
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const next = [...bundleItems]
                            next[idx] = { ...next[idx], quantity: Number(e.target.value) || 1 }
                            setBundleItems(next)
                          }}
                          className="input w-16 text-sm py-2 text-center"
                          title="Quantité"
                        />
                        <input
                          type="number"
                          min="0"
                          placeholder="Prix unit."
                          value={item.unitPrice || ''}
                          onChange={(e) => {
                            const next = [...bundleItems]
                            next[idx] = { ...next[idx], unitPrice: Number(e.target.value) || 0 }
                            setBundleItems(next)
                          }}
                          className="input w-28 text-sm py-2"
                          title="Prix unitaire (optionnel)"
                        />
                        {bundleItems.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setBundleItems(bundleItems.filter((_, i) => i !== idx))}
                            className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center shrink-0"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {bundleItems.length < 10 && (
                    <button
                      type="button"
                      onClick={() => setBundleItems([...bundleItems, { name: '', quantity: 1, unitPrice: 0 }])}
                      className="mt-2 flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 font-medium"
                    >
                      <Plus size={12} /> Ajouter un article
                    </button>
                  )}
                </div>

                <div>
                  <label className="label">Remise du lot (%) — optionnel</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="80"
                      step="5"
                      value={bundleDiscount}
                      onChange={(e) => setBundleDiscount(Number(e.target.value))}
                      className="flex-1 accent-violet-600"
                    />
                    <span className="w-14 text-center font-bold text-violet-700 text-sm bg-violet-50 rounded-lg py-1 border border-violet-200">
                      {bundleDiscount > 0 ? `-${bundleDiscount}%` : 'Aucune'}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-1">Affiché sur la fiche produit pour inciter à l'achat du lot</p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3 pb-6">
            <Link href="/dashboard/seller" className="btn-outline flex-1 justify-center">
              Annuler
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || uploadingImages}
              className="btn-primary flex-1 justify-center"
            >
              {isSubmitting || uploadingImages ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  {uploadingImages ? 'Upload photos...' : 'Publication...'}
                </>
              ) : (
                <>
                  <CheckCircle size={17} /> Publier l'annonce
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
