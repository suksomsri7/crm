import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["email", "sms", "social"]).optional(),
  status: z.enum(["draft", "scheduled", "running", "completed", "paused"]).optional(),
  subject: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  targetSegment: z.any().optional().nullable(),
  budget: z.number().min(0).optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
});

function canAccessBrand(user: { isSuperAdmin?: boolean; brands?: { id: string }[] }, brandId: string): boolean {
  if (user.isSuperAdmin) return true;
  return user.brands?.some((b) => b.id === brandId) ?? false;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string; isSuperAdmin?: boolean; brands?: { id: string }[] };

  const { id } = await params;

  const campaign = await db.campaign.findUnique({ where: { id } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canAccessBrand(user, campaign.brandId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(campaign);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string; isSuperAdmin?: boolean; brands?: { id: string }[] };

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await db.campaign.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canAccessBrand(user, existing.brandId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.type !== undefined) data.type = parsed.data.type;
  if (parsed.data.status !== undefined) data.status = parsed.data.status;
  if (parsed.data.subject !== undefined) data.subject = parsed.data.subject;
  if (parsed.data.content !== undefined) data.content = parsed.data.content;
  if (parsed.data.targetSegment !== undefined) data.targetSegment = parsed.data.targetSegment;
  if (parsed.data.budget !== undefined) data.budget = parsed.data.budget;
  if (parsed.data.scheduledAt !== undefined) {
    data.scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null;
  }

  const campaign = await db.campaign.update({ where: { id }, data });

  await db.auditLog.create({
    data: { brandId: existing.brandId, userId: user.id, action: "update", entity: "campaign", entityId: id },
  });

  return NextResponse.json(campaign);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string; isSuperAdmin?: boolean; brands?: { id: string }[] };

  const { id } = await params;
  const campaign = await db.campaign.findUnique({ where: { id } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canAccessBrand(user, campaign.brandId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.campaign.delete({ where: { id } });

  await db.auditLog.create({
    data: { brandId: campaign.brandId, userId: user.id, action: "delete", entity: "campaign", entityId: id },
  });

  return NextResponse.json({ success: true });
}
