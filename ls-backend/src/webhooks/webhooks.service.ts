import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { promises as dns } from 'dns';
import * as net from 'net';
import { PrismaService } from '../prisma/prisma.service';

const ALLOWED_EVENTS = [
  'order.created',
  'order.paid',
  'order.shipped',
  'order.delivered',
  'order.completed',
  'order.cancelled',
];

@Injectable()
export class WebhooksService {
  constructor(private prisma: PrismaService) {}

  // ─── API KEYS ─────────────────────────────────────────────────────────────────

  async createApiKey(userId: string, name: string) {
    const raw = `lsk_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(raw).digest('hex');
    const keyPrefix = raw.slice(0, 12);

    const key = await this.prisma.apiKey.create({
      data: { userId, name, keyHash, keyPrefix },
    });

    return { id: key.id, name: key.name, key: raw, keyPrefix, createdAt: key.createdAt };
  }

  async listApiKeys(userId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { userId },
      select: { id: true, name: true, keyPrefix: true, isActive: true, lastUsedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return keys;
  }

  async revokeApiKey(keyId: string, userId: string) {
    const key = await this.prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!key) throw new NotFoundException('Clé introuvable');
    if (key.userId !== userId) throw new ForbiddenException('Non autorisé');

    await this.prisma.apiKey.update({ where: { id: keyId }, data: { isActive: false } });
    return { message: 'Clé révoquée' };
  }

  async validateApiKey(rawKey: string): Promise<{ userId: string } | null> {
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const key = await this.prisma.apiKey.findUnique({ where: { keyHash } });
    if (!key || !key.isActive) return null;

    await this.prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
    return { userId: key.userId };
  }

  // ─── WEBHOOK ENDPOINTS ────────────────────────────────────────────────────────

  async createEndpoint(userId: string, dto: { url: string; events: string[] }) {
    await this.assertSafeWebhookUrl(dto.url);
    const invalid = dto.events.filter((e) => !ALLOWED_EVENTS.includes(e));
    if (invalid.length) {
      throw new BadRequestException(`Événements invalides : ${invalid.join(', ')}`);
    }

    const count = await this.prisma.webhookEndpoint.count({ where: { userId } });
    if (count >= 5) throw new BadRequestException('Maximum 5 endpoints par compte');

    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;
    const endpoint = await this.prisma.webhookEndpoint.create({
      data: { userId, url: dto.url, events: dto.events, secret },
    });

    return endpoint;
  }

  async listEndpoints(userId: string) {
    return this.prisma.webhookEndpoint.findMany({
      where: { userId },
      select: {
        id: true, url: true, events: true, secret: true,
        isActive: true, failureCount: true, createdAt: true,
        _count: { select: { deliveries: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateEndpoint(endpointId: string, userId: string, dto: { url?: string; events?: string[]; isActive?: boolean }) {
    const ep = await this.prisma.webhookEndpoint.findUnique({ where: { id: endpointId } });
    if (!ep) throw new NotFoundException('Endpoint introuvable');
    if (ep.userId !== userId) throw new ForbiddenException('Non autorisé');

    if (dto.url) await this.assertSafeWebhookUrl(dto.url);
    if (dto.events) {
      const invalid = dto.events.filter((e) => !ALLOWED_EVENTS.includes(e));
      if (invalid.length) throw new BadRequestException(`Événements invalides : ${invalid.join(', ')}`);
    }

    return this.prisma.webhookEndpoint.update({
      where: { id: endpointId },
      data: { ...dto, failureCount: dto.isActive ? 0 : undefined },
    });
  }

  async deleteEndpoint(endpointId: string, userId: string) {
    const ep = await this.prisma.webhookEndpoint.findUnique({ where: { id: endpointId } });
    if (!ep) throw new NotFoundException('Endpoint introuvable');
    if (ep.userId !== userId) throw new ForbiddenException('Non autorisé');

    await this.prisma.webhookEndpoint.delete({ where: { id: endpointId } });
    return { message: 'Endpoint supprimé' };
  }

  async getDeliveries(endpointId: string, userId: string, page = 1, limit = 20) {
    const ep = await this.prisma.webhookEndpoint.findUnique({ where: { id: endpointId } });
    if (!ep) throw new NotFoundException('Endpoint introuvable');
    if (ep.userId !== userId) throw new ForbiddenException('Non autorisé');

    const skip = (page - 1) * limit;
    const [deliveries, total] = await Promise.all([
      this.prisma.webhookDelivery.findMany({
        where: { endpointId },
        orderBy: { attemptedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.webhookDelivery.count({ where: { endpointId } }),
    ]);

    return { data: deliveries, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  // ─── DISPATCH ─────────────────────────────────────────────────────────────────

  async dispatch(sellerId: string, event: string, payload: Record<string, any>) {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: { userId: sellerId, isActive: true, events: { has: event } },
    });

    if (!endpoints.length) return;

    await Promise.allSettled(
      endpoints.map((ep) => this.deliverToEndpoint(ep, event, payload)),
    );
  }

  private async deliverToEndpoint(
    ep: { id: string; url: string; secret: string },
    event: string,
    payload: Record<string, any>,
  ) {
    const body = JSON.stringify({ event, data: payload, deliveredAt: new Date().toISOString() });
    const sig = crypto.createHmac('sha256', ep.secret).update(body).digest('hex');

    let statusCode: number | null = null;
    let response: string | null = null;
    let success = false;

    try {
      // Anti-SSRF : revalider l'URL a la livraison (le DNS a pu changer) et ne
      // jamais suivre de redirection vers l'interne.
      await this.assertSafeWebhookUrl(ep.url);
      const res = await fetch(ep.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-LS-Signature': `sha256=${sig}`,
          'X-LS-Event': event,
        },
        body,
        redirect: 'manual',
        signal: AbortSignal.timeout(10_000),
      });
      statusCode = res.status;
      response = await res.text().then((t) => t.slice(0, 500)).catch(() => null);
      success = res.ok;
    } catch (err: any) {
      response = err?.message?.slice(0, 200) || 'timeout';
    }

    await this.prisma.$transaction([
      this.prisma.webhookDelivery.create({
        data: { endpointId: ep.id, event, payload, statusCode, response, success },
      }),
      ...(success
        ? [this.prisma.webhookEndpoint.update({ where: { id: ep.id }, data: { failureCount: 0 } })]
        : [this.prisma.webhookEndpoint.update({ where: { id: ep.id }, data: { failureCount: { increment: 1 } } })]),
    ]);

    if (!success) {
      const ep2 = await this.prisma.webhookEndpoint.findUnique({ where: { id: ep.id } });
      if (ep2 && ep2.failureCount >= 10) {
        await this.prisma.webhookEndpoint.update({ where: { id: ep.id }, data: { isActive: false } });
      }
    }
  }

  // ─── TEST EVENT ───────────────────────────────────────────────────────────────

  // --- ANTI-SSRF (validation des URL de webhook, AUD-001) ---

  private isDisallowedIp(ip: string): boolean {
    if (net.isIPv4(ip)) {
      const p = ip.split('.').map(Number);
      if (p[0] === 0) return true;                        // 0.0.0.0/8
      if (p[0] === 10) return true;                       // 10/8 prive
      if (p[0] === 127) return true;                      // loopback
      if (p[0] === 169 && p[1] === 254) return true;      // link-local + metadonnees cloud
      if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true; // 172.16/12
      if (p[0] === 192 && p[1] === 168) return true;      // 192.168/16
      if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true; // CGNAT 100.64/10
      if (p[0] >= 224) return true;                       // multicast/reserve
      return false;
    }
    if (net.isIPv6(ip)) {
      const a = ip.toLowerCase();
      if (a === '::1' || a === '::') return true;          // loopback / unspecified
      if (a.startsWith('fe80')) return true;              // link-local
      if (a.startsWith('fc') || a.startsWith('fd')) return true; // ULA fc00::/7
      const m = a.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/); // IPv4-mapped
      if (m) return this.isDisallowedIp(m[1]);
      return false;
    }
    return true; // format inconnu -> refus
  }

  // Rejette toute URL non-HTTPS, non-443, avec identifiants, ou resolvant vers une
  // IP interne (privee/loopback/link-local/metadonnees).
  private async assertSafeWebhookUrl(rawUrl: string): Promise<void> {
    let u: URL;
    try { u = new URL(rawUrl); } catch { throw new BadRequestException('URL invalide'); }
    if (u.protocol !== 'https:') throw new BadRequestException('L URL doit etre en HTTPS');
    if (u.port && u.port !== '443') throw new BadRequestException('Port non autorise (443 uniquement)');
    if (u.username || u.password) throw new BadRequestException('URL avec identifiants interdite');

    const host = u.hostname.replace(/^\[|\]$/g, '');
    let ips: string[];
    if (net.isIP(host)) {
      ips = [host];
    } else {
      if (host.toLowerCase() === 'localhost') throw new BadRequestException('Hote non autorise');
      try {
        ips = (await dns.lookup(host, { all: true })).map((r) => r.address);
      } catch {
        throw new BadRequestException('Hote introuvable (DNS)');
      }
    }
    if (!ips.length) throw new BadRequestException('Hote introuvable');
    for (const ip of ips) {
      if (this.isDisallowedIp(ip)) {
        throw new BadRequestException('URL pointant vers une adresse interne non autorisee');
      }
    }
  }

  async sendTestEvent(endpointId: string, userId: string) {
    const ep = await this.prisma.webhookEndpoint.findUnique({ where: { id: endpointId } });
    if (!ep) throw new NotFoundException('Endpoint introuvable');
    if (ep.userId !== userId) throw new ForbiddenException('Non autorisé');

    await this.deliverToEndpoint(ep, 'test.ping', {
      message: 'Ceci est un événement de test LS Marketplace',
      timestamp: new Date().toISOString(),
    });

    return { message: 'Événement test envoyé' };
  }

  // ─── ÉVÉNEMENTS DISPONIBLES ───────────────────────────────────────────────────

  getAvailableEvents() {
    return {
      events: ALLOWED_EVENTS.map((e) => ({
        name: e,
        description: {
          'order.created': 'Nouvelle commande reçue',
          'order.paid': 'Paiement confirmé',
          'order.shipped': 'Commande expédiée',
          'order.delivered': 'Commande livrée',
          'order.completed': 'Commande finalisée (escrow libéré)',
          'order.cancelled': 'Commande annulée',
        }[e],
      })),
    };
  }
}
