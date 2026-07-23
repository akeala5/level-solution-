const evalMock = jest.fn();
jest.mock('redis', () => ({
  createClient: () => ({
    on: () => {},
    connect: () => Promise.resolve(),
    isOpen: true,
    quit: () => Promise.resolve(),
    eval: (...a: any[]) => evalMock(...a),
  }),
}));
import { RedisThrottlerStorage } from './redis-throttler.storage';

describe('RedisThrottlerStorage (AUD-002)', () => {
  const store = new RedisThrottlerStorage({ host: 'localhost', port: 6379 });
  beforeEach(() => evalMock.mockReset());

  it('compte via Redis et renvoie totalHits + timeToExpire (sec)', async () => {
    evalMock.mockResolvedValue([3, 45000]);
    const r = await store.increment('k1', 60000);
    expect(r).toEqual({ totalHits: 3, timeToExpire: 45 });
  });

  it('fail-open si Redis en erreur (ne bloque pas l API)', async () => {
    evalMock.mockRejectedValue(new Error('ECONNREFUSED'));
    const r = await store.increment('k1', 60000);
    expect(r.totalHits).toBe(1);
    expect(r.timeToExpire).toBe(60);
  });
});
