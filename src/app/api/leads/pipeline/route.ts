import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const FALLBACK_STAGES = [
  { key: "prospecting", name: "Prospecting", color: "#3b82f6" },
  { key: "qualification", name: "Qualification", color: "#8b5cf6" },
  { key: "proposal", name: "Proposal", color: "#f59e0b" },
  { key: "negotiation", name: "Negotiation", color: "#ef4444" },
  { key: "closed_won", name: "Closed Won", color: "#22c55e" },
  { key: "closed_lost", name: "Closed Lost", color: "#6b7280" },
];

async function getStagesWithMigration(brandId: string) {
  try {
    const existing = await db.leadStage.findMany({ where: { brandId }, orderBy: { order: "asc" } });

    if (existing.length > 0) return { stages: existing, mode: "db" as const };

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

    return { stages, mode: "db" as const };
  } catch {
    return { stages: null, mode: "fallback" as const };
  }
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

  const leads = await db.lead.findMany({
    where: { brandId, status: { not: "converted" } },
    orderBy: { updatedAt: "desc" },
    include: {
      customer: { select: { id: true, name: true, company: true } },
      assignedTo: { select: { id: true, fullName: true, avatarUrl: true } },
    },
  });

  const result = await getStagesWithMigration(brandId);

  if (result.mode === "db" && result.stages) {
    const pipeline = result.stages.map((stage) => ({
      stage: stage.id,
      label: stage.name,
      color: stage.color,
      leads: leads.filter((l) => l.stage === stage.id),
      count: leads.filter((l) => l.stage === stage.id).length,
    }));
    return NextResponse.json(pipeline);
  }

  const pipeline = FALLBACK_STAGES.map((s) => ({
    stage: s.key,
    label: s.name,
    color: s.color,
    leads: leads.filter((l) => l.stage === s.key),
    count: leads.filter((l) => l.stage === s.key).length,
  }));
  return NextResponse.json(pipeline);
}
