import { NextRequest, NextResponse } from "next/server";
import { authOrApiKey } from "@/lib/api-key-auth";
import { db } from "@/lib/db";
import { z } from "zod";

const FALLBACK_STAGES = [
  { key: "prospecting", name: "Prospecting", color: "#3b82f6" },
  { key: "qualification", name: "Qualification", color: "#8b5cf6" },
  { key: "proposal", name: "Proposal", color: "#f59e0b" },
  { key: "negotiation", name: "Negotiation", color: "#ef4444" },
  { key: "closed_won", name: "Closed Won", color: "#22c55e" },
  { key: "closed_lost", name: "Closed Lost", color: "#6b7280" },
];

async function ensureStagesExist(brandId: string) {
  try {
    const existing = await db.leadStage.findMany({ where: { brandId }, orderBy: { order: "asc" } });
    if (existing.length > 0) return { stages: existing, useFallback: false };

    const defaults = FALLBACK_STAGES.map((s, i) => ({
      brandId,
      name: s.name,
      color: s.color,
      order: i,
    }));

    await db.leadStage.createMany({ data: defaults });
    const stages = await db.leadStage.findMany({ where: { brandId }, orderBy: { order: "asc" } });

    const stageIdByOldKey: Record<string, string> = {};
    for (const stage of stages) {
      const match = FALLBACK_STAGES.find((f) => f.name === stage.name);
      if (match) stageIdByOldKey[match.key] = stage.id;
    }
    for (const [oldKey, newId] of Object.entries(stageIdByOldKey)) {
      await db.lead.updateMany({ where: { brandId, stage: oldKey }, data: { stage: newId } });
    }

    return { stages, useFallback: false };
  } catch {
    return {
      stages: FALLBACK_STAGES.map((s, i) => ({
        id: s.key,
        brandId,
        name: s.name,
        color: s.color,
        order: i,
        createdAt: new Date(),
      })),
      useFallback: true,
    };
  }
}

function canAccessBrand(user: any, brandId: string) {
  if (user.isSuperAdmin) return true;
  return user.brands?.some((b: any) => b.id === brandId);
}

export async function GET(req: NextRequest) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const brandId = new URL(req.url).searchParams.get("brandId");
  if (!brandId) return NextResponse.json({ error: "Brand ID required" }, { status: 400 });
  if (!canAccessBrand(user, brandId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await ensureStagesExist(brandId);
  return NextResponse.json(result.stages);
}

const createSchema = z.object({
  brandId: z.string().min(1),
  name: z.string().min(1),
  color: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!user.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const maxOrder = await db.leadStage.aggregate({ where: { brandId: parsed.data.brandId }, _max: { order: true } });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const stage = await db.leadStage.create({
      data: {
        brandId: parsed.data.brandId,
        name: parsed.data.name,
        color: parsed.data.color || "#6b7280",
        order: nextOrder,
      },
    });

    return NextResponse.json(stage, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Lead stages table not available. Please run: npx prisma db push" }, { status: 500 });
  }
}

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  color: z.string().optional().nullable(),
  order: z.number().optional(),
});

const bulkUpdateSchema = z.object({
  stages: z.array(updateSchema),
});

export async function PUT(req: NextRequest) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!user.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = bulkUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const updates = parsed.data.stages.map((s) =>
      db.leadStage.update({
        where: { id: s.id },
        data: {
          ...(s.name !== undefined && { name: s.name }),
          ...(s.color !== undefined && { color: s.color }),
          ...(s.order !== undefined && { order: s.order }),
        },
      })
    );

    await db.$transaction(updates);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Lead stages table not available. Please run: npx prisma db push" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!user.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Stage ID required" }, { status: 400 });

  try {
    const stage = await db.leadStage.findUnique({ where: { id } });
    if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });

    const leadsUsingStage = await db.lead.count({ where: { stage: id } });
    if (leadsUsingStage > 0) {
      return NextResponse.json(
        { error: `Cannot delete stage "${stage.name}" — ${leadsUsingStage} lead(s) are in this stage. Move them first.` },
        { status: 400 }
      );
    }

    await db.leadStage.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Lead stages table not available. Please run: npx prisma db push" }, { status: 500 });
  }
}
