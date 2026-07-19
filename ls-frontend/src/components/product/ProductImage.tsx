'use client'

import Image, { ImageProps } from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Image produit avec filet de securite : si l'URL distante casse (404, service
 * mort, image supprimee), on bascule sur /placeholder.svg local -> jamais de
 * texte alternatif affiche brut a la place de l'image.
 */
export default function ProductImage({ className, alt, fill, ...props }: ImageProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      // Fallback en <img> simple (pas next/image) : aucune config SVG requise.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/placeholder.svg"
        alt={typeof alt === 'string' ? alt : ''}
        className={cn('bg-surface object-contain', fill ? 'absolute inset-0 h-full w-full' : '', className)}
      />
    )
  }

  return <Image {...props} alt={alt} fill={fill} className={className} onError={() => setFailed(true)} />
}
