// PM2 — LS Marketplace Production
// Usage : pm2 start ecosystem.config.js --env production

const APP_ROOT = '/var/www/shopls-pro';

module.exports = {
  apps: [
    // ─── BACKEND NESTJS ────────────────────────────────────────────────────────
    {
      name: 'ls-backend',
      cwd: `${APP_ROOT}/ls-backend`,
      script: 'dist/src/main.js',
      interpreter: 'node',
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '512M',
      watch: false,
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/var/log/pm2/ls-backend-error.log',
      out_file: '/var/log/pm2/ls-backend-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },

    // ─── FRONTEND NEXT.JS (standalone output) ─────────────────────────────────
    {
      name: 'ls-frontend',
      cwd: `${APP_ROOT}/ls-frontend`,
      script: '.next/standalone/server.js',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',       // standalone Next.js ne supporte pas cluster
      max_memory_restart: '512M',
      watch: false,
      node_args: '--max-old-space-size=460',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '127.0.0.1',
      },
      error_file: '/var/log/pm2/ls-frontend-error.log',
      out_file: '/var/log/pm2/ls-frontend-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
