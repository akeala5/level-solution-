import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { createClient } from 'redis';

// Storage Redis pour @nestjs/throttler : compteurs PARTAGES entre les workers du
// cluster PM2 et persistants aux reloads (AUD-002 : sinon compteurs en memoire par
// worker => limite anti-bruteforce ~2x trop laxiste + remise a zero a chaque reload).
// Atomique via Lua (INCR + PEXPIRE au 1er hit + PTTL). Fail-open : si Redis est
// indisponible on n'ecroule pas l'API, on degrade au comportement historique.
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage, OnModuleDestroy {
  private readonly logger = new Logger('RedisThrottlerStorage');
  private client: ReturnType<typeof createClient>;

  private static readonly SCRIPT =
    "local c = redis.call('INCR', KEYS[1]) " +
    "if c == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end " +
    "return {c, redis.call('PTTL', KEYS[1])}";

  constructor(opts: { host: string; port: number; password?: string }) {
    this.client = createClient({
      socket: { host: opts.host, port: opts.port, reconnectStrategy: (r) => Math.min(r * 200, 3000) },
      password: opts.password,
    });
    this.client.on('error', (e: any) => this.logger.warn(`Redis throttler indisponible: ${e?.message}`));
    this.client.connect().catch((e: any) => this.logger.warn(`connexion Redis throttler differee: ${e?.message}`));
  }

  async increment(key: string, ttl: number): Promise<{ totalHits: number; timeToExpire: number }> {
    const k = `throttle:${key}`;
    try {
      const res = (await this.client.eval(RedisThrottlerStorage.SCRIPT, {
        keys: [k],
        arguments: [String(ttl)],
      })) as [number, number];
      const totalHits = Number(res[0]);
      const pttl = Number(res[1]);
      const timeToExpire = Math.ceil((pttl > 0 ? pttl : ttl) / 1000);
      return { totalHits, timeToExpire };
    } catch (e: any) {
      // Fail-open : ne jamais bloquer l'API si Redis tombe.
      this.logger.warn(`increment fail-open (${e?.message})`);
      return { totalHits: 1, timeToExpire: Math.ceil(ttl / 1000) };
    }
  }

  async onModuleDestroy() {
    try { if (this.client.isOpen) await this.client.quit(); } catch { /* noop */ }
  }
}
