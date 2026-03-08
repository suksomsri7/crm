import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const checks: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      hasAuthSecret: !!process.env.AUTH_SECRET,
      authSecretLength: process.env.AUTH_SECRET?.length ?? 0,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      nodeEnv: process.env.NODE_ENV,
      vercel: process.env.VERCEL ?? "(not set)",
    },
    prisma: { status: "unknown" },
    session: { status: "unknown" },
  };

  try {
    const userCount = await db.user.count();
    const sampleUser = await db.user.findFirst({
      select: { id: true, username: true, isSuperAdmin: true, isActive: true },
    });
    checks.prisma = {
      status: "connected",
      userCount,
      sampleUser: sampleUser
        ? { hasUsername: !!sampleUser.username, isSuperAdmin: sampleUser.isSuperAdmin }
        : null,
    };
  } catch (err: any) {
    checks.prisma = { status: "error", error: err?.message };
  }

  try {
    const session = await auth();
    if (session?.user) {
      const u = session.user as any;
      checks.session = {
        status: "authenticated",
        hasName: !!u.name,
        name: u.name,
        hasEmail: !!u.email,
        hasId: !!u.id,
        hasUsername: !!u.username,
        username: u.username ?? "(missing)",
        isSuperAdmin: u.isSuperAdmin ?? "(missing)",
        hasBrands: !!u.brands,
        brandsCount: u.brands?.length ?? 0,
        hasActiveBrandId: !!u.activeBrandId,
        allKeys: Object.keys(u),
      };
    } else {
      checks.session = { status: "not authenticated", raw: session };
    }
  } catch (err: any) {
    checks.session = { status: "error", error: err?.message };
  }

  return NextResponse.json(checks);
}
