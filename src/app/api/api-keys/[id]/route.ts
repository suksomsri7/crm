import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

// GET /api/api-keys/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!user.isSuperAdmin) return NextResponse.json({ error: "Super admin only" }, { status: 403 });

  const { id } = await params;

  const apiKey = await db.apiKey.findUnique({
    where: { id },
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

  if (!apiKey) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(apiKey);
}

// PUT /api/api-keys/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!user.isSuperAdmin) return NextResponse.json({ error: "Super admin only" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await db.apiKey.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db.apiKey.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.permissions !== undefined && { permissions: parsed.data.permissions }),
      ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
      ...(parsed.data.expiresAt !== undefined && { expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null }),
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      permissions: true,
      isActive: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
      brand: { select: { id: true, name: true } },
    },
  });

  await db.auditLog.create({
    data: { brandId: existing.brandId, userId: user.id, action: "update", entity: "api_key", entityId: id },
  });

  return NextResponse.json(updated);
}

// DELETE /api/api-keys/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!user.isSuperAdmin) return NextResponse.json({ error: "Super admin only" }, { status: 403 });

  const { id } = await params;

  const existing = await db.apiKey.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.apiKey.delete({ where: { id } });

  await db.auditLog.create({
    data: { brandId: existing.brandId, userId: user.id, action: "delete", entity: "api_key", entityId: id },
  });

  return NextResponse.json({ success: true });
}
