import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const leadSchema = z.object({
  title: z.string().min(1),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  interest: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  status: z.enum(["new", "contacted", "qualified", "unqualified"]).optional().default("new"),
  stage: z.enum(["prospecting", "qualification", "proposal", "negotiation", "closed_won", "closed_lost"]).optional().default("prospecting"),
  notes: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
});

// GET /api/leads?brandId=xxx&stage=xxx&search=xxx&page=1&limit=20
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get("brandId") || user.activeBrandId;
  const search = searchParams.get("search") || "";
  const stage = searchParams.get("stage") || "";
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = (page - 1) * limit;

  if (!brandId) return NextResponse.json({ error: "Brand ID required" }, { status: 400 });

  if (!user.isSuperAdmin) {
    const hasBrand = user.brands?.some((b: any) => b.id === brandId);
    if (!hasBrand) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const where: any = { brandId };
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { customer: { name: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (stage) where.stage = stage;
  if (status) where.status = status;

  const [leads, total] = await Promise.all([
    db.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        customer: { select: { id: true, name: true, email: true, company: true } },
        assignedTo: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    }),
    db.lead.count({ where }),
  ]);

  return NextResponse.json({ leads, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}

// POST /api/leads
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const body = await req.json();
  const brandId = body.brandId || user.activeBrandId;
  if (!brandId) return NextResponse.json({ error: "Brand ID required" }, { status: 400 });

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const lead = await db.lead.create({
    data: {
      brandId,
      createdById: user.id,
      assignedToId: parsed.data.assignedToId || user.id,
      ...parsed.data,
    },
    include: {
      customer: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, fullName: true } },
    },
  });

  await db.activity.create({
    data: {
      brandId,
      userId: user.id,
      leadId: lead.id,
      entityType: "lead",
      entityId: lead.id,
      type: "status_change",
      title: `Lead "${lead.title}" created`,
    },
  });

  await db.auditLog.create({
    data: { brandId, userId: user.id, action: "create", entity: "lead", entityId: lead.id },
  });

  return NextResponse.json(lead, { status: 201 });
}
