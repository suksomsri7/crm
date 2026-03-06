import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const STAGES = ["prospecting", "qualification", "proposal", "negotiation", "closed_won", "closed_lost"];

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

  const pipeline = STAGES.map(stage => ({
    stage,
    label: stage.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
    leads: leads.filter(l => l.stage === stage),
    count: leads.filter(l => l.stage === stage).length,
  }));

  return NextResponse.json(pipeline);
}
