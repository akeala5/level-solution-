'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import Image from 'next/image'
import {
  Upload, X, Plus, Loader2, ArrowLeft,
  Package, Tag, MapPin, Info, CheckCircle, Image as ImageIcon, Save
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/auth.store'
import { Category, Product } from '@/types'
import { cn } from '@/lib/utils'
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
  title: z.string().min(5, 'Titre trop court').max(150),
  description: z.string().min(20, 'Description trop courte').max(5000),
  categoryId: z.string().min(1, 'Catégorie requise'),
  condition: z.enum(['NEW', 'VERY_GOOD', 'GOOD', 'FAIR', 'FOR_PARTS']),
  price: z.number({ invalid_type_error: 'Prix requis' }).positive(),
  originalPrice: z.number().positive().optional().or(z.literal(0)),
  quantity: z.number().int().positive(),
  brand: z.string().optional(),
  model: z.string().optional(),
  city: z.string().min(2, 'Ville requise'),
  country: z.string(),
  hasDelivery: z.boolean(),
  deliveryPrice: z.number().min(0).optional(),
  isNegotiable: z.boolean(),
  guarantee: z.string(),
  tags: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [existingImages, setExistingImages] = useState<{ id: string; url: string }[]>([])
  const [newImages, setNewImages] = useState<{ file: File; preview: string }[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [selectedCondition, setSelectedCondition] = useState('NEW')
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isAuthenticated) {
    router.push('/auth/login')
    return null
  }

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['product-edit', id],
    queryFn: () => api.get(`/products/${id}/edit`).then((r) => r.data.data as Product),
    enabled: !!id,
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data.data as Category[]),
  })

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!product) return
    setExistingImages(product.images?.map((img) => ({ id: img.id, url: img.url })) || [])
    setSelectedCondition(product.condition)
    reset({
      title: product.title,
      description: product.description,
      categoryId: product.categoryId,
      condition: product.condition,
      price: product.price,
      originalPrice: product.originalPrice || undefined,
      quantity: product.quantity,
      brand: product.brand || '',
      model: product.model || '',
      city: product.city || '',
      country: product.country || 'Togo',
      hasDelivery: product.hasDelivery,
      deliveryPrice: product.deliveryPrice || 0,
      isNegotiable: product.isNegotiable,
      guarantee: product.guarantee || 'NONE',
      tags: product.tags?.map((t: any) => t.tag || t.name || t).join(', ') || '',
    })
  }, [product, reset])

  const hasDelivery = watch('hasDelivery')

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const totalCount = existingImages.length + newImages.length
    const remaining = 8 - totalCount
    const toAdd = files.slice(0, remaining)

    toAdd.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} dépasse 10 Mo`); return }
      const reader = new FileReader()
      reader.onloadend = () => {
        setNewImages((prev) => [...prev, { file, preview: reader.result as string }])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const removeExistingImage = async (imgId: string) => {
    try {
      await api.delete(`/products/${id}/images/${imgId}`)
      setExistingImages((prev) => prev.filter((i) => i.id !== imgId))
    } catch {
      toast.error('Impossible de supprimer l\'image')
    }
  }

  const onSubmit = async (data: FormData) => {
    const totalImages = existingImages.length + newImages.length
    if (totalImages === 0) { toast.error('Ajoutez au moins une photo'); return }

    try {
      // Upload new images
      const newImageIds: string[] = []
      if (newImages.length > 0) {
        setUploadingImages(true)
        for (const img of newImages) {
          const form = new FormData()
          form.append('file', img.file)
          form.append('type', 'product')
          const res = await api.post('/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
          newImageIds.push(res.data.data.id || res.data.data.url)
        }
        setUploadingImages(false)
      }

      await api.patch(`/products/${id}`, {
        ...data,
        price: Number(data.price),
        originalPrice: data.originalPrice ? Number(data.originalPrice) : undefined,
        deliveryPrice: data.hasDelivery ? Number(data.deliveryPrice || 0) : undefined,
        quantity: Number(data.quantity),
        newImageIds,
        tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      })

      toast.success('Annonce mise à jour !')
      router.push('/dashboard/seller')
    } catch (err: any) {
      setUploadingImages(false)
      toast.error(err.response?.data?.message || 'Erreur lors de la mise à jour')
    }
  }

  const categories = categoriesData || []
  const flatCategories = categories.flatMap((c) =>
    c.children?.length ? c.children.map((sub) => ({ ...sub, parentName: c.name })) : [{ ...c, parentName: null }]
  )
  const totalImages = existingImages.length + newImages.length

  if (productLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="container-custom py-8 max-w-3xl">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard/seller" className="w-9 h-9 border border-border rounded-xl flex items-center justify-center hover:bg-white transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="heading-sm text-dark">Modifier l'annonce</h1>
            <p className="text-muted text-sm truncate max-w-md">{product?.title}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* PHOTOS */}
          <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card">
            <h2 className="font-bold text-dark mb-1 flex items-center gap-2">
              <ImageIcon size={17} className="text-primary" /> Photos ({totalImages}/8)
            </h2>
            <p className="text-xs text-muted mb-4">La première photo est l'image principale</p>
            <div className="grid grid-cols-4 gap-2">
              {/* Existing images */}
              {existingImages.map((img, idx) => (
                <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden border-2 border-border group">
                  <Image src={img.url} alt="" fill className="object-cover" />
                  {idx === 0 && (
                    <div className="absolute top-1 left-1 bg-primary text-white text-xs px-1.5 py-0.5 rounded-md">Principale</div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeExistingImage(img.id)}
                    className="absolute top-1 right-1 w-6 h-6 bg-danger rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} className="text-white" />
                  </button>
                </div>
              ))}
              {/* New images */}
              {newImages.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border-2 border-primary/30 group">
                  <Image src={img.preview} alt="" fill className="object-cover" />
                  <div className="absolute top-1 left-1 bg-accent text-white text-xs px-1.5 py-0.5 rounded-md">Nouvelle</div>
                  <button
                    type="button"
                    onClick={() => setNewImages((prev) => prev.filter((_, i) => i !== idx))}
                    className="absolute top-1 right-1 w-6 h-6 bg-danger rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} className="text-white" />
                  </button>
                </div>
              ))}
              {totalImages < 8 && (
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
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
          </div>

          {/* INFOS GÉNÉRALES */}
          <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card space-y-4">
            <h2 className="font-bold text-dark flex items-center gap-2">
              <Info size={17} className="text-primary" /> Informations générales
            </h2>
            <div>
              <label className="label">Titre *</label>
              <input {...register('title')} className={`input ${errors.title ? 'input-error' : ''}`} />
              {errors.title && <p className="text-xs text-danger mt-1">{errors.title.message}</p>}
            </div>
            <div>
              <label className="label">Catégorie *</label>
              <select {...register('categoryId')} className={`input ${errors.categoryId ? 'input-error' : ''}`}>
                <option value="">Sélectionner</option>
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
              <textarea {...register('description')} rows={5} className={`input resize-none ${errors.description ? 'input-error' : ''}`} />
              {errors.description && <p className="text-xs text-danger mt-1">{errors.description.message}</p>}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Marque</label>
                <input {...register('brand')} className="input" />
              </div>
              <div>
                <label className="label">Modèle</label>
                <input {...register('model')} className="input" />
              </div>
            </div>
            <div>
              <label className="label">Tags</label>
              <input {...register('tags')} placeholder="laptop, gaming, rtx..." className="input" />
            </div>
          </div>

          {/* ÉTAT */}
          <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card">
            <h2 className="font-bold text-dark mb-4 flex items-center gap-2">
              <Package size={17} className="text-primary" /> État du produit *
            </h2>
            <div className="space-y-2">
              {CONDITIONS.map((cond) => (
                <button key={cond.value} type="button"
                  onClick={() => { setSelectedCondition(cond.value); setValue('condition', cond.value as any) }}
                  className={cn('w-full flex items-center gap-4 p-3.5 rounded-xl border-2 text-left transition-all',
                    selectedCondition === cond.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                  )}
                >
                  <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
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
                <input {...register('price', { valueAsNumber: true })} type="number" className={`input ${errors.price ? 'input-error' : ''}`} />
                {errors.price && <p className="text-xs text-danger mt-1">{errors.price.message}</p>}
              </div>
              <div>
                <label className="label">Prix original</label>
                <input {...register('originalPrice', { valueAsNumber: true })} type="number" className="input" />
              </div>
              <div>
                <label className="label">Quantité *</label>
                <input {...register('quantity', { valueAsNumber: true })} type="number" min="1" className="input" />
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

          {/* LOCALISATION */}
          <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-card space-y-4">
            <h2 className="font-bold text-dark flex items-center gap-2">
              <MapPin size={17} className="text-primary" /> Localisation et livraison
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Ville *</label>
                <input {...register('city')} className={`input ${errors.city ? 'input-error' : ''}`} />
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
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...register('hasDelivery')} className="w-4 h-4 accent-primary" />
              <span className="text-sm font-medium text-dark">Livraison disponible</span>
            </label>
            {hasDelivery && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <label className="label">Frais de livraison (FCFA)</label>
                <input {...register('deliveryPrice', { valueAsNumber: true })} type="number" min="0" className="input" />
              </motion.div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3 pb-6">
            <Link href="/dashboard/seller" className="btn-outline flex-1 justify-center">Annuler</Link>
            <button type="submit" disabled={isSubmitting || uploadingImages} className="btn-primary flex-1 justify-center">
              {isSubmitting || uploadingImages ? (
                <><Loader2 size={17} className="animate-spin" /> {uploadingImages ? 'Upload...' : 'Sauvegarde...'}</>
              ) : (
                <><Save size={17} /> Enregistrer les modifications</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
