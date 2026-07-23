import { BadRequestException } from '@nestjs/common';
import { UploadService } from './upload.service';

describe('UploadService durcissement (AUD-003)', () => {
  const svc = new UploadService({ get: () => undefined } as any);

  it('rejette un buffer non-image (octets magiques)', async () => {
    await expect(
      svc.uploadImage({ buffer: Buffer.from('<html>hack</html>'), size: 17, mimetype: 'image/png' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('presign rejette une extension non-image', async () => {
    await expect(svc.getPresignedUrl('products', 'evil.html')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('presign rejette une extension executable meme avec traversee de dossier', async () => {
    await expect(svc.getPresignedUrl('../secret', 'x.exe')).rejects.toBeInstanceOf(BadRequestException);
  });
});
