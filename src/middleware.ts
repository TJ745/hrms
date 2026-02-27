import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public assets and API auth routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/socket") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);
  const isAuthenticated = !!sessionCookie;

  // Redirect logged-in users away from auth pages
  if (isAuthenticated && AUTH_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL("/select-org", request.url));
  }

  // Allow public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Require auth for everything else
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Tenant guard ─────────────────────────────────────────────
  // Extract orgSlug from URL: /:orgSlug/dashboard etc.
  const orgSlugMatch = pathname.match(/^\/([^\/]+)\//);
  if (orgSlugMatch) {
    const orgSlug = orgSlugMatch[1];

    // Skip non-tenant paths
    const skipSlugs = ["api", "select-org", "_next", "favicon.ico"];
    if (!skipSlugs.includes(orgSlug)) {
      // Pass orgSlug to page via header — validated in layout
      const response = NextResponse.next();
      response.headers.set("x-org-slug", orgSlug);
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
