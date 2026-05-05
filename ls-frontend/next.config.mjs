import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.r2.dev' },
      { protocol: 'https', hostname: '**.cloudflarestorage.com' },
      { protocol: 'https', hostname: 'cdn.ls-marketplace.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
    ],
    formats: ['image/webp', 'image/avif'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    instrumentationHook: true,
  },
};

export default withSentryConfig(nextConfig, {
  // Organisation et projet Sentry (à renseigner dans les variables d'env)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload des source maps uniquement en prod pour dé-minifier les erreurs
  silent: true,
  widenClientFileUpload: true,

  // Désactiver le tunnel par défaut (évite les requêtes proxy supplémentaires)
  tunnelRoute: undefined,

  // Supprimer les source maps du bundle livré (elles sont uploadées chez Sentry)
  hideSourceMaps: true,

  // Désactiver l'arbre de dépendances (plus rapide)
  disableLogger: true,
});
