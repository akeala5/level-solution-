'use client'
import { useQuery } from '@tanstack/react-query'
import { Crown, ShieldCheck, Store, Wallet, Megaphone, Zap, Award, Shield, Tag, Gift, Truck, Sparkles } from 'lucide-react'
import api from '@/lib/api'

export interface HeroSlide {
  part1: string; highlight: string; part2: string; subtitle: string
  part1En?: string; highlightEn?: string; part2En?: string; subtitleEn?: string
}
export interface HousePromo { icon: string; title: string; desc: string; cta: string; href: string }
export interface HeroConfigData { slides: HeroSlide[]; housePromos: HousePromo[]; slideMs: number; rotateMs: number }

// Résolution nom d'icône (stocké en base) → composant lucide. Défaut : Sparkles.
export const HERO_ICONS: Record<string, any> = {
  Crown, ShieldCheck, Store, Wallet, Megaphone, Zap, Award, Shield, Tag, Gift, Truck, Sparkles,
}
export const heroIcon = (name?: string) => HERO_ICONS[name || ''] || Sparkles

// Config du hero (accroche, encarts, timings). L'API renvoie toujours des DÉFAUTS
// (= contenu actuel) si l'admin n'a rien personnalisé → jamais vide.
export function useHeroConfig() {
  return useQuery({
    queryKey: ['hero-config'],
    queryFn: () => api.get('/hero-config').then((r) => r.data.data as HeroConfigData),
    staleTime: 10 * 60 * 1000,
  })
}
