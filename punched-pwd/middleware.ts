import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ═══════════════════════════════════════════════════════════════
//  Next.js Middleware — Route Protection
//
//  Strategy:
//  1. Public routes are whitelisted and always allowed through.
//  2. Protected routes check for an 'access_token' cookie.
//     If absent → redirect to /login (server-side, fast).
//  3. Role-enforcement (Customer/Business/Staff) is handled
//     client-side via useRoleGuard — the middleware cannot
//     decode JWTs without the secret being exposed at edge.
//  4. The backend validates every API call with a full JWT
//     signature check, so double-enforcement is not needed here.
// ═══════════════════════════════════════════════════════════════

const PUBLIC_PATHS = new Set([
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
]);

const PUBLIC_PREFIX = ["/refer", "/_next", "/api", "/favicon.ico"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (
    PUBLIC_PATHS.has(pathname) ||
    PUBLIC_PREFIX.some((p) => pathname.startsWith(p)) ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Only protect /dashboard/** routes
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  // Check for access token cookie (set by the API client on login)
  const token = request.cookies.get("access_token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based path enforcement: prevent cross-role route access
  const staffOnly = pathname.startsWith("/dashboard/staff");
  const businessOnly =
    pathname.startsWith("/dashboard/business") ||
    pathname.startsWith("/dashboard/explore") === false; // not exclusive

  // We extract the role from a lightweight non-signature-verified decode.
  // This is only for UX redirect purposes — real authz happens on the backend.
  try {
    const payloadB64 = token.split(".")[1];
    if (payloadB64) {
      const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf-8");
      const payload = JSON.parse(payloadJson) as Record<string, unknown>;

      // Reject expired tokens immediately (rough check, no sig validation)
      const exp = payload.exp as number | undefined;
      if (exp && exp * 1000 < Date.now()) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("from", pathname);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete("access_token");
        return response;
      }

      // .NET JWTs use the full Microsoft claim URI for role
      const rawRole =
        (payload.role as string) ??
        (payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] as string);
      const role = rawRole?.toLowerCase();

      // Admin users can access all routes
      if (role === "admin") {
        // If admin visits a non-admin dashboard path, let them through
        // but redirect to admin dashboard from generic /dashboard
        if (pathname === "/dashboard") {
          return NextResponse.redirect(new URL("/dashboard/admin", request.url));
        }
        return NextResponse.next();
      }

      // Non-admin users must not access admin areas
      if (pathname.startsWith("/dashboard/admin")) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }

      // Staff users must not access business or customer-only areas
      if (role === "staff" && pathname.startsWith("/dashboard/business")) {
        return NextResponse.redirect(new URL("/dashboard/staff/activity", request.url));
      }

      // Business users must not access staff areas
      if (role === "business" && staffOnly) {
        return NextResponse.redirect(new URL("/dashboard/business", request.url));
      }

      // Customer users must not access staff or business areas
      if (role === "customer" && (staffOnly || pathname.startsWith("/dashboard/business"))) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  } catch {
    // Malformed token — redirect to login
    const loginUrl = new URL("/login", request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("access_token");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

