import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  // Volunteer routes are deprecated; forward to intern equivalents.
  if (request.nextUrl.pathname === '/volunteer' || request.nextUrl.pathname.startsWith('/volunteer/')) {
    const internPath = request.nextUrl.pathname.replace(/^\/volunteer/, '/intern');
    const redirectUrl = new URL(internPath + request.nextUrl.search, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Create a response object to modify
  let response = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables in middleware');
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refresh session if expired - required for Server Components
  // This will automatically refresh the session cookie if needed
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/participant/:path*', '/volunteer/:path*', '/intern/:path*', '/local_leader/:path*'],
};
