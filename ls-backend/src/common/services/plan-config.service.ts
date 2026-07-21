import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface PlanConfig {
  plan: string;
  name: string;
  nameEn: string;
  maxProducts: number;
  monthlyPrice: number;
  yearlyPrice: number;
  hasStats: boolean;
  hasShopPage: boolean;
  hasBadge: boolean;
  sponsoredAdsPerMonth: number;
  commission: number;
  features: string[];
  isActive: boolean;
}

// Repli de survie si la table est vide/inaccessible (le service ne doit JAMAIS
// planter une création d'annonce ou un checkout). FREE = accès de base garanti.
const FALLBACK_FREE: PlanConfig = {
  plan: 'FREE', name: 'Gratuit', nameEn: 'Free',
  maxProducts: 10, monthlyPrice: 0, yearlyPrice: 0,
  hasStats: false, hasShopPage: false, hasBadge: false,
  sponsoredAdsPerMonth: 0, commission: 0.05, features: [], isActive: true,
};

/**
 * SOURCE DE VÉRITÉ UNIQUE des forfaits (table subscription_plan_configs).
 * Remplace les maps PLAN_LIMITS / PLAN_PRICES / getPlanCommission jadis
 * codées en dur et dupliquées (front↔back divergeaient → bug de facturation).
 * Cache mémoire TTL 60 s (config lue sur le chemin chaud création d'annonce) ;
 * invalidate() est appelé par l'admin après une écriture (Lot 1).
 */
@Injectable()
export class PlanConfigService {
  private cache: Map<string, PlanConfig> | null = null;
  private cachedAt = 0;
  private readonly TTL_MS = 60_000;

  constructor(private prisma: PrismaService) {}

  private async load(): Promise<Map<string, PlanConfig>> {
    if (this.cache && Date.now() - this.cachedAt < this.TTL_MS) return this.cache;
    try {
      const rows = await this.prisma.subscriptionPlanConfig.findMany();
      if (rows.length > 0) {
        const map = new Map<string, PlanConfig>();
        for (const r of rows) map.set(r.plan, r as unknown as PlanConfig);
        this.cache = map;
        this.cachedAt = Date.now();
        return map;
      }
    } catch {
      // DB indisponible : on retombe sur le cache existant ou le fallback.
    }
    return this.cache ?? new Map([['FREE', FALLBACK_FREE]]);
  }

  async getConfig(plan: string): Promise<PlanConfig> {
    const map = await this.load();
    return map.get(plan) ?? map.get('FREE') ?? FALLBACK_FREE;
  }

  async getActivePlans(): Promise<PlanConfig[]> {
    const map = await this.load();
    return [...map.values()]
      .filter((p) => p.isActive)
      .sort((a, b) => a.monthlyPrice - b.monthlyPrice);
  }

  invalidate(): void {
    this.cache = null;
    this.cachedAt = 0;
  }
}
