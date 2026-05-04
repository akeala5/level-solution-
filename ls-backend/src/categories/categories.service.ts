import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { generateSlug } from '../common/utils/slug.util';

const CATEGORIES_CACHE_KEY = 'categories:all';
const CATEGORIES_TTL = 3600; // 1h

@Injectable()
export class CategoriesService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findAll() {
    const cached = await this.cacheManager.get(CATEGORIES_CACHE_KEY);
    if (cached) return { message: 'Catégories récupérées', data: cached };

    const categories = await this.prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { order: 'asc' },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
          include: {
            _count: { select: { products: { where: { status: 'ACTIVE' } } } },
          },
        },
        _count: { select: { products: { where: { status: 'ACTIVE' } } } },
      },
    });

    await this.cacheManager.set(CATEGORIES_CACHE_KEY, categories, CATEGORIES_TTL);
    return { message: 'Catégories récupérées', data: categories };
  }

  async findOne(slug: string) {
    const cached = await this.cacheManager.get(`category:${slug}`);
    if (cached) return { message: 'Catégorie récupérée', data: cached };

    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        children: { where: { isActive: true }, orderBy: { order: 'asc' } },
        _count: { select: { products: { where: { status: 'ACTIVE' } } } },
      },
    });
    if (!category) throw new NotFoundException('Catégorie introuvable');

    await this.cacheManager.set(`category:${slug}`, category, CATEGORIES_TTL);
    return { message: 'Catégorie récupérée', data: category };
  }

  async create(data: {
    name: string; nameEn: string; description?: string;
    parentId?: string; iconUrl?: string; imageUrl?: string; order?: number;
  }) {
    const slug = generateSlug(data.name, false);
    const category = await this.prisma.category.create({
      data: { ...data, slug },
    });
    await this.cacheManager.del(CATEGORIES_CACHE_KEY);
    return { message: 'Catégorie créée', data: category };
  }

  async update(id: string, data: Partial<{ name: string; nameEn: string; description: string; isActive: boolean; order: number }>) {
    const category = await this.prisma.category.update({
      where: { id },
      data,
    });
    await this.cacheManager.del(CATEGORIES_CACHE_KEY);
    return { message: 'Catégorie mise à jour', data: category };
  }

  async seedDefaultCategories() {
    const categories = [
      { name: 'Ordinateurs', nameEn: 'Computers', slug: 'ordinateurs', order: 1, children: [
        { name: 'Portables', nameEn: 'Laptops', slug: 'portables', order: 1 },
        { name: 'Fixes & Tour', nameEn: 'Desktops', slug: 'fixes-tour', order: 2 },
        { name: 'Tout-en-un', nameEn: 'All-in-one', slug: 'tout-en-un', order: 3 },
        { name: 'Gaming', nameEn: 'Gaming PCs', slug: 'gaming-pcs', order: 4 },
        { name: 'Workstations', nameEn: 'Workstations', slug: 'workstations', order: 5 },
      ]},
      { name: 'Composants', nameEn: 'Components', slug: 'composants', order: 2, children: [
        { name: 'Processeurs', nameEn: 'Processors', slug: 'processeurs', order: 1 },
        { name: 'Cartes mères', nameEn: 'Motherboards', slug: 'cartes-meres', order: 2 },
        { name: 'RAM', nameEn: 'RAM', slug: 'ram', order: 3 },
        { name: 'Disques SSD/HDD', nameEn: 'Storage', slug: 'stockage', order: 4 },
        { name: 'Cartes graphiques', nameEn: 'GPUs', slug: 'cartes-graphiques', order: 5 },
        { name: 'Alimentations', nameEn: 'PSUs', slug: 'alimentations', order: 6 },
      ]},
      { name: 'Réseau & Serveurs', nameEn: 'Network & Servers', slug: 'reseau-serveurs', order: 3, children: [
        { name: 'Routeurs & Box', nameEn: 'Routers', slug: 'routeurs', order: 1 },
        { name: 'Switches', nameEn: 'Switches', slug: 'switches', order: 2 },
        { name: 'NAS', nameEn: 'NAS', slug: 'nas', order: 3 },
        { name: 'Câbles réseau', nameEn: 'Network cables', slug: 'cables-reseau', order: 4 },
      ]},
      { name: 'Périphériques', nameEn: 'Peripherals', slug: 'peripheriques', order: 4, children: [
        { name: 'Écrans', nameEn: 'Monitors', slug: 'ecrans', order: 1 },
        { name: 'Claviers & Souris', nameEn: 'Keyboards & Mice', slug: 'claviers-souris', order: 2 },
        { name: 'Webcams', nameEn: 'Webcams', slug: 'webcams', order: 3 },
        { name: 'Casques audio', nameEn: 'Headsets', slug: 'casques-audio', order: 4 },
        { name: 'Imprimantes', nameEn: 'Printers', slug: 'imprimantes', order: 5 },
      ]},
      { name: 'Accessoires', nameEn: 'Accessories', slug: 'accessoires', order: 5, children: [
        { name: 'Sacs & Housses', nameEn: 'Bags & Cases', slug: 'sacs-housses', order: 1 },
        { name: 'Câbles & Adaptateurs', nameEn: 'Cables', slug: 'cables-adaptateurs', order: 2 },
        { name: 'Onduleurs UPS', nameEn: 'UPS', slug: 'onduleurs-ups', order: 3 },
        { name: 'Refroidissement', nameEn: 'Cooling', slug: 'refroidissement', order: 4 },
      ]},
      { name: 'Mobiles & Tablettes', nameEn: 'Mobile & Tablets', slug: 'mobiles-tablettes', order: 6 },
      { name: 'Logiciels & Licences', nameEn: 'Software & Licenses', slug: 'logiciels-licences', order: 7 },
      { name: 'Reconditionné LS', nameEn: 'LS Refurbished', slug: 'reconditionne-ls', order: 8 },
    ];

    for (const cat of categories) {
      const { children, ...catData } = cat as any;
      const parent = await this.prisma.category.upsert({
        where: { slug: catData.slug },
        update: {},
        create: { ...catData, nameEn: catData.nameEn },
      });

      if (children) {
        for (const child of children) {
          await this.prisma.category.upsert({
            where: { slug: child.slug },
            update: {},
            create: { ...child, parentId: parent.id },
          });
        }
      }
    }

    return { message: 'Catégories par défaut créées' };
  }
}
