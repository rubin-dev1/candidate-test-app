import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const getSecret = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET not set');
  return new TextEncoder().encode(s);
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());

    // /admin доступен только администраторам
    if (pathname.startsWith('/admin') && !payload.isAdmin) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
  } catch {
    // Невалидный или просроченный токен → на логин
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.delete('auth_token');
    response.cookies.delete('test_session');
    return response;
  }
}

export const config = {
  matcher: ['/test/:path*', '/result/:path*', '/admin/:path*'],
};
