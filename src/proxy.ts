import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from './lib/auth'

export async function proxy(request: NextRequest) {
  const session = request.cookies.get('session')?.value
  const { pathname } = request.nextUrl

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

  const responseHeaders = {
    request: {
      headers: requestHeaders,
    },
  }

  // Allow public assets and public landing pages
  if (pathname.startsWith('/_next') || pathname === '/favicon.ico' || pathname === '/login' || pathname === '/mestre/login' || pathname === '/') {
    // We still return with the modified headers so the layout knows the pathname!
    return NextResponse.next(responseHeaders)
  }

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const payload = await decrypt(session)

  if (!payload) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('session')
    return response
  }

  const role = payload.role as string;
  let permissions: string[] = [];
  try {
    if (payload.permissions) {
      permissions = JSON.parse(payload.permissions as string);
    }
  } catch (e) {
    console.error("Invalid permissions JSON in session");
  }

  const reject = () => NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url));

  if (pathname.startsWith('/mestre') && role !== 'SUPER_ADMIN') {
    return reject();
  }

  if (role !== 'SUPER_ADMIN' && role !== 'COMPANY_ADMIN') {
    const hasAll = permissions.includes("ALL");
    
    if (!hasAll) {
      if (pathname.startsWith('/pdv') && !permissions.includes("PDV_ACCESS")) return reject();
      if (pathname.startsWith('/estoque') && !permissions.includes("VIEW_STOCK") && !permissions.includes("MANAGE_STOCK")) return reject();
      if (pathname.startsWith('/financeiro') && !permissions.includes("VIEW_FINANCE")) return reject();
      if (pathname.startsWith('/usuarios') && !permissions.includes("MANAGE_USERS")) return reject();
    }
  }

  return NextResponse.next(responseHeaders)
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
