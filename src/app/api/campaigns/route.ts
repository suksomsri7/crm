import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const campaignSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["email", "sms", "social"]),
  status: z.enum(["draft", "scheduled", "running", "completed", "paused"]).optional().default("draft"),
  subject: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  targetSegment: z.any().optional().nullable(),
  budget: z.number().min(0).optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
});

// GET /api/campaigns?brandId=xxx&search=xxx&status=xxx&type=xxx&page=1&limit=20
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string; isSuperAdmin?: boolean; brands?: { id: string }[]; activeBrandId?: string };

  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get("brandId") || user.activeBrandId;
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const type = searchParams.get("type") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  if (!brandId) return NextResponse.json({ error: "Brand ID required" }, { status: 400 });

  if (!user.isSuperAdmin) {
    const hasBrand = user.brands?.some((b) => b.id === brandId);
    if (!hasBrand) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const where: Record<string, unknown> = { brandId };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" as const } },
      { subject: { contains: search, mode: "insensitive" as const } },
    ];
  }

  if (status) where.status = status;
  if (type) where.type = type;

  const [campaigns, total] = await Promise.all([
    db.campaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.campaign.count({ where }),
  ]);

  return NextResponse.json({
    campaigns,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// POST /api/campaigns
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string; isSuperAdmin?: boolean; brands?: { id: string }[]; activeBrandId?: string };

  const body = await req.json();
  const brandId = (body.brandId as string) || user.activeBrandId;
  if (!brandId) return NextResponse.json({ error: "Brand ID required" }, { status: 400 });

  if (!user.isSuperAdmin) {
    const hasBrand = user.brands?.some((b) => b.id === brandId);
    if (!hasBrand) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = campaignSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const campaign = await db.campaign.create({
    data: {
      brandId,
      name: parsed.data.name,
      type: parsed.data.type,
      status: parsed.data.status,
      subject: parsed.data.subject ?? null,
      content: parsed.data.content ?? null,
      targetSegment: parsed.data.targetSegment ?? undefined,
      budget: parsed.data.budget ?? null,
      scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
    },
  });

  await db.auditLog.create({
    data: { brandId, userId: user.id, action: "create", entity: "campaign", entityId: campaign.id },
  });

  return NextResponse.json(campaign, { status: 201 });
}
