import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  value: z.number().optional(),
  stage: z.enum(["proposal", "negotiation", "contract", "closed_won", "closed_lost"]).optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.union([z.string(), z.date()]).optional().nullable(),
  leadId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

function checkBrandAccess(user: any, brandId: string) {
  if (!brandId) return false;
  if (user.isSuperAdmin) return true;
  return user.brands?.some((b: any) => b.id === brandId);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const { id } = await params;
  const deal = await db.deal.findUnique({
    where: { id },
    include: {
      customer: true,
      lead: { include: { assignedTo: { select: { id: true, fullName: true, avatarUrl: true } } } },
    },
  });

  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!checkBrandAccess(user, deal.brandId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(deal);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await db.deal.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!checkBrandAccess(user, existing.brandId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updateData: any = { ...parsed.data };
  if (parsed.data.expectedCloseDate !== undefined) {
    updateData.expectedCloseDate = parsed.data.expectedCloseDate ? new Date(parsed.data.expectedCloseDate) : null;
  }
  if (parsed.data.stage === "closed_won" || parsed.data.stage === "closed_lost") {
    updateData.closedAt = new Date();
  }

  const deal = await db.deal.update({
    where: { id },
    data: updateData,
    include: {
      customer: { select: { id: true, name: true } },
      lead: { select: { id: true, title: true } },
    },
  });

  await db.auditLog.create({
    data: { brandId: deal.brandId, userId: user.id, action: "update", entity: "deal", entityId: id },
  });

  return NextResponse.json(deal);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const { id } = await params;
  const deal = await db.deal.findUnique({ where: { id } });
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!checkBrandAccess(user, deal.brandId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.deal.delete({ where: { id } });

  await db.auditLog.create({
    data: { brandId: deal.brandId, userId: user.id, action: "delete", entity: "deal", entityId: id },
  });

  return NextResponse.json({ success: true });
}
