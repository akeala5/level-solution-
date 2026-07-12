import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { SentryInterceptor } from './common/interceptors/sentry.interceptor';

// Sentry doit être initialisé avant NestFactory pour intercepter toutes les erreurs
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    ignoreErrors: [
      'UnauthorizedException',
      'NotFoundException',
      'BadRequestException',
      'ForbiddenException',
    ],
  });
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true, // Nécessaire pour les webhooks Stripe
    logger: ['error', 'warn', 'log'],
  });

  // ─── SÉCURITÉ ────────────────────────────────────────────────────────────────
  app.use(helmet.default());
  app.use(compression());

  // ─── CORS ────────────────────────────────────────────────────────────────────
  // En production : uniquement FRONTEND_URL. localhost réservé au développement.
  const corsOrigins =
    process.env.NODE_ENV === 'production'
      ? [process.env.FRONTEND_URL].filter(Boolean)
      : [
          process.env.FRONTEND_URL || 'http://localhost:3000',
          'http://localhost:3000',
          'http://localhost:3001',
        ];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language'],
  });

  // ─── SENTRY ───────────────────────────────────────────────────────────────────
  if (process.env.SENTRY_DSN) {
    app.useGlobalInterceptors(new SentryInterceptor());
  }

  // ─── VALIDATION GLOBALE ───────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── PREFIX API ───────────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ─── DOCUMENTATION SWAGGER ───────────────────────────────────────────────────
  const swaggerEnabled =
    process.env.NODE_ENV !== 'production' || process.env.SWAGGER_ENABLED === 'true';

  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('LS Marketplace API')
      .setDescription(
        'API complète de la marketplace LS — Level Solution IT\n\n' +
        '**Base URL production** : `https://ls-marketplace.com/api/v1`\n\n' +
        '**Auth** : Bearer JWT (access token 15min, refresh 7j)',
      )
      .setVersion('2.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .addTag('Auth', 'Authentification, 2FA, reset password')
      .addTag('Users', 'Profil, adresses, favoris, fidélité, KYC')
      .addTag('Categories', 'Catégories de produits')
      .addTag('Products', 'Annonces — CRUD, recherche, modération')
      .addTag('Orders', 'Commandes, escrow 48h, litiges')
      .addTag('Payments', 'Stripe (carte) + FedaPay Mobile Money (Wave/Orange/MTN/TMoney/Flooz/Moov)')
      .addTag('Auctions', 'Enchères temps réel (WebSocket /auctions)')
      .addTag('SearchAlerts', 'Alertes de recherche — notifie sur nouvelles annonces')
      .addTag('Subscriptions', 'Gestion des forfaits vendeur (FREE → BUSINESS)')
      .addTag('Admin', 'Back-office — stats, modération, KYC, litiges')
      .addTag('Chat', 'Messagerie interne temps réel (WebSocket /chat)')
      .addTag('Reviews', 'Avis et évaluations multi-dimensions')
      .addTag('Notifications', 'Notifications in-app + email + SMS')
      .addTag('Upload', 'Upload d\'images vers Cloudflare R2')
      .addServer('http://localhost:3001', 'Développement local')
      .addServer('https://ls-marketplace.com', 'Production')
      .build();

    const document = SwaggerModule.createDocument(app, config);

    // En production, protéger /api/docs avec basic auth
    if (process.env.NODE_ENV === 'production') {
      app.use('/api/docs', (req: any, res: any, next: any) => {
        const auth = req.headers.authorization;
        if (!auth) {
          res.setHeader('WWW-Authenticate', 'Basic realm="LS API Docs"');
          return res.status(401).send('Authentication required');
        }
        const [type, credentials] = auth.split(' ');
        if (type !== 'Basic') return res.status(401).send('Unauthorized');
        const [user, pass] = Buffer.from(credentials, 'base64').toString().split(':');
        const validUser = process.env.SWAGGER_USER || 'admin';
        const validPass = process.env.SWAGGER_PASS || 'ls-docs-2026';
        if (user !== validUser || pass !== validPass) return res.status(401).send('Unauthorized');
        next();
      });
    }

    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true, docExpansion: 'none', filter: true, tagsSorter: 'alpha' },
      customSiteTitle: 'LS Marketplace — API Docs v2',
      customCss: `.swagger-ui .topbar { background: #1A3C6E } .swagger-ui .topbar-wrapper img { content: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="%231A3C6E"/><text x="6" y="22" font-size="18" font-weight="bold" fill="white">LS</text></svg>') }`,
    });
  }

  // ─── DÉMARRAGE ────────────────────────────────────────────────────────────────
  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`\n`);
  console.log(`  ██╗     ███████╗`);
  console.log(`  ██║     ██╔════╝`);
  console.log(`  ██║     ███████╗`);
  console.log(`  ██║     ╚════██║`);
  console.log(`  ███████╗███████║`);
  console.log(`  ╚══════╝╚══════╝`);
  console.log(`\n  LEVEL SOLUTION IT — Marketplace API`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  🚀 Serveur     : http://localhost:${port}`);
  console.log(`  📚 API Docs    : http://localhost:${port}/api/docs`);
  console.log(`  🌍 Environnement : ${process.env.NODE_ENV || 'development'}`);
  console.log(`\n`);
}

bootstrap();
