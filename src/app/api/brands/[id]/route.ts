import { NextRequest, NextResponse } from "next/server";
import { authOrApiKey } from "@/lib/api-key-auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  logoUrl: z.string().url().optional().nullable(),
  domain: z.string().optional().nullable(),
  settings: z.any().optional().nullable(),
  isActive: z.boolean().optional(),
});

// GET single brand
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!user.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const brand = await db.brand.findUnique({
    where: { id },
    include: {
      roles: { include: { rolePermissions: { include: { permission: true } } } },
      userBrands: { include: { user: { select: { id: true, fullName: true, email: true } }, role: true } },
      _count: { select: { customers: true, leads: true, deals: true, tickets: true } },
    },
  });

  if (!brand) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(brand);
}

// PUT update brand
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!user.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const brand = await db.brand.update({
    where: { id },
    data: parsed.data,
  });

  await db.auditLog.create({
    data: { brandId: id, userId: user.id, action: "update", entity: "brand", entityId: id, details: parsed.data },
  });

  return NextResponse.json(brand);
}

// DELETE brand
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!user.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await db.brand.delete({ where: { id } });

  await db.auditLog.create({
    data: { userId: user.id, action: "delete", entity: "brand", entityId: id },
  });

  return NextResponse.json({ success: true });
}
