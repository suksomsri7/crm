import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get("brandId") || user.activeBrandId;
  if (!brandId && !user.isSuperAdmin) return NextResponse.json({ error: "Brand ID required" }, { status: 400 });

  const where = brandId ? { brandId } : {};

  const [
    totalCustomers,
    activeLeads,
    openDeals,
    openTickets,
    recentActivities,
    dealsByStage,
    leadsByStage,
    ticketsByPriority,
  ] = await Promise.all([
    db.customer.count({ where }),
    db.lead.count({ where: { ...where, stage: { notIn: ["closed_won", "closed_lost"] } } }),
    db.deal.count({ where: { ...where, stage: { notIn: ["closed_won", "closed_lost"] } } }),
    db.ticket.count({ where: { ...where, status: { in: ["open", "in_progress", "waiting"] } } }),
    db.activity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
    }),
    db.deal.groupBy({
      by: ["stage"],
      where,
      _sum: { value: true },
      _count: true,
    }),
    db.lead.groupBy({
      by: ["stage"],
      where,
      _count: true,
    }),
    db.ticket.groupBy({
      by: ["priority"],
      where,
      _count: true,
    }),
  ]);

  return NextResponse.json({
    stats: { totalCustomers, activeLeads, openDeals, openTickets },
    recentActivities,
    dealsByStage,
    leadsByStage,
    ticketsByPriority,
  });
}
