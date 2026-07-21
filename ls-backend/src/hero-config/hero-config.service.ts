import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateHeroConfigDto } from './dto/update-hero-config.dto';

// Défauts = contenu actuel codé en dur (accroche i18n + encarts maison de HeroAd).
// Servent tant que l'admin n'a rien personnalisé (colonnes null en base).
const DEFAULT_SLIDES = [
  { part1: 'Achetez & Vendez', highlight: 'tout', part2: 'en toute sécurité', subtitle: "Informatique, mode, véhicules, immobilier — des milliers d'annonces vérifiées avec paiement Mobile Money sécurisé.",
    part1En: 'Buy & Sell', highlightEn: 'everything', part2En: 'safely', subtitleEn: 'IT, fashion, vehicles, real estate — thousands of verified listings with secure Mobile Money payment.' },
  { part1: "L'informatique au", highlight: 'meilleur prix', part2: '', subtitle: 'PC, smartphones, réseau et reconditionné certifié LS — garantie 6 mois incluse.',
    part1En: 'IT gear at the', highlightEn: 'best price', part2En: '', subtitleEn: 'PCs, smartphones, networking and LS-certified refurbished — 6-month warranty included.' },
  { part1: 'La bonne affaire', highlight: 'près de chez vous', part2: '', subtitle: 'Véhicules, mode, immobilier, électroménager — des vendeurs vérifiés partout en Afrique francophone.',
    part1En: 'Great deals', highlightEn: 'near you', part2En: '', subtitleEn: 'Vehicles, fashion, real estate, appliances — verified sellers across francophone Africa.' },
  { part1: 'Vendez en', highlight: 'quelques minutes', part2: '', subtitle: 'Déposez votre annonce gratuitement, recevez vos paiements Mobile Money sécurisés par séquestre.',
    part1En: 'Sell in', highlightEn: 'minutes', part2En: '', subtitleEn: 'List for free and get paid via Mobile Money, secured by escrow.' },
];

const DEFAULT_HOUSE = [
  { icon: 'Crown', title: 'Devenez vendeur Premium', desc: 'Boutique pro, badge vérifié et annonces sponsorisées pour booster vos ventes.', cta: 'Voir les forfaits', href: '/pricing' },
  { icon: 'ShieldCheck', title: 'Reconditionné LS garanti', desc: '40 points de contrôle, garantie 6 mois incluse. Achetez l’esprit tranquille.', cta: 'Découvrir', href: '/products?isReconditioned=true' },
  { icon: 'Store', title: 'Vendez gratuitement', desc: 'Déposez votre annonce en 2 minutes et touchez des milliers d’acheteurs.', cta: 'Déposer une annonce', href: '/products/create' },
  { icon: 'Wallet', title: 'Paiement Mobile Money', desc: 'Transactions sécurisées par séquestre : vous êtes payé, l’acheteur est protégé.', cta: 'Comment ça marche', href: '/how-it-works' },
];

@Injectable()
export class HeroConfigService {
  constructor(private prisma: PrismaService) {}

  // Lecture publique (consommée par HeroSection/HeroAd/SponsoredBanner).
  async getConfig() {
    const row = await this.prisma.heroConfig.findUnique({ where: { id: 'default' } });
    return {
      slides: (row?.slides as any) ?? DEFAULT_SLIDES,
      housePromos: (row?.housePromos as any) ?? DEFAULT_HOUSE,
      slideMs: row?.slideMs ?? 7000,
      rotateMs: row?.rotateMs ?? 6500,
    };
  }

  // Écriture admin (upsert du singleton). Pas de cache → cohérent en cluster.
  async update(dto: UpdateHeroConfigDto) {
    const data: any = {};
    if (dto.slides !== undefined) data.slides = dto.slides;
    if (dto.housePromos !== undefined) data.housePromos = dto.housePromos;
    if (dto.slideMs !== undefined) data.slideMs = dto.slideMs;
    if (dto.rotateMs !== undefined) data.rotateMs = dto.rotateMs;

    await this.prisma.heroConfig.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...data },
      update: data,
    });
    return { message: 'Hero mis à jour', data: await this.getConfig() };
  }
}
