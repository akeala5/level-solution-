import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import MeiliSearch from 'meilisearch';

const PRODUCTS_INDEX = 'products';

export interface ProductDocument {
  id: string;
  title: string;
  description: string;
  brand?: string;
  model?: string;
  categoryId: string;
  categoryName: string;
  condition: string;
  country: string;
  city?: string;
  price: number;
  hasDelivery: boolean;
  isReconditioned: boolean;
  status: string;
  sellerId: string;
  tags: string[];
  viewCount: number;
  createdAt: number; // timestamp pour tri
}

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private client: MeiliSearch;
  private enabled = false;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('meilisearch.host');
    const apiKey = this.config.get<string>('meilisearch.apiKey');

    if (host) {
      this.client = new MeiliSearch({ host, apiKey });
      this.enabled = true;
    }
  }

  // Sonde de santé pour /health : 'disabled' si non configuré, sinon 'up'/'down'.
  async ping(): Promise<'up' | 'down' | 'disabled'> {
    if (!this.enabled || !this.client) return 'disabled';
    try {
      await this.client.health();
      return 'up';
    } catch {
      return 'down';
    }
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.warn('Meilisearch désactivé — MEILISEARCH_HOST non défini');
      return;
    }

    try {
      // Créer l'index s'il n'existe pas
      await this.client.createIndex(PRODUCTS_INDEX, { primaryKey: 'id' });

      const index = this.client.index(PRODUCTS_INDEX);

      // Attributs sur lesquels la recherche textuelle s'applique
      await index.updateSearchableAttributes([
        'title', 'description', 'brand', 'model', 'categoryName', 'tags',
      ]);

      // Attributs utilisables comme filtres Meilisearch
      await index.updateFilterableAttributes([
        'status', 'categoryId', 'condition', 'country', 'city',
        'hasDelivery', 'isReconditioned', 'sellerId', 'price',
      ]);

      // Attributs utilisables pour le tri
      await index.updateSortableAttributes([
        'price', 'createdAt', 'viewCount',
      ]);

      // Tolérance aux fautes de frappe
      await index.updateTypoTolerance({
        enabled: true,
        minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 },
      });

      this.logger.log('Meilisearch initialisé — index "products" configuré');
    } catch (err) {
      this.logger.error('Erreur init Meilisearch', err?.message);
    }
  }

  // ─── INDEXATION ───────────────────────────────────────────────────────────────

  async indexProduct(product: any) {
    if (!this.enabled) return;
    try {
      const doc: ProductDocument = {
        id: product.id,
        title: product.title,
        description: product.description || '',
        brand: product.brand,
        model: product.model,
        categoryId: product.categoryId,
        categoryName: product.category?.name || '',
        condition: product.condition,
        country: product.country,
        city: product.city,
        price: product.price,
        hasDelivery: product.hasDelivery,
        isReconditioned: product.isReconditioned,
        status: product.status,
        sellerId: product.sellerId,
        tags: product.tags?.map((t: any) => t.tag || t) || [],
        viewCount: product.viewCount || 0,
        createdAt: new Date(product.createdAt || Date.now()).getTime(),
      };

      await this.client.index(PRODUCTS_INDEX).addDocuments([doc]);
    } catch (err) {
      this.logger.error(`Erreur indexation produit ${product.id}`, err?.message);
    }
  }

  async deleteProduct(productId: string) {
    if (!this.enabled) return;
    try {
      await this.client.index(PRODUCTS_INDEX).deleteDocument(productId);
    } catch (err) {
      this.logger.error(`Erreur suppression index produit ${productId}`, err?.message);
    }
  }

  // ─── RECHERCHE ────────────────────────────────────────────────────────────────

  async search(
    query: string,
    options: {
      categoryId?: string;
      condition?: string;
      country?: string;
      city?: string;
      minPrice?: number;
      maxPrice?: number;
      hasDelivery?: boolean;
      isReconditioned?: boolean;
      sellerId?: string;
      sortBy?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ ids: string[]; total: number }> {
    if (!this.enabled) return { ids: [], total: 0 };

    const { page = 1, limit = 20, sortBy, ...filters } = options;

    // Construction du filtre Meilisearch
    const filterParts: string[] = ['status = "ACTIVE"'];

    if (filters.categoryId) filterParts.push(`categoryId = "${filters.categoryId}"`);
    if (filters.condition) filterParts.push(`condition = "${filters.condition}"`);
    if (filters.country) filterParts.push(`country = "${filters.country}"`);
    if (filters.city) filterParts.push(`city = "${filters.city}"`);
    if (filters.hasDelivery !== undefined) filterParts.push(`hasDelivery = ${filters.hasDelivery}`);
    if (filters.isReconditioned !== undefined) filterParts.push(`isReconditioned = ${filters.isReconditioned}`);
    if (filters.sellerId) filterParts.push(`sellerId = "${filters.sellerId}"`);
    if (filters.minPrice !== undefined) filterParts.push(`price >= ${filters.minPrice}`);
    if (filters.maxPrice !== undefined) filterParts.push(`price <= ${filters.maxPrice}`);

    // Tri
    const sortMap: Record<string, string> = {
      price_asc: 'price:asc',
      price_desc: 'price:desc',
      popular: 'viewCount:desc',
      newest: 'createdAt:desc',
      oldest: 'createdAt:asc',
    };
    const sort = sortBy && sortMap[sortBy] ? [sortMap[sortBy]] : ['createdAt:desc'];

    try {
      const result = await this.client.index(PRODUCTS_INDEX).search(query, {
        filter: filterParts.join(' AND '),
        sort,
        limit,
        offset: (page - 1) * limit,
        attributesToRetrieve: ['id'],
      });

      return {
        ids: result.hits.map((h) => h.id as string),
        total: result.estimatedTotalHits ?? result.hits.length,
      };
    } catch (err) {
      this.logger.error('Erreur recherche Meilisearch', err?.message);
      return { ids: [], total: 0 };
    }
  }

  // ─── REINDEX BULK (migration initiale) ───────────────────────────────────────

  async bulkIndex(products: any[]) {
    if (!this.enabled || !products.length) return;
    try {
      const docs: ProductDocument[] = products.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description || '',
        brand: p.brand,
        model: p.model,
        categoryId: p.categoryId,
        categoryName: p.category?.name || '',
        condition: p.condition,
        country: p.country,
        city: p.city,
        price: p.price,
        hasDelivery: p.hasDelivery,
        isReconditioned: p.isReconditioned,
        status: p.status,
        sellerId: p.sellerId,
        tags: p.tags?.map((t: any) => t.tag || t) || [],
        viewCount: p.viewCount || 0,
        createdAt: new Date(p.createdAt || Date.now()).getTime(),
      }));

      await this.client.index(PRODUCTS_INDEX).addDocuments(docs, { primaryKey: 'id' });
      this.logger.log(`Meilisearch — ${docs.length} produits réindexés`);
    } catch (err) {
      this.logger.error('Erreur bulk index', err?.message);
    }
  }
}
