import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const dealSchema = z.object({
  title: z.string().min(1),
  value: z.number(),
  stage: z.enum(["proposal", "negotiation", "contract", "closed_won", "closed_lost"]).optional().default("proposal"),
  probability: z.number().min(0).max(100).optional().default(50),
  expectedCloseDate: z.union([z.string(), z.date()]).optional().nullable(),
  leadId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// GET /api/deals?brandId=xxx&stage=xxx&search=xxx&page=1&limit=20
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get("brandId") || user.activeBrandId;
  const stage = searchParams.get("stage") || "";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = (page - 1) * limit;

  if (!brandId) return NextResponse.json({ error: "Brand ID required" }, { status: 400 });

  if (!user.isSuperAdmin) {
    const hasBrand = user.brands?.some((b: any) => b.id === brandId);
    if (!hasBrand) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const where: any = { brandId };
  if (stage) where.stage = stage;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { customer: { name: { contains: search, mode: "insensitive" } } },
      { lead: { title: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [deals, total] = await Promise.all([
    db.deal.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
      include: {
        customer: { select: { id: true, name: true, email: true, company: true } },
        lead: { select: { id: true, title: true, stage: true } },
        openedBy: { select: { id: true, fullName: true } },
        closedBy: { select: { id: true, fullName: true } },
      },
    }),
    db.deal.count({ where }),
  ]);

  return NextResponse.json({ deals, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}

// POST /api/deals
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const body = await req.json();
  const brandId = body.brandId || user.activeBrandId;
  if (!brandId) return NextResponse.json({ error: "Brand ID required" }, { status: 400 });

  const parsed = dealSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const dealData: any = {
    brandId,
    title: parsed.data.title,
    value: parsed.data.value,
    stage: parsed.data.stage,
    probability: parsed.data.probability,
    leadId: parsed.data.leadId,
    customerId: parsed.data.customerId,
    notes: parsed.data.notes,
    openedById: user.id,
    openedAt: new Date(),
  };
  if (parsed.data.expectedCloseDate !== undefined && parsed.data.expectedCloseDate !== null) {
    dealData.expectedCloseDate = new Date(parsed.data.expectedCloseDate);
  }

  const deal = await db.deal.create({
    data: dealData,
    include: {
      customer: { select: { id: true, name: true } },
      lead: { select: { id: true, title: true } },
      openedBy: { select: { id: true, fullName: true } },
      closedBy: { select: { id: true, fullName: true } },
    },
  });

  await db.auditLog.create({
    data: { brandId, userId: user.id, action: "create", entity: "deal", entityId: deal.id },
  });

  return NextResponse.json(deal, { status: 201 });
}
