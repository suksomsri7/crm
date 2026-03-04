import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  dueDate: z.string().optional().nullable(), // ISO date string
  assigneeId: z.string().optional().nullable(),
});

function checkBrandAccess(user: any, brandId: string): boolean {
  if (!brandId) return false;
  if (user.isSuperAdmin) return true;
  return user.brands?.some((b: any) => b.id === brandId);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const { id } = await params;

  const task = await db.task.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, fullName: true, avatarUrl: true } },
      createdBy: { select: { id: true, fullName: true } },
    },
  });

  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!checkBrandAccess(user, task.brandId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(task);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await db.task.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!checkBrandAccess(user, existing.brandId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updateData: any = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.priority !== undefined) updateData.priority = parsed.data.priority;
  if (parsed.data.dueDate !== undefined) updateData.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
  if (parsed.data.assigneeId !== undefined) updateData.assigneeId = parsed.data.assigneeId;

  const task = await db.task.update({
    where: { id },
    data: updateData,
    include: {
      assignee: { select: { id: true, fullName: true, avatarUrl: true } },
      createdBy: { select: { id: true, fullName: true } },
    },
  });

  // Audit log - include status change details when status changed
  const auditDetails = parsed.data.status && parsed.data.status !== existing.status
    ? { from: existing.status, to: parsed.data.status }
    : undefined;

  await db.auditLog.create({
    data: {
      brandId: existing.brandId,
      userId: user.id,
      action: "update",
      entity: "task",
      entityId: id,
      details: auditDetails,
    },
  });

  return NextResponse.json(task);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const { id } = await params;
  const task = await db.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!checkBrandAccess(user, task.brandId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.task.delete({ where: { id } });

  await db.auditLog.create({
    data: {
      brandId: task.brandId,
      userId: user.id,
      action: "delete",
      entity: "task",
      entityId: id,
    },
  });

  return NextResponse.json({ success: true });
}
