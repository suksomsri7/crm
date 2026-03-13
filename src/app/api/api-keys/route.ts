import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateApiKey } from "@/lib/api-key-auth";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  brandId: z.string().min(1),
  permissions: z.array(z.string()).default([]),
  expiresAt: z.string().datetime().optional().nullable(),
});

// GET /api/api-keys — list keys for current user (superAdmin sees all)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  if (!user.isSuperAdmin) {
    return NextResponse.json({ error: "Super admin only" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get("brandId") || undefined;

  const keys = await db.apiKey.findMany({
    where: { ...(brandId ? { brandId } : {}) },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      permissions: true,
      isActive: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
      user: { select: { id: true, fullName: true } },
      brand: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ keys });
}

// POST /api/api-keys — create a new key (superAdmin only)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  if (!user.isSuperAdmin) {
    return NextResponse.json({ error: "Super admin only" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const brand = await db.brand.findUnique({ where: { id: parsed.data.brandId } });
  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  const { raw, hash, prefix } = generateApiKey();

  const apiKey = await db.apiKey.create({
    data: {
      name: parsed.data.name,
      keyHash: hash,
      keyPrefix: prefix,
      userId: user.id,
      brandId: parsed.data.brandId,
      permissions: parsed.data.permissions,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      permissions: true,
      isActive: true,
      expiresAt: true,
      createdAt: true,
      brand: { select: { id: true, name: true } },
    },
  });

  await db.auditLog.create({
    data: { brandId: parsed.data.brandId, userId: user.id, action: "create", entity: "api_key", entityId: apiKey.id },
  });

  return NextResponse.json({ ...apiKey, key: raw }, { status: 201 });
}
