import { BadRequestException } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

// AUD-001 : les URL internes/non-HTTPS doivent etre rejetees a l'enregistrement.
describe('WebhooksService anti-SSRF (AUD-001)', () => {
  const prisma: any = {
    webhookEndpoint: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({ id: 'ep1' }),
    },
  };
  const svc = new WebhooksService(prisma);
  const events = ['order.paid'];

  beforeEach(() => jest.clearAllMocks());

  const blocked = [
    'https://127.0.0.1/hook',
    'https://10.0.0.5/hook',
    'https://169.254.169.254/latest/meta-data',
    'https://192.168.1.10/hook',
    'https://172.16.0.9/hook',
    'https://[::1]/hook',
    'https://localhost/hook',
    'http://93.184.216.34/hook',
    'https://93.184.216.34:8080/hook',
    'https://user:pass@93.184.216.34/hook',
  ];

  it.each(blocked)('bloque %s', async (url) => {
    await expect(svc.createEndpoint('u1', { url, events })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.webhookEndpoint.create).not.toHaveBeenCalled();
  });

  it('autorise une URL HTTPS publique', async () => {
    await expect(svc.createEndpoint('u1', { url: 'https://93.184.216.34/hook', events })).resolves.toBeDefined();
    expect(prisma.webhookEndpoint.create).toHaveBeenCalledTimes(1);
  });
});
