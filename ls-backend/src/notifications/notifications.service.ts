import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: configService.get('email.host'),
      port: configService.get('email.port'),
      auth: {
        user: configService.get('email.user'),
        pass: configService.get('email.pass'),
      },
    });
  }

  // ─── EMAIL ──────────────────────────────────────────────────────────────────

  async sendEmail(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({
        from: `"${this.configService.get('email.fromName')}" <${this.configService.get('email.from')}>`,
        to,
        subject,
        html,
      });
      this.logger.log(`Email envoyé à ${to}: ${subject}`);
    } catch (error) {
      this.logger.error(`Erreur envoi email à ${to}: ${error.message}`);
    }
  }

  async sendEmailVerification(email: string, firstName: string, token: string) {
    const frontendUrl = this.configService.get('frontendUrl');
    const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;

    await this.sendEmail(
      email,
      '✅ Vérifiez votre email — LS Marketplace',
      this.emailTemplate(`
        <h2>Bonjour ${firstName} !</h2>
        <p>Merci de rejoindre <strong>LS Marketplace</strong>. Cliquez sur le bouton ci-dessous pour vérifier votre adresse email :</p>
        <div style="text-align:center;margin:30px 0;">
          <a href="${verifyUrl}" style="background:#1A3C6E;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
            Vérifier mon email
          </a>
        </div>
        <p style="color:#888;font-size:13px;">Ce lien expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
      `),
    );
  }

  async sendPasswordReset(email: string, firstName: string, token: string) {
    const frontendUrl = this.configService.get('frontendUrl');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await this.sendEmail(
      email,
      '🔐 Réinitialisation de votre mot de passe — LS Marketplace',
      this.emailTemplate(`
        <h2>Bonjour ${firstName},</h2>
        <p>Vous avez demandé une réinitialisation de mot de passe. Cliquez ci-dessous :</p>
        <div style="text-align:center;margin:30px 0;">
          <a href="${resetUrl}" style="background:#E8611A;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
            Réinitialiser mon mot de passe
          </a>
        </div>
        <p style="color:#888;font-size:13px;">Ce lien expire dans 30 minutes.</p>
      `),
    );
  }

  async sendOrderConfirmation(
    email: string, firstName: string,
    orderNumber: string, totalAmount: number, currency: string,
  ) {
    await this.sendEmail(
      email,
      `🛍️ Commande #${orderNumber} confirmée — LS Marketplace`,
      this.emailTemplate(`
        <h2>Commande confirmée !</h2>
        <p>Bonjour ${firstName}, votre commande <strong>#${orderNumber}</strong> a bien été reçue.</p>
        <p>Montant total : <strong>${totalAmount.toLocaleString()} ${currency}</strong></p>
        <p>Le paiement est sécurisé. Les fonds seront libérés au vendeur après confirmation de réception.</p>
        <div style="background:#F5F5F5;padding:16px;border-radius:8px;margin:20px 0;">
          <p>💡 <strong>Escrow LS</strong> : Votre argent est protégé jusqu'à ce que vous confirmiez avoir reçu votre commande.</p>
        </div>
      `),
    );
  }

  async sendOrderShipped(email: string, firstName: string, orderNumber: string, trackingUrl?: string) {
    await this.sendEmail(
      email,
      `🚚 Votre commande #${orderNumber} est expédiée !`,
      this.emailTemplate(`
        <h2>Votre commande est en chemin !</h2>
        <p>Bonjour ${firstName}, la commande <strong>#${orderNumber}</strong> a été expédiée.</p>
        ${trackingUrl ? `<div style="text-align:center;margin:20px 0;"><a href="${trackingUrl}" style="background:#1A3C6E;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">Suivre ma commande</a></div>` : ''}
      `),
    );
  }

  async sendNewMessage(email: string, firstName: string, senderName: string) {
    await this.sendEmail(
      email,
      `💬 Nouveau message de ${senderName} — LS Marketplace`,
      this.emailTemplate(`
        <h2>Nouveau message !</h2>
        <p>Bonjour ${firstName}, <strong>${senderName}</strong> vous a envoyé un message sur LS Marketplace.</p>
        <div style="text-align:center;margin:20px 0;">
          <a href="${this.configService.get('frontendUrl')}/messages" style="background:#1A3C6E;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">Voir le message</a>
        </div>
      `),
    );
  }

  // ─── NOTIFICATIONS IN-APP ─────────────────────────────────────────────────

  async createNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    titleEn?: string;
    body: string;
    bodyEn?: string;
    data?: any;
  }) {
    return this.prisma.notification.create({ data });
  }

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { notifications, total, unreadCount, page, limit };
  }

  async markAsRead(userId: string, notificationId?: string) {
    if (notificationId) {
      await this.prisma.notification.updateMany({
        where: { id: notificationId, userId },
        data: { isRead: true },
      });
    } else {
      await this.prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
    }
    return { message: 'Notifications marquées comme lues' };
  }

  // ─── TEMPLATE EMAIL ──────────────────────────────────────────────────────────

  private emailTemplate(content: string): string {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LS Marketplace</title>
</head>
<body style="margin:0;padding:0;background:#F5F7FA;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7FA;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#1A3C6E;padding:24px 32px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:28px;font-weight:800;letter-spacing:1px;">LS</h1>
              <p style="margin:4px 0 0;color:#E8611A;font-size:12px;letter-spacing:2px;text-transform:uppercase;">LEVEL SOLUTION IT</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#333;font-size:15px;line-height:1.6;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="background:#F5F7FA;padding:20px 32px;text-align:center;border-top:1px solid #E8E8E8;">
              <p style="margin:0;color:#888;font-size:12px;">© ${new Date().getFullYear()} LS Marketplace. Tous droits réservés.</p>
              <p style="margin:4px 0 0;color:#888;font-size:12px;">Lomé, Togo · <a href="#" style="color:#1A3C6E;">Se désabonner</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
