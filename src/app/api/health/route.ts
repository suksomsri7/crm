import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const checks: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      hasAuthSecret: !!process.env.AUTH_SECRET,
      authSecretLength: process.env.AUTH_SECRET?.length ?? 0,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasAuthUrl: !!process.env.AUTH_URL,
      authUrl: process.env.AUTH_URL ?? "(not set)",
      nodeEnv: process.env.NODE_ENV,
      vercel: process.env.VERCEL ?? "(not set)",
      vercelUrl: process.env.VERCEL_URL ?? "(not set)",
    },
    prisma: { status: "unknown" },
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

  return NextResponse.json(checks);
}
