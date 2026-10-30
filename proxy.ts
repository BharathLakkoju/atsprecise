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

function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.includes("-auth-token"));
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAppPath = pathname.startsWith("/app");
  const isAuthRedirectPath = pathname === "/" || pathname === "/auth";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }

  const hasSessionCookie = hasSupabaseAuthCookie(request);

  // Anonymous first visits skip the Auth API so HTML can stream immediately.
  if (!hasSessionCookie) {
    if (isAppPath && !isAnonymousTrialPath(pathname)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/auth";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }[],
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(
            name,
            value,
            options as Parameters<typeof response.cookies.set>[2],
          ),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && isAuthRedirectPath) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/app";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  if (isAppPath && !user && !isAnonymousTrialPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAppPath) {
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
  matcher: ["/", "/auth", "/auth/:path*", "/app", "/app/:path*"],
};
