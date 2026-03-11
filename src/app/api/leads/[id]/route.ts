import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  externalId: z.string().optional().nullable(),
  titlePrefix: z.string().optional().nullable(),
  titlePrefixTh: z.string().optional().nullable(),
  firstName: z.string().optional().nullable(),
  firstNameTh: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  lastNameTh: z.string().optional().nullable(),
  nickname: z.string().optional().nullable(),
  sex: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  interest: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  status: z.enum(["new", "contacted", "qualified", "unqualified"]).optional(),
  stage: z.string().optional(),
  birthDate: z.string().optional().nullable(),
  idCard: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
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
  const lead = await db.lead.findUnique({
    where: { id },
    include: {
      customer: true,
      assignedTo: { select: { id: true, fullName: true, avatarUrl: true, email: true } },
      createdBy: { select: { id: true, fullName: true } },
      deals: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!checkBrandAccess(user, lead.brandId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const activities = await db.activity.findMany({
    where: { brandId: lead.brandId, entityType: "lead", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
  });

  return NextResponse.json({ ...lead, activities });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await db.lead.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!checkBrandAccess(user, existing.brandId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const lead = await db.lead.update({
    where: { id },
    data: parsed.data,
    include: {
      customer: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, fullName: true, avatarUrl: true } },
    },
  });

  if (parsed.data.stage && parsed.data.stage !== existing.stage) {
    let stageLabel = parsed.data.stage;
    try {
      const stageRecord = await db.leadStage.findUnique({ where: { id: parsed.data.stage } });
      if (stageRecord) stageLabel = stageRecord.name;
    } catch {}
    await db.activity.create({
      data: {
        brandId: lead.brandId,
        userId: user.id,
        leadId: lead.id,
        entityType: "lead",
        entityId: lead.id,
        type: "status_change",
        title: `Lead moved to ${stageLabel}`,
        metadata: { from: existing.stage, to: parsed.data.stage },
      },
    });
  }

  await db.auditLog.create({
    data: { brandId: lead.brandId, userId: user.id, action: "update", entity: "lead", entityId: id },
  });

  return NextResponse.json(lead);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const { id } = await params;
  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!checkBrandAccess(user, lead.brandId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.lead.delete({ where: { id } });

  await db.auditLog.create({
    data: { brandId: lead.brandId, userId: user.id, action: "delete", entity: "lead", entityId: id },
  });

  return NextResponse.json({ success: true });
}
