import { NextRequest, NextResponse } from "next/server";

/**
 * Domain-based routing middleware
 *
 * - myphone-store-admin.vercel.app  → admin portal
 * - myphone-store.vercel.app        → customer portal
 *
 * Configured via environment variables:
 *   NEXT_PUBLIC_CUSTOMER_DOMAIN = myphone-store.vercel.app
 *   NEXT_PUBLIC_ADMIN_DOMAIN    = myphone-store-admin.vercel.app
 */

const CUSTOMER_DOMAIN = process.env.CUSTOMER_DOMAIN || process.env.NEXT_PUBLIC_CUSTOMER_DOMAIN || "";
const ADMIN_DOMAIN = process.env.ADMIN_DOMAIN || process.env.NEXT_PUBLIC_ADMIN_DOMAIN || "";

// Routes that belong to the admin portal
const ADMIN_ROUTES = [
  "/statistical",
  "/products",
  "/orders",
  "/accounts",
  "/accounts-roles",
  "/banners",
  "/brands",
  "/categories",
  "/contacts",
  "/evaluates",
  "/news",
  "/payments",
  "/profiles",
  "/settings",
];

// Routes that belong to the customer portal
const CUSTOMER_ROUTES = [
  "/home",
  "/product",
  "/new",
  "/contact",
  "/about",
  "/cart",
  "/order",
  "/payment",
  "/profile",
];

export function middleware(req: NextRequest) {
  const hostname = (req.headers.get("host") || "").split(":")[0];
  const { pathname } = req.nextUrl;

  // Skip static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Only apply logic when domains are configured (production)
  if (!CUSTOMER_DOMAIN || !ADMIN_DOMAIN) {
    return NextResponse.next();
  }

  const isAdminDomain = hostname === ADMIN_DOMAIN;
  const isCustomerDomain = hostname === CUSTOMER_DOMAIN;

  if (isAdminDomain) {
    // On admin domain: redirect customer-only paths to admin home
    const isCustomerOnly = CUSTOMER_ROUTES.some((r) => pathname.startsWith(r));
    if (isCustomerOnly) {
      return NextResponse.redirect(new URL("/statistical", req.url));
    }
    return NextResponse.next();
  }

  if (isCustomerDomain) {
    // On customer domain: redirect admin-only paths to customer home
    const isAdminOnly = ADMIN_ROUTES.some((r) => pathname.startsWith(r));
    if (isAdminOnly) {
      return NextResponse.redirect(new URL("/home", req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
