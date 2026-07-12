import { NextRequest, NextResponse } from 'next/server'

const PROTECTED_PATHS = [
  '/checkout',
  '/orders',
  '/dashboard',
  '/profile',
  '/chat',
  '/review',
  '/notifications',
  '/loyalty',
  '/products/create',
  '/products/edit',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtected = PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))

  if (!isProtected) return NextResponse.next()

  const token = request.cookies.get('accessToken')?.value
  if (!token) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/auth/login'
    loginUrl.search = `?next=${encodeURIComponent(pathname)}`
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/checkout/:path*',
    '/orders/:path*',
    '/dashboard/:path*',
    '/profile/:path*',
    '/chat/:path*',
    '/review/:path*',
    '/notifications/:path*',
    '/loyalty/:path*',
    '/products/create/:path*',
    '/products/create',
    '/products/edit/:path*',
  ],
}
