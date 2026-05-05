import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';
import { NotificationType } from '@prisma/client';
import Twilio from 'twilio';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;
  private twilioClient: Twilio.Twilio | null = null;
  private twilioFrom: string;
  private whatsappFrom: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    // ── Email (Nodemailer SMTP) ──────────────────────────────────────────────
    this.transporter = nodemailer.createTransport({
      host: configService.get('email.host'),
      port: configService.get('email.port'),
      auth: {
        user: configService.get('email.user'),
        pass: configService.get('email.pass'),
      },
    });

    // ── SMS + WhatsApp (Twilio) — facultatif, pas de crash si clés absentes ──
    const accountSid    = configService.get<string>('twilio.accountSid');
    const authToken     = configService.get<string>('twilio.authToken');
    this.twilioFrom     = configService.get<string>('twilio.phoneNumber') || '';
    this.whatsappFrom   = configService.get<string>('twilio.whatsappFrom') || '';

    if (accountSid && authToken) {
      try {
        this.twilioClient = Twilio(accountSid, authToken);
        this.logger.log(`Twilio initialisé — SMS ${this.twilioFrom ? '✓' : '—'} · WhatsApp ${this.whatsappFrom ? '✓' : '—'}`);
      } catch (e) {
        this.logger.warn('Twilio non disponible — SMS/WhatsApp désactivés');
      }
    } else {
      this.logger.warn('TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN manquants — SMS/WhatsApp désactivés');
    }
  }

  // ─── SMS ─────────────────────────────────────────────────────────────────

  async sendSms(to: string, body: string): Promise<boolean> {
    if (!this.twilioClient) {
      this.logger.warn(`SMS non envoyé (Twilio désactivé) — à ${to}: ${body}`);
      return false;
    }
    // Normalise le numéro (ajoute + si absent)
    const normalized = to.startsWith('+') ? to : `+${to}`;
    try {
      await this.twilioClient.messages.create({
        body,
        from: this.twilioFrom,
        to: normalized,
      });
      this.logger.log(`SMS envoyé à ${normalized}`);
      return true;
    } catch (error) {
      this.logger.error(`Erreur SMS à ${normalized}: ${error.message}`);
      return false;
    }
  }

  async sendSmsOtp(phone: string, firstName: string, code: string) {
    await Promise.allSettled([
      this.sendSms(
        phone,
        `LS Marketplace - Bonjour ${firstName}, votre code de vérification est : ${code}. Valable 10 min.`,
      ),
      this.sendWhatsAppOtp(phone, firstName, code),
    ]);
  }

  async sendSmsOrderConfirmed(phone: string, firstName: string, orderNumber: string, amount: string) {
    await this.sendSms(
      phone,
      `LS Marketplace - Bonjour ${firstName} ! Commande #${orderNumber} confirmée. Montant : ${amount} FCFA. Paiement sécurisé par escrow LS.`,
    );
  }

  async sendSmsOrderShipped(phone: string, firstName: string, orderNumber: string) {
    await this.sendSms(
      phone,
      `LS Marketplace - Votre commande #${orderNumber} est en route ! Confirmez la réception dans votre espace acheteur.`,
    );
  }

  async sendSmsOrderDelivered(phone: string, firstName: string, orderNumber: string) {
    await this.sendSms(
      phone,
      `LS Marketplace - Commande #${orderNumber} livrée. Vous avez 48h pour confirmer ou ouvrir un litige. ls-marketplace.com`,
    );
  }

  async sendSmsNewMessage(phone: string, firstName: string, senderName: string) {
    await this.sendSms(
      phone,
      `LS Marketplace - ${firstName}, nouveau message de ${senderName}. Connectez-vous pour répondre.`,
    );
  }

  async sendSmsPaymentReceived(phone: string, firstName: string, amount: string, orderNumber: string) {
    await this.sendSms(
      phone,
      `LS Marketplace - Paiement reçu de ${amount} FCFA pour la commande #${orderNumber}. Préparez votre colis.`,
    );
  }

  // ─── WHATSAPP ─────────────────────────────────────────────────────────────

  async sendWhatsApp(to: string, body: string): Promise<boolean> {
    if (!this.twilioClient || !this.whatsappFrom) {
      this.logger.warn(`WhatsApp non envoyé (Twilio/whatsappFrom désactivé) — à ${to}`);
      return false;
    }
    const normalized = to.startsWith('+') ? to : `+${to}`;
    try {
      await this.twilioClient.messages.create({
        body,
        from: this.whatsappFrom.startsWith('whatsapp:') ? this.whatsappFrom : `whatsapp:${this.whatsappFrom}`,
        to: `whatsapp:${normalized}`,
      });
      this.logger.log(`WhatsApp envoyé à ${normalized}`);
      return true;
    } catch (error) {
      this.logger.error(`Erreur WhatsApp à ${normalized}: ${error.message}`);
      return false;
    }
  }

  async sendWhatsAppOrderConfirmed(phone: string, firstName: string, orderNumber: string, amount: string) {
    await this.sendWhatsApp(
      phone,
      `🛍️ *LS Marketplace*\n\nBonjour *${firstName}* !\n\nVotre commande *#${orderNumber}* est confirmée.\nMontant : *${amount} FCFA*\n\n🔒 Votre paiement est sécurisé par l'escrow LS. Les fonds seront libérés au vendeur après confirmation de réception.\n\n👉 Suivez votre commande sur ls-marketplace.com`,
    );
  }

  async sendWhatsAppOrderShipped(phone: string, firstName: string, orderNumber: string, trackingUrl?: string) {
    const trackingLine = trackingUrl ? `\n\n📍 Suivi : ${trackingUrl}` : '';
    await this.sendWhatsApp(
      phone,
      `🚚 *LS Marketplace*\n\nBonjour *${firstName}* !\n\nVotre commande *#${orderNumber}* est en route !${trackingLine}\n\nConfirmez la réception dans votre espace acheteur une fois livré.`,
    );
  }

  async sendWhatsAppOrderDelivered(phone: string, firstName: string, orderNumber: string) {
    await this.sendWhatsApp(
      phone,
      `📦 *LS Marketplace*\n\nBonjour *${firstName}* !\n\nVotre commande *#${orderNumber}* a été marquée comme livrée.\n\n⏱️ Vous avez *48h* pour confirmer la réception ou ouvrir un litige.\n\n👉 ls-marketplace.com/orders`,
    );
  }

  async sendWhatsAppNewMessage(phone: string, firstName: string, senderName: string) {
    await this.sendWhatsApp(
      phone,
      `💬 *LS Marketplace*\n\nBonjour *${firstName}* !\n\nVous avez un nouveau message de *${senderName}*.\n\n👉 Répondez sur ls-marketplace.com/chat`,
    );
  }

  async sendWhatsAppPaymentReceived(phone: string, firstName: string, amount: string, orderNumber: string) {
    await this.sendWhatsApp(
      phone,
      `💰 *LS Marketplace*\n\nBonjour *${firstName}* !\n\nPaiement reçu : *${amount} FCFA* pour la commande *#${orderNumber}*.\n\nPréparez et expédiez le colis dès que possible. 🚀`,
    );
  }

  async sendWhatsAppOtp(phone: string, firstName: string, code: string) {
    await this.sendWhatsApp(
      phone,
      `🔐 *LS Marketplace*\n\nBonjour *${firstName}* !\n\nVotre code de vérification : *${code}*\n\n⚠️ Valable 10 minutes. Ne partagez jamais ce code.`,
    );
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
    phone?: string,
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
    if (phone) {
      // Envoyer en parallèle SMS + WhatsApp (erreur de l'un n'annule pas l'autre)
      await Promise.allSettled([
        this.sendSmsOrderConfirmed(phone, firstName, orderNumber, totalAmount.toLocaleString()),
        this.sendWhatsAppOrderConfirmed(phone, firstName, orderNumber, totalAmount.toLocaleString()),
      ]);
    }
  }

  async sendOrderShipped(
    email: string, firstName: string,
    orderNumber: string, trackingUrl?: string, phone?: string,
  ) {
    await this.sendEmail(
      email,
      `🚚 Votre commande #${orderNumber} est expédiée !`,
      this.emailTemplate(`
        <h2>Votre commande est en chemin !</h2>
        <p>Bonjour ${firstName}, la commande <strong>#${orderNumber}</strong> a été expédiée.</p>
        ${trackingUrl ? `<div style="text-align:center;margin:20px 0;"><a href="${trackingUrl}" style="background:#1A3C6E;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">Suivre ma commande</a></div>` : ''}
      `),
    );
    if (phone) {
      await Promise.allSettled([
        this.sendSmsOrderShipped(phone, firstName, orderNumber),
        this.sendWhatsAppOrderShipped(phone, firstName, orderNumber, trackingUrl),
      ]);
    }
  }

  async sendNewMessage(
    email: string, firstName: string,
    senderName: string, phone?: string,
  ) {
    await this.sendEmail(
      email,
      `💬 Nouveau message de ${senderName} — LS Marketplace`,
      this.emailTemplate(`
        <h2>Nouveau message !</h2>
        <p>Bonjour ${firstName}, <strong>${senderName}</strong> vous a envoyé un message sur LS Marketplace.</p>
        <div style="text-align:center;margin:20px 0;">
          <a href="${this.configService.get('frontendUrl')}/chat" style="background:#1A3C6E;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">Voir le message</a>
        </div>
      `),
    );
    if (phone) {
      await Promise.allSettled([
        this.sendSmsNewMessage(phone, firstName, senderName),
        this.sendWhatsAppNewMessage(phone, firstName, senderName),
      ]);
    }
  }

  // ─── PUSH NOTIFICATIONS (Web Push) ─────────────────────────────────────────

  async savePushSubscription(userId: string, subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }) {
    // Sauvegarde en JSON dans le profil utilisateur
    await this.prisma.profile.upsert({
      where: { userId },
      update: { pushSubscription: JSON.stringify(subscription) },
      create: { userId, pushSubscription: JSON.stringify(subscription), country: 'TG', language: 'fr', currency: 'XOF' },
    });
    return { message: 'Abonnement push enregistré' };
  }

  async sendPushNotification(userId: string, payload: { title: string; body: string; url?: string }) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile?.pushSubscription) return;

    const webpush = await import('web-push');
    const vapidPublicKey  = this.configService.get<string>('vapid.publicKey');
    const vapidPrivateKey = this.configService.get<string>('vapid.privateKey');

    if (!vapidPublicKey || !vapidPrivateKey) {
      this.logger.warn('Clés VAPID manquantes — push notification désactivée');
      return;
    }

    webpush.setVapidDetails(
      `mailto:${this.configService.get('email.from')}`,
      vapidPublicKey,
      vapidPrivateKey,
    );

    try {
      const subscription = JSON.parse(profile.pushSubscription as string);
      await webpush.sendNotification(subscription, JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url || '/',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
      }));
      this.logger.log(`Push envoyée à userId ${userId}`);
    } catch (error) {
      this.logger.error(`Erreur push userId ${userId}: ${error.message}`);
      // Nettoyer l'abonnement invalide
      if (error.statusCode === 410) {
        await this.prisma.profile.update({
          where: { userId },
          data: { pushSubscription: null },
        });
      }
    }
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
