import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";

const updateSchema = z.object({
  fullName: z.string().min(1).optional(),
  username: z.string().min(3).optional(),
  email: z.string().email().optional().or(z.literal("")),
  password: z.string().min(8).optional(),
  isActive: z.boolean().optional(),
  isSuperAdmin: z.boolean().optional(),
});

// PUT update user
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!user.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data: any = { ...parsed.data };
  if (data.password) {
    data.password = await bcrypt.hash(data.password, 12);
  }

  const updated = await db.user.update({
    where: { id },
    data,
    select: { id: true, username: true, email: true, fullName: true, isSuperAdmin: true, isActive: true },
  });

  await db.auditLog.create({
    data: { userId: user.id, action: "update", entity: "user", entityId: id },
  });

  return NextResponse.json(updated);
}

// DELETE user
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!user.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (id === user.id) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });

  await db.user.delete({ where: { id } });

  await db.auditLog.create({
    data: { userId: user.id, action: "delete", entity: "user", entityId: id },
  });

  return NextResponse.json({ success: true });
}
