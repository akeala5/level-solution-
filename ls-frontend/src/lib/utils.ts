import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amount: number, currency = 'XOF'): string {
  return new Intl.NumberFormat('fr-TG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

export function timeAgo(date: string | Date): string {
  const now = new Date()
  const d = new Date(date)
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'À l\'instant'
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`
  if (diff < 2592000) return `Il y a ${Math.floor(diff / 86400)}j`
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n) + '...' : str
}

export function getConditionLabel(condition: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    NEW: { label: 'Neuf', color: 'success' },
    VERY_GOOD: { label: 'Très bon état', color: 'primary' },
    GOOD: { label: 'Bon état', color: 'warning' },
    FAIR: { label: 'État correct', color: 'accent' },
    FOR_PARTS: { label: 'Pour pièces', color: 'danger' },
  }
  return map[condition] || { label: condition, color: 'gray' }
}

export function getStatusLabel(status: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'En attente', color: 'warning' },
    PAYMENT_CONFIRMED: { label: 'Payé', color: 'success' },
    PROCESSING: { label: 'En préparation', color: 'primary' },
    SHIPPED: { label: 'Expédié', color: 'primary' },
    DELIVERED: { label: 'Livré', color: 'success' },
    COMPLETED: { label: 'Terminé', color: 'success' },
    CANCELLED: { label: 'Annulé', color: 'danger' },
    REFUNDED: { label: 'Remboursé', color: 'accent' },
    DISPUTED: { label: 'Litige', color: 'danger' },
  }
  return map[status] || { label: status, color: 'gray' }
}

export function getPlanColor(plan: string): string {
  const map: Record<string, string> = {
    FREE: 'bg-gray-100 text-gray-600',
    BASIC: 'bg-blue-100 text-blue-700',
    ESSENTIAL: 'bg-green-100 text-green-700',
    PREMIUM: 'bg-purple-100 text-purple-700',
    PRO: 'bg-accent-100 text-accent-700',
    BUSINESS: 'bg-primary-100 text-primary-700',
  }
  return map[plan] || 'bg-gray-100 text-gray-600'
}

export function initials(firstName: string, lastName: string): string {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
}
