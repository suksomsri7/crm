import { NextRequest, NextResponse } from "next/server";
import { authOrApiKey } from "@/lib/api-key-auth";
import { db } from "@/lib/db";
import { z } from "zod";

const campaignSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["email", "sms", "social", "event", "custom"]).optional().default("custom"),
  status: z.enum(["draft", "scheduled", "running", "completed", "paused"]).optional().default("draft"),
  subject: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  targetSegment: z.any().optional().nullable(),
  budget: z.number().min(0).optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
});

// GET /api/campaigns?brandId=xxx&search=xxx&status=xxx&type=xxx&page=1&limit=20
export async function GET(req: NextRequest) {
  const session = await authOrApiKey(req);
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
      include: {
        createdBy: { select: { id: true, fullName: true } },
        _count: { select: { members: true, stages: true } },
      },
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
  const session = await authOrApiKey(req);
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
      createdById: user.id,
      name: parsed.data.name,
      type: parsed.data.type,
      status: parsed.data.status,
      subject: parsed.data.subject ?? null,
      content: parsed.data.content ?? null,
      targetSegment: parsed.data.targetSegment ?? undefined,
      budget: parsed.data.budget ?? null,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
    },
  });

  const defaultStages: Record<string, string[]> = {
    email: ["Targeted", "Sent", "Opened", "Clicked", "Converted"],
    sms: ["Targeted", "Sent", "Responded", "Converted"],
    social: ["Targeted", "Reached", "Engaged", "Converted"],
    event: ["Invited", "Registered", "Attended", "Follow-up", "Converted"],
    custom: ["New", "In Progress", "Completed"],
  };

  const stages = defaultStages[parsed.data.type] || defaultStages.custom;
  await db.campaignStage.createMany({
    data: stages.map((name, i) => ({ campaignId: campaign.id, name, order: i })),
  });

  await db.auditLog.create({
    data: { brandId, userId: user.id, action: "create", entity: "campaign", entityId: campaign.id },
  });

  return NextResponse.json(campaign, { status: 201 });
}
