import { NextRequest, NextResponse } from 'next/server'

// CSP par nonce (pattern officiel Next.js App Router) : script-src strict
// ('self' + nonce + strict-dynamic, PAS de unsafe-inline) tout en laissant
// Next.js noncer automatiquement ses propres scripts inline d'hydratation RSC
// (mécanisme interne déclenché par la présence du header de requête x-nonce).
//
// EN MODE REPORT-ONLY POUR L'INSTANT : observe les violations sans rien
// bloquer. À valider au navigateur (devtools > Console, chercher les lignes
// "Content-Security-Policy") puis à flip en 1 ligne vers l'entête enforce
// ('Content-Security-Policy' au lieu de '-Report-Only') une fois confirmé propre.
//
// style-src garde 'unsafe-inline' : le codebase utilise des props style={{}}
// inline (gradients hero, framer-motion) sur de nombreux composants — les
// réécrire en classes CSS pour permettre un style-src strict serait un
// chantier séparé, hors scope ici. Compromis assumé et documenté : l'injection
// CSS est un vecteur d'attaque nettement plus faible que l'injection JS.
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  const csp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https://*.r2.dev https://*.cloudflarestorage.com https://cdn.ls-marketplace.com https://images.unsplash.com https://via.placeholder.com https://placehold.co;
    font-src 'self';
    connect-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'self';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim()

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy-Report-Only', csp)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy-Report-Only', csp)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|sw\\.js|manifest\\.webmanifest|placeholder\\.svg).*)'],
}
