import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  subject: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  status: z.enum(["open", "in_progress", "waiting", "resolved", "closed"]).optional(),
  category: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
});

function canAccessBrand(user: { isSuperAdmin?: boolean; brands?: { id: string }[] }, brandId: string): boolean {
  if (user.isSuperAdmin) return true;
  return user.brands?.some((b) => b.id === brandId) ?? false;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const { id } = await params;

  const ticket = await db.ticket.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true } },
      assignee: { select: { id: true, fullName: true } },
    },
  });

  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canAccessBrand(user, ticket.brandId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(ticket);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await db.ticket.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canAccessBrand(user, existing.brandId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data: any = { ...parsed.data };
  if (parsed.data.status === "resolved" && existing.status !== "resolved") {
    data.resolvedAt = new Date();
  }

  const ticket = await db.ticket.update({
    where: { id },
    data,
    include: {
      customer: { select: { id: true, name: true } },
      assignee: { select: { id: true, fullName: true } },
    },
  });

  await db.auditLog.create({
    data: { brandId: ticket.brandId, userId: user.id, action: "update", entity: "ticket", entityId: id },
  });

  return NextResponse.json(ticket);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const { id } = await params;
  const ticket = await db.ticket.findUnique({ where: { id } });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canAccessBrand(user, ticket.brandId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.ticket.delete({ where: { id } });

  await db.auditLog.create({
    data: { brandId: ticket.brandId, userId: user.id, action: "delete", entity: "ticket", entityId: id },
  });

  return NextResponse.json({ success: true });
}
