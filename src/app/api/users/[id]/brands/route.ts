import { NextRequest, NextResponse } from "next/server";
import { authOrApiKey } from "@/lib/api-key-auth";
import { db } from "@/lib/db";
import { z } from "zod";

const assignSchema = z.object({
  brandId: z.string(),
  roleId: z.string(),
});

// POST assign user to brand with a role
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!user.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const userBrand = await db.userBrand.upsert({
    where: { userId_brandId: { userId: id, brandId: parsed.data.brandId } },
    update: { roleId: parsed.data.roleId },
    create: { userId: id, brandId: parsed.data.brandId, roleId: parsed.data.roleId },
  });

  await db.auditLog.create({
    data: {
      brandId: parsed.data.brandId, userId: user.id, action: "assign_brand", entity: "user", entityId: id,
      details: { brandId: parsed.data.brandId, roleId: parsed.data.roleId },
    },
  });

  return NextResponse.json(userBrand, { status: 201 });
}

// DELETE remove user from brand
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!user.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get("brandId");
  if (!brandId) return NextResponse.json({ error: "brandId required" }, { status: 400 });

  await db.userBrand.delete({
    where: { userId_brandId: { userId: id, brandId } },
  });

  return NextResponse.json({ success: true });
}
