import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const activitySchema = z.object({
  entityType: z.enum(["customer", "lead", "deal", "ticket"]),
  entityId: z.string(),
  type: z.enum(["note", "call", "email", "meeting", "status_change", "assignment"]),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  metadata: z.any().optional().nullable(),
});

// GET /api/activities?brandId=xxx&entityType=customer&entityId=xxx
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get("brandId") || user.activeBrandId;
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");
  const limit = parseInt(searchParams.get("limit") || "50");

  if (!brandId) return NextResponse.json({ error: "Brand ID required" }, { status: 400 });

  const where: any = { brandId };
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;

  const activities = await db.activity.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { id: true, fullName: true, avatarUrl: true } },
    },
  });

  return NextResponse.json(activities);
}

// POST /api/activities - create a note/activity
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const body = await req.json();
  const brandId = body.brandId || user.activeBrandId;
  if (!brandId) return NextResponse.json({ error: "Brand ID required" }, { status: 400 });

  const parsed = activitySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Set the correct FK based on entity type
  const data: any = {
    brandId,
    userId: user.id,
    entityType: parsed.data.entityType,
    entityId: parsed.data.entityId,
    type: parsed.data.type,
    title: parsed.data.title,
    description: parsed.data.description,
    metadata: parsed.data.metadata,
  };

  if (parsed.data.entityType === "customer") data.customerId = parsed.data.entityId;
  if (parsed.data.entityType === "lead") data.leadId = parsed.data.entityId;

  const activity = await db.activity.create({
    data,
    include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
  });

  return NextResponse.json(activity, { status: 201 });
}
