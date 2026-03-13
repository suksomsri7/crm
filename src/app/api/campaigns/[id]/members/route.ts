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

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const stageId = searchParams.get("stageId") || "";
  const type = searchParams.get("type") || "";

  const where: any = { campaignId: id };
  if (stageId) where.stageId = stageId === "__none__" ? null : stageId;
  if (type === "lead") { where.leadId = { not: null }; where.customerId = null; }
  if (type === "customer") { where.customerId = { not: null }; where.leadId = null; }

  if (search) {
    where.OR = [
      { customer: { OR: [{ firstName: { contains: search, mode: "insensitive" } }, { lastName: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }, { phone: { contains: search, mode: "insensitive" } }] } },
      { lead: { OR: [{ firstName: { contains: search, mode: "insensitive" } }, { lastName: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }, { phone: { contains: search, mode: "insensitive" } }] } },
    ];
  }

  const members = await db.campaignMember.findMany({
    where,
    orderBy: { addedAt: "desc" },
    include: {
      customer: { select: { id: true, name: true, firstName: true, lastName: true, email: true, phone: true } },
      lead: { select: { id: true, title: true, firstName: true, lastName: true, email: true, phone: true } },
      stage: { select: { id: true, name: true, color: true } },
      addedBy: { select: { id: true, fullName: true } },
      _count: { select: { checklists: true, comments: true, attachments: true } },
    },
  });

  return NextResponse.json({ members });
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
  const { customerIds, leadIds, stageId } = body as { customerIds?: string[]; leadIds?: string[]; stageId?: string };

  let added = 0;
  let skipped = 0;

  if (customerIds?.length) {
    for (const customerId of customerIds) {
      try {
        await db.campaignMember.create({
          data: { campaignId: id, customerId, stageId: stageId || null, addedById: user.id, addedVia: "add" },
        });
        added++;
      } catch {
        skipped++;
      }
    }
  }

  if (leadIds?.length) {
    for (const leadId of leadIds) {
      try {
        await db.campaignMember.create({
          data: { campaignId: id, leadId, stageId: stageId || null, addedById: user.id, addedVia: "add" },
        });
        added++;
      } catch {
        skipped++;
      }
    }
  }

  return NextResponse.json({ added, skipped }, { status: 201 });
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

  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });

  const body = await req.json();
  const { stageId, status, notes, description, priority, dueDate, labels } = body as {
    stageId?: string | null; status?: string; notes?: string;
    description?: string | null; priority?: string; dueDate?: string | null; labels?: string[] | null;
  };

  const data: any = {};
  if (stageId !== undefined) data.stageId = stageId;
  if (status) data.status = status;
  if (notes !== undefined) data.notes = notes;
  if (description !== undefined) data.description = description;
  if (priority !== undefined) data.priority = priority;
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
  if (labels !== undefined) data.labels = labels;

  const member = await db.campaignMember.update({
    where: { id: memberId },
    data,
    include: {
      customer: { select: { id: true, name: true, firstName: true, lastName: true, email: true, phone: true } },
      lead: { select: { id: true, title: true, firstName: true, lastName: true, email: true, phone: true } },
      stage: { select: { id: true, name: true, color: true } },
      addedBy: { select: { id: true, fullName: true } },
    },
  });

  return NextResponse.json(member);
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
  const memberId = searchParams.get("memberId");
  if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });

  await db.campaignMember.delete({ where: { id: memberId } });
  return NextResponse.json({ success: true });
}
