import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const OLD_STAGE_MAP: Record<string, { name: string; color: string }> = {
  prospecting: { name: "Prospecting", color: "#3b82f6" },
  qualification: { name: "Qualification", color: "#8b5cf6" },
  proposal: { name: "Proposal", color: "#f59e0b" },
  negotiation: { name: "Negotiation", color: "#ef4444" },
  closed_won: { name: "Closed Won", color: "#22c55e" },
  closed_lost: { name: "Closed Lost", color: "#6b7280" },
};

async function ensureStagesExist(brandId: string) {
  const existing = await db.leadStage.findMany({ where: { brandId }, orderBy: { order: "asc" } });
  if (existing.length > 0) return existing;

  const defaults = Object.entries(OLD_STAGE_MAP).map(([key, val], i) => ({
    brandId,
    name: val.name,
    color: val.color,
    order: i,
  }));

  await db.leadStage.createMany({ data: defaults });
  const stages = await db.leadStage.findMany({ where: { brandId }, orderBy: { order: "asc" } });

  const stageIdByOldKey: Record<string, string> = {};
  for (const stage of stages) {
    const oldKey = Object.entries(OLD_STAGE_MAP).find(([, v]) => v.name === stage.name)?.[0];
    if (oldKey) stageIdByOldKey[oldKey] = stage.id;
  }

  for (const [oldKey, newId] of Object.entries(stageIdByOldKey)) {
    await db.lead.updateMany({
      where: { brandId, stage: oldKey },
      data: { stage: newId },
    });
  }

  return stages;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get("brandId") || user.activeBrandId;
  if (!brandId) return NextResponse.json({ error: "Brand ID required" }, { status: 400 });

  if (!user.isSuperAdmin) {
    const hasBrand = user.brands?.some((b: any) => b.id === brandId);
    if (!hasBrand) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stages = await ensureStagesExist(brandId);

  const leads = await db.lead.findMany({
    where: { brandId, status: { not: "converted" } },
    orderBy: { updatedAt: "desc" },
    include: {
      customer: { select: { id: true, name: true, company: true } },
      assignedTo: { select: { id: true, fullName: true, avatarUrl: true } },
    },
  });

  const pipeline = stages.map((stage) => ({
    stage: stage.id,
    label: stage.name,
    color: stage.color,
    leads: leads.filter((l) => l.stage === stage.id),
    count: leads.filter((l) => l.stage === stage.id).length,
  }));

  return NextResponse.json(pipeline);
}
