import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublicRoute =
    pathname === "/login" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/api/auth");

  const sessionToken =
    req.cookies.get("authjs.session-token")?.value ||
    req.cookies.get("__Secure-authjs.session-token")?.value;

  const hasApiKey = req.headers.get("x-api-key") !== null;

  // #region agent log
  if (pathname.startsWith("/api/")) {
    fetch('http://127.0.0.1:7682/ingest/b70e1de7-b1ca-437c-8f3d-79f7aafa5e30',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b541a5'},body:JSON.stringify({sessionId:'b541a5',location:'middleware.ts:MW',message:'API middleware hit',data:{pathname,hasApiKey,hasSession:!!sessionToken,method:req.method},timestamp:Date.now(),hypothesisId:'H-A'})}).catch(()=>{});
  }
  // #endregion

  if (isPublicRoute) {
    if (sessionToken && (pathname === "/login" || pathname === "/forgot-password")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (hasApiKey && pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (!sessionToken) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
