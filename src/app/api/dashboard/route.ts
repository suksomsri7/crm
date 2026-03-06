import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function groupByMonth<T extends { createdAt: Date }>(records: T[]) {
  const map = new Map<string, number>();
  for (const r of records) {
    const d = new Date(r.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get("brandId") || user.activeBrandId;
  if (!brandId && !user.isSuperAdmin) return NextResponse.json({ error: "Brand ID required" }, { status: 400 });

  const where = brandId ? { brandId } : {};

  try {
  const [
    totalCustomers,
    activeLeads,
    totalDeals,
    openDeals,
    totalVouchers,
    activeVouchers,
    totalCampaigns,
    activeCampaigns,
    recentActivities,
    dealsByStage,
    leadsByStage,
    dealRevenue,
    recentCustomers,
    recentLeads,
    voucherStats,
  ] = await Promise.all([
    db.customer.count({ where }),
    db.lead.count({ where: { ...where, stage: { notIn: ["closed_won", "closed_lost"] } } }),
    db.deal.count({ where }),
    db.deal.count({ where: { ...where, stage: { notIn: ["closed_won", "closed_lost"] } } }),
    db.voucher.count({ where }),
    db.voucher.count({ where: { ...where, status: "active" } }),
    db.campaign.count({ where }),
    db.campaign.count({ where: { ...where, status: { in: ["running", "scheduled"] } } }),
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
    db.deal.aggregate({
      where,
      _sum: { value: true },
    }),
    db.customer.findMany({
      where,
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 365,
    }),
    db.lead.findMany({
      where,
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 365,
    }),
    db.voucher.aggregate({
      where,
      _sum: { usedCount: true },
    }),
  ]);

  const wonRevenue = await db.deal.aggregate({
    where: { ...where, stage: "closed_won" },
    _sum: { value: true },
  });

  const customerMonthly = groupByMonth(recentCustomers);
  const leadMonthly = groupByMonth(recentLeads);

  const trendMonths = Array.from(
    new Set([...customerMonthly.map((c) => c.month), ...leadMonthly.map((l) => l.month)])
  ).sort();
  const customerMap = new Map(customerMonthly.map((c) => [c.month, c.count]));
  const leadMap = new Map(leadMonthly.map((l) => [l.month, l.count]));
  const monthlyTrend = trendMonths.map((month) => ({
    month,
    customers: customerMap.get(month) || 0,
    leads: leadMap.get(month) || 0,
  }));

  return NextResponse.json({
    stats: {
      totalCustomers,
      activeLeads,
      totalDeals,
      openDeals,
      totalVouchers,
      activeVouchers,
      totalCampaigns,
      activeCampaigns,
      totalRevenue: dealRevenue._sum.value || 0,
      wonRevenue: wonRevenue._sum.value || 0,
      totalVoucherUsed: voucherStats._sum.usedCount || 0,
    },
    recentActivities,
    dealsByStage,
    leadsByStage,
    monthlyTrend,
  });
  } catch (error) {
    console.error("[dashboard] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
