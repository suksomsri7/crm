import { NextRequest, NextResponse } from "next/server";
import { authOrApiKey } from "@/lib/api-key-auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const { id } = await params;

  const campaign = await db.campaign.findUnique({ where: { id }, select: { brandId: true } });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (!user.isSuperAdmin && !user.brands?.some((b: any) => b.id === campaign.brandId))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const stages = await db.campaignStage.findMany({
    where: { campaignId: id },
    orderBy: { order: "asc" },
    include: { _count: { select: { members: true } } },
  });

  return NextResponse.json({ stages });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const { id } = await params;

  const campaign = await db.campaign.findUnique({ where: { id }, select: { brandId: true } });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (!user.isSuperAdmin && !user.brands?.some((b: any) => b.id === campaign.brandId))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, color } = body as { name: string; color?: string };
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const maxOrder = await db.campaignStage.aggregate({
    where: { campaignId: id },
    _max: { order: true },
  });

  const stage = await db.campaignStage.create({
    data: {
      campaignId: id,
      name: name.trim(),
      color: color || null,
      order: (maxOrder._max.order ?? -1) + 1,
    },
    include: { _count: { select: { members: true } } },
  });

  return NextResponse.json(stage, { status: 201 });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const { id } = await params;

  const campaign = await db.campaign.findUnique({ where: { id }, select: { brandId: true } });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (!user.isSuperAdmin && !user.brands?.some((b: any) => b.id === campaign.brandId))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { stages } = body as { stages: { id: string; order: number; name?: string; color?: string }[] };
  if (!stages?.length) return NextResponse.json({ error: "stages array required" }, { status: 400 });

  await Promise.all(
    stages.map((s) =>
      db.campaignStage.update({
        where: { id: s.id },
        data: {
          order: s.order,
          ...(s.name !== undefined ? { name: s.name } : {}),
          ...(s.color !== undefined ? { color: s.color } : {}),
        },
      })
    )
  );

  const updated = await db.campaignStage.findMany({
    where: { campaignId: id },
    orderBy: { order: "asc" },
    include: { _count: { select: { members: true } } },
  });

  return NextResponse.json({ stages: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const { id } = await params;

  const campaign = await db.campaign.findUnique({ where: { id }, select: { brandId: true } });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (!user.isSuperAdmin && !user.brands?.some((b: any) => b.id === campaign.brandId))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const stageId = searchParams.get("stageId");
  if (!stageId) return NextResponse.json({ error: "stageId required" }, { status: 400 });

  await db.campaignStage.delete({ where: { id: stageId } });
  return NextResponse.json({ success: true });
}
