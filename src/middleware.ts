import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BASE = "/crm";

function redirect(req: NextRequest, path: string) {
  const url = req.nextUrl.clone();
  url.pathname = path;
  return NextResponse.redirect(url);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const strippedPath = pathname.startsWith(BASE)
    ? pathname.slice(BASE.length) || "/"
    : pathname;

  const isPublicRoute =
    strippedPath === "/login" ||
    strippedPath === "/forgot-password" ||
    strippedPath.startsWith("/api/auth");

  const sessionToken =
    req.cookies.get("authjs.session-token")?.value ||
    req.cookies.get("__Secure-authjs.session-token")?.value;

  if (isPublicRoute) {
    if (sessionToken && (strippedPath === "/login" || strippedPath === "/forgot-password")) {
      return redirect(req, `${BASE}/dashboard`);
    }
    return NextResponse.next();
  }

  if (!sessionToken) {
    return redirect(req, `${BASE}/login`);
  }

  if (strippedPath === "/") {
    return redirect(req, `${BASE}/dashboard`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
