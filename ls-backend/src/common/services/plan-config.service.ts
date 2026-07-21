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
 * Remplace les maps PLAN_LIMITS / PLAN_PRICES / getPlanCommission jadis codées
 * en dur et dupliquées (front↔back divergeaient → bug de facturation ×250).
 *
 * PAS DE CACHE MÉMOIRE : volontaire. En cluster PM2 (2 workers), un cache
 * par-worker rendrait une édition admin incohérente entre workers jusqu'au TTL.
 * La table fait 6 lignes et n'est lue que sur des chemins peu fréquents
 * (création d'annonce, checkout, page tarifs, vue abonnement) → une lecture DB
 * directe est négligeable ET garantit que toute édition admin est visible
 * instantanément sur TOUS les workers. invalidate() est conservé (no-op) pour
 * la compatibilité des appelants.
 */
@Injectable()
export class PlanConfigService {
  constructor(private prisma: PrismaService) {}

  private async loadAll(): Promise<Map<string, PlanConfig>> {
    try {
      const rows = await this.prisma.subscriptionPlanConfig.findMany();
      if (rows.length > 0) {
        const map = new Map<string, PlanConfig>();
        for (const r of rows) map.set(r.plan, r as unknown as PlanConfig);
        return map;
      }
    } catch {
      // DB indisponible : fallback minimal.
    }
    return new Map([['FREE', FALLBACK_FREE]]);
  }

  async getConfig(plan: string): Promise<PlanConfig> {
    const map = await this.loadAll();
    return map.get(plan) ?? map.get('FREE') ?? FALLBACK_FREE;
  }

  async getActivePlans(): Promise<PlanConfig[]> {
    const map = await this.loadAll();
    return [...map.values()]
      .filter((p) => p.isActive)
      .sort((a, b) => a.monthlyPrice - b.monthlyPrice);
  }

  // Conservé pour compat (plus de cache à vider) — la table est lue à chaque appel.
  invalidate(): void {
    /* no-op : lecture DB directe, aucune incohérence cluster possible */
  }
}
