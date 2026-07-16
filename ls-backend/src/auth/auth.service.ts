import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { RegisterDto } from './dto/register.dto';
import { LoginDto, ForgotPasswordDto, ResetPasswordDto, Enable2FADto } from './dto/login.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private notificationsService: NotificationsService,
  ) {}

  // ─── INSCRIPTION ────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email.toLowerCase() },
          ...(dto.phone ? [{ phone: dto.phone }] : []),
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException(
        existingUser.email === dto.email.toLowerCase()
          ? 'Un compte avec cet email existe déjà'
          : 'Un compte avec ce numéro existe déjà',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const referralCode = uuidv4().split('-')[0].toUpperCase();

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          phone: dto.phone || null,
          firstName: dto.firstName,
          lastName: dto.lastName,
          passwordHash,
          // Defense en profondeur : ne jamais assigner un role privilegie depuis
          // l'inscription, meme si le DTO est contourne. Seul SELLER est opt-in ; tout
          // le reste (ADMIN, MODERATOR, valeur inconnue) retombe sur BUYER.
          role: dto.role === 'SELLER' ? 'SELLER' : 'BUYER',
          profile: { create: {} },
          subscription: { create: { plan: 'FREE' } },
          loyaltyAccount: { create: {} },
        },
      });

      // Gérer le parrainage
      if (dto.referralCode) {
        const referral = await tx.referral.findFirst({
          where: { code: dto.referralCode, isConverted: false },
        });
        if (referral) {
          await tx.referral.update({
            where: { id: referral.id },
            data: { inviteeId: newUser.id, isConverted: true },
          });
        }
      }

      // Créer le code de parrainage de ce nouvel utilisateur
      await tx.referral.create({
        data: {
          inviterId: newUser.id,
          inviteeId: newUser.id,
          code: referralCode,
        },
      }).catch(() => {}); // Ignore si conflit

      return newUser;
    });

    // Envoyer email de vérification
    await this.sendEmailVerification(user.id, user.email, user.firstName);

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // tokens : champ frère consommé UNIQUEMENT par le controller (pose des cookies
    // httpOnly). Jamais renvoyé dans le corps HTTP (cf. auth.controller).
    return {
      message: 'Compte créé avec succès. Vérifiez votre email.',
      data: {
        user: this.sanitizeUser(user),
      },
      tokens,
    };
  }

  // ─── CONNEXION ──────────────────────────────────────────────────────────────

  async login(dto: LoginDto, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        subscription: { select: { plan: true } },
      },
    });

    if (!user) throw new UnauthorizedException('Email ou mot de passe incorrect');
    if (user.isSuspended) throw new UnauthorizedException('Votre compte a été suspendu');

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) throw new UnauthorizedException('Email ou mot de passe incorrect');

    // Vérifier 2FA si activé
    if (user.twoFactorEnabled) {
      if (!dto.otpCode) {
        return {
          message: 'Code 2FA requis',
          data: { requires2FA: true, userId: user.id },
        };
      }
      const secret = this.decryptSecret(user.twoFactorSecret);
      const isValid = authenticator.verify({ token: dto.otpCode, secret });
      if (!isValid) throw new UnauthorizedException('Code 2FA invalide');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
        ipAddress,
      },
    });

    return {
      message: 'Connexion réussie',
      data: {
        user: {
          ...this.sanitizeUser(user),
          plan: user.subscription?.plan || 'FREE',
        },
      },
      tokens,
    };
  }

  // ─── TOKENS ─────────────────────────────────────────────────────────────────

  async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('jwt.secret'),
        expiresIn: this.configService.get('jwt.expiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('jwt.refreshSecret'),
        expiresIn: this.configService.get('jwt.refreshExpiresIn'),
      }),
    ]);

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: refreshTokenHash },
    });

    return { accessToken, refreshToken };
  }

  async refreshTokens(userId: string, email: string, role: string) {
    return this.generateTokens(userId, email, role);
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { message: 'Déconnexion réussie' };
  }

  // ─── VERIFICATION EMAIL ──────────────────────────────────────────────────────

  async sendEmailVerification(userId: string, email: string, firstName: string) {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.configService.get('otp.expiryMinutes'));

    await this.prisma.otpToken.deleteMany({
      where: { userId, type: 'EMAIL_VERIFICATION' },
    });

    await this.prisma.otpToken.create({
      data: { userId, token, type: 'EMAIL_VERIFICATION', expiresAt },
    });

    await this.notificationsService.sendEmailVerification(email, firstName, token);
  }

  async verifyEmail(token: string) {
    const otpRecord = await this.prisma.otpToken.findFirst({
      where: { token, type: 'EMAIL_VERIFICATION', usedAt: null },
    });

    if (!otpRecord) throw new BadRequestException('Token invalide ou expiré');
    if (new Date() > otpRecord.expiresAt) throw new BadRequestException('Token expiré');

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: otpRecord.userId },
        data: { isEmailVerified: true },
      }),
      this.prisma.otpToken.update({
        where: { id: otpRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Email vérifié avec succès' };
  }

  // ─── MOT DE PASSE OUBLIE ─────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    // Répondre toujours la même chose (sécurité)
    if (!user) {
      return { message: 'Si cet email existe, un lien a été envoyé' };
    }

    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    await this.prisma.otpToken.deleteMany({
      where: { userId: user.id, type: 'PASSWORD_RESET' },
    });

    await this.prisma.otpToken.create({
      data: { userId: user.id, token, type: 'PASSWORD_RESET', expiresAt },
    });

    await this.notificationsService.sendPasswordReset(user.email, user.firstName, token);

    return { message: 'Si cet email existe, un lien a été envoyé' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const otpRecord = await this.prisma.otpToken.findFirst({
      where: { token: dto.token, type: 'PASSWORD_RESET', usedAt: null },
    });

    if (!otpRecord) throw new BadRequestException('Lien invalide ou expiré');
    if (new Date() > otpRecord.expiresAt) throw new BadRequestException('Lien expiré');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: otpRecord.userId },
        data: { passwordHash, refreshToken: null },
      }),
      this.prisma.otpToken.update({
        where: { id: otpRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Mot de passe réinitialisé avec succès' };
  }

  // ─── 2FA (TOTP) ──────────────────────────────────────────────────────────────

  async generate2FASecret(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    const secret = authenticator.generateSecret();
    const otpAuthUrl = authenticator.keyuri(user.email, 'LS Marketplace', secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    // Stocker le secret chiffré (AES-256-GCM) avant confirmation
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: this.encryptSecret(secret) },
    });

    return {
      message: 'Scanner le QR code avec votre application authenticator',
      data: {
        secret,
        qrCode: qrCodeDataUrl,
        otpAuthUrl,
      },
    };
  }

  async enable2FA(userId: string, dto: Enable2FADto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true },
    });

    if (!user?.twoFactorSecret) {
      throw new BadRequestException('Générez d\'abord le secret 2FA');
    }

    const secret = this.decryptSecret(user.twoFactorSecret);
    const isValid = authenticator.verify({ token: dto.otpCode, secret });
    if (!isValid) throw new BadRequestException('Code OTP invalide');

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return { message: '2FA activé avec succès' };
  }

  async disable2FA(userId: string, dto: Enable2FADto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user?.twoFactorEnabled) throw new BadRequestException('2FA non activé');

    const secret = this.decryptSecret(user.twoFactorSecret);
    const isValid = authenticator.verify({ token: dto.otpCode, secret });
    if (!isValid) throw new BadRequestException('Code OTP invalide');

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });

    return { message: '2FA désactivé avec succès' };
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  private sanitizeUser(user: any) {
    const { passwordHash, refreshToken, twoFactorSecret, ...safe } = user;
    return safe;
  }

  private getEncryptionKey(): Buffer {
    const keyB64 = this.configService.get<string>('encryption.key');
    if (!keyB64) {
      if (this.configService.get('nodeEnv') === 'production') {
        throw new InternalServerErrorException('ENCRYPTION_KEY manquante en production');
      }
      // Clé déterministe pour le développement uniquement
      return Buffer.alloc(32, 'ls-dev-key-not-for-production!');
    }
    const key = Buffer.from(keyB64, 'base64');
    if (key.length !== 32) throw new InternalServerErrorException('ENCRYPTION_KEY doit être 32 bytes (base64)');
    return key;
  }

  private encryptSecret(plaintext: string): string {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private decryptSecret(ciphertext: string): string {
    const key = this.getEncryptionKey();
    const parts = ciphertext.split(':');
    if (parts.length !== 3) throw new BadRequestException('Format secret 2FA invalide');
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
  }
}
