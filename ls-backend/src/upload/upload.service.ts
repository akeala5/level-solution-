import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private s3: S3Client;
  private bucket: string;
  private cdnUrl: string;

  constructor(private configService: ConfigService) {
    this.s3 = new S3Client({
      region: configService.get('s3.region') || 'auto',
      endpoint: configService.get('s3.endpoint'),
      credentials: {
        accessKeyId: configService.get('s3.accessKeyId'),
        secretAccessKey: configService.get('s3.secretAccessKey'),
      },
      forcePathStyle: true,
    });
    this.bucket = configService.get('s3.bucket');
    this.cdnUrl = configService.get('s3.cdnUrl');
  }

  async uploadImage(file: Express.Multer.File, folder = 'products'): Promise<{ url: string; thumbnailUrl: string }> {
    if (!file) throw new BadRequestException('Aucun fichier fourni');

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) throw new BadRequestException('Fichier trop volumineux (max 10MB)');

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Format non supporté (jpg, png, webp uniquement)');
    }

    const fileId = uuidv4();
    const ext = 'webp';
    const key = `${folder}/${fileId}.${ext}`;
    const thumbKey = `${folder}/${fileId}_thumb.${ext}`;

    // Optimiser l'image avec Sharp
    const [optimized, thumbnail] = await Promise.all([
      sharp(file.buffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer(),
      sharp(file.buffer)
        .resize(400, 400, { fit: 'cover' })
        .webp({ quality: 75 })
        .toBuffer(),
    ]);

    // Upload sur S3 / R2
    await Promise.all([
      this.s3.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: optimized,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000',
      })),
      this.s3.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: thumbKey,
        Body: thumbnail,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000',
      })),
    ]);

    const baseUrl = this.cdnUrl || `https://${this.bucket}.r2.dev`;
    return {
      url: `${baseUrl}/${key}`,
      thumbnailUrl: `${baseUrl}/${thumbKey}`,
    };
  }

  async uploadMultiple(files: Express.Multer.File[], folder = 'products') {
    const results = await Promise.all(files.map((f) => this.uploadImage(f, folder)));
    return { message: 'Images uploadées', data: results };
  }

  async deleteFile(url: string) {
    try {
      const baseUrl = this.cdnUrl || `https://${this.bucket}.r2.dev`;
      const key = url.replace(`${baseUrl}/`, '');
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (e) {
      // Ignore deletion errors
    }
  }

  async getPresignedUrl(folder: string, filename: string) {
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
    const key = `${folder}/${uuidv4()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const url = await getSignedUrl(this.s3, command, { expiresIn: 300 });
    const baseUrl = this.cdnUrl || `https://${this.bucket}.r2.dev`;

    return {
      message: 'URL pré-signée générée',
      data: { uploadUrl: url, fileUrl: `${baseUrl}/${key}`, key },
    };
  }
}
