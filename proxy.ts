import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function isAnonymousTrialPath(pathname: string) {
  return (
    pathname === "/app/upload" ||
    pathname.startsWith("/app/upload/") ||
    pathname === "/app/analyze" ||
    pathname.startsWith("/app/analyze/") ||
    pathname === "/app/tailor" ||
    pathname.startsWith("/app/tailor/")
  );
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase is not configured, skip auth proxy
  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  // Refresh the session token on every request so it doesn't expire silently
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options as any)
        );
      }
    }
  });

  // Refresh session — do NOT remove this; it updates the auth cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect authenticated users away from landing page and auth page to dashboard
  if (user && (pathname === "/" || pathname === "/auth")) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/app";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  if (pathname.startsWith("/app") && !user && !isAnonymousTrialPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/app")) {
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and Next.js internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)"
  ]
};
