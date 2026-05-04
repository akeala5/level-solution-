import { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ls-marketplace.com'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/products`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/categories`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/auth/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/auth/register`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ]

  // Pages produits dynamiques
  const productsData = await fetchJson<{ data: { slug: string; updatedAt: string }[] }>(
    `${API_URL}/products?limit=200&status=ACTIVE`,
  )
  const productPages: MetadataRoute.Sitemap = (productsData?.data ?? []).map((p) => ({
    url: `${BASE_URL}/products/${p.slug}`,
    lastModified: new Date(p.updatedAt),
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  // Pages catégories dynamiques
  const categoriesData = await fetchJson<{ data: { slug: string; updatedAt: string }[] }>(
    `${API_URL}/categories`,
  )
  const categoryPages: MetadataRoute.Sitemap = (categoriesData?.data ?? []).map((c) => ({
    url: `${BASE_URL}/categories/${c.slug}`,
    lastModified: new Date(c.updatedAt),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  return [...staticPages, ...productPages, ...categoryPages]
}
