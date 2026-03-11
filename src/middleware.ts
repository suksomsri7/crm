import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function redirect(req: NextRequest, path: string) {
  const url = req.nextUrl.clone();
  url.pathname = path;
  return NextResponse.redirect(url);
}

export function middleware(req: NextRequest) {
  // With basePath: "/crm", req.nextUrl.pathname already excludes basePath.
  // e.g. visiting /crm/login → pathname = "/login"
  // NextURL.clone() re-adds basePath automatically on redirect.
  const { pathname } = req.nextUrl;

  const isPublicRoute =
    pathname === "/login" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/api/auth");

  const sessionToken =
    req.cookies.get("authjs.session-token")?.value ||
    req.cookies.get("__Secure-authjs.session-token")?.value;

  if (isPublicRoute) {
    if (sessionToken && (pathname === "/login" || pathname === "/forgot-password")) {
      return redirect(req, "/dashboard");
    }
    return NextResponse.next();
  }

  if (!sessionToken) {
    return redirect(req, "/login");
  }

  if (pathname === "/") {
    return redirect(req, "/dashboard");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
