import { NextRequest, NextResponse } from "next/server";
import { authOrApiKey } from "@/lib/api-key-auth";
import { db } from "@/lib/db";

function formatStage(stage: string): string {
  return stage
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function groupByMonth<T extends { createdAt: Date }>(
  records: T[],
  valueFn?: (r: T) => number
) {
  const map = new Map<string, { month: string; count: number; value: number }>();
  for (const r of records) {
    const d = new Date(r.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = map.get(key) || { month: key, count: 0, value: 0 };
    entry.count += 1;
    if (valueFn) entry.value += valueFn(r);
    map.set(key, entry);
  }
  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
}

// ── Sales Report ─────────────────────────────────────────────
async function getSalesReport(where: Record<string, unknown>) {
  const [deals, dealsByStage] = await Promise.all([
    db.deal.findMany({
      where,
      select: { value: true, stage: true, createdAt: true, openedAt: true, closedAt: true },
    }),
    db.deal.groupBy({
      by: ["stage"],
      where,
      _sum: { value: true },
      _count: true,
    }),
  ]);

  const monthly = groupByMonth(deals, (d) => d.value);
  const totalRevenue = deals.reduce((sum, d) => sum + d.value, 0);
  const closedWonRevenue = deals
    .filter((d) => d.stage === "closed_won")
    .reduce((sum, d) => sum + d.value, 0);
  const dealCount = deals.length;
  const avgDealSize = dealCount > 0 ? totalRevenue / dealCount : 0;
  const closedWon = deals.filter((d) => d.stage === "closed_won").length;
  const closedLost = deals.filter((d) => d.stage === "closed_lost").length;
  const openDeals = deals.filter(
    (d) => d.stage !== "closed_won" && d.stage !== "closed_lost"
  ).length;
  const winRate =
    closedWon + closedLost > 0
      ? (closedWon / (closedWon + closedLost)) * 100
      : 0;

  return {
    type: "sales",
    summary: {
      totalRevenue,
      closedWonRevenue,
      dealCount,
      openDeals,
      closedWon,
      closedLost,
      avgDealSize: Math.round(avgDealSize * 100) / 100,
      winRate: Math.round(winRate * 10) / 10,
    },
    monthly,
    dealsByStage: dealsByStage.map((d) => ({
      stage: formatStage(d.stage),
      count: d._count,
      value: d._sum.value || 0,
    })),
  };
}

// ── Customers Report ─────────────────────────────────────────
async function getCustomersReport(where: Record<string, unknown>) {
  const [customers, totalCount, statusBreakdown, sourceBreakdown, stageBreakdown] =
    await Promise.all([
      db.customer.findMany({
        where,
        select: { createdAt: true },
      }),
      db.customer.count({ where }),
      db.customer.groupBy({
        by: ["status"],
        where,
        _count: true,
      }),
      db.customer.groupBy({
        by: ["source"],
        where,
        _count: true,
      }),
      db.customer.groupBy({
        by: ["stage"],
        where,
        _count: true,
      }),
    ]);

  const monthly = groupByMonth(customers);

  return {
    type: "customers",
    summary: { totalCount },
    monthly,
    statusBreakdown: statusBreakdown.map((s) => ({
      status: formatStage(s.status),
      count: s._count,
    })),
    sourceBreakdown: sourceBreakdown.map((s) => ({
      source: s.source ? formatStage(s.source) : "Unknown",
      count: s._count,
    })),
    stageBreakdown: stageBreakdown.map((s) => ({
      stage: s.stage ? formatStage(s.stage) : "Unknown",
      count: s._count,
    })),
  };
}

// ── Leads Report ─────────────────────────────────────────────
async function getLeadsReport(where: Record<string, unknown>) {
  const [leads, stageBreakdown, sourceBreakdown] = await Promise.all([
    db.lead.findMany({
      where,
      select: { createdAt: true, stage: true, source: true },
    }),
    db.lead.groupBy({
      by: ["stage"],
      where,
      _count: true,
    }),
    db.lead.groupBy({
      by: ["source"],
      where,
      _count: true,
    }),
  ]);

  const monthly = groupByMonth(leads);
  const totalLeads = leads.length;
  const closedWon = leads.filter((l) => l.stage === "closed_won").length;
  const qualified = leads.filter((l) => l.stage === "qualification" || l.stage === "proposal" || l.stage === "negotiation" || l.stage === "closed_won").length;
  const conversionRate =
    totalLeads > 0 ? (closedWon / totalLeads) * 100 : 0;
  const qualificationRate =
    totalLeads > 0 ? (qualified / totalLeads) * 100 : 0;

  return {
    type: "leads",
    summary: {
      totalLeads,
      closedWon,
      qualified,
      conversionRate: Math.round(conversionRate * 10) / 10,
      qualificationRate: Math.round(qualificationRate * 10) / 10,
    },
    monthly,
    stageBreakdown: stageBreakdown.map((s) => ({
      stage: formatStage(s.stage),
      count: s._count,
    })),
    sourceBreakdown: sourceBreakdown.map((s) => ({
      source: s.source ? formatStage(s.source) : "Unknown",
      count: s._count,
    })),
  };
}

// ── Vouchers Report ──────────────────────────────────────────
async function getVouchersReport(where: Record<string, unknown>) {
  const [vouchers, statusBreakdown, typeBreakdown, customerVouchers] =
    await Promise.all([
      db.voucher.findMany({
        where,
        select: {
          id: true,
          value: true,
          type: true,
          status: true,
          usageLimit: true,
          usedCount: true,
          createdAt: true,
        },
      }),
      db.voucher.groupBy({
        by: ["status"],
        where,
        _count: true,
      }),
      db.voucher.groupBy({
        by: ["type"],
        where,
        _count: true,
      }),
      db.customerVoucher.findMany({
        where: {
          voucher: where,
        },
        select: { status: true, quantity: true, createdAt: true },
      }),
    ]);

  const monthly = groupByMonth(vouchers);
  const totalVouchers = vouchers.length;
  const activeVouchers = vouchers.filter((v) => v.status === "active").length;
  const totalUsed = vouchers.reduce((sum, v) => sum + v.usedCount, 0);
  const totalAssigned = customerVouchers.reduce((sum, cv) => sum + cv.quantity, 0);
  const totalValue = vouchers.reduce((sum, v) => sum + (v.value || 0), 0);

  const assignmentMonthly = groupByMonth(
    customerVouchers.map((cv) => ({ createdAt: cv.createdAt }))
  );

  return {
    type: "vouchers",
    summary: {
      totalVouchers,
      activeVouchers,
      totalAssigned,
      totalUsed,
      totalValue: Math.round(totalValue * 100) / 100,
    },
    monthly,
    assignmentMonthly,
    statusBreakdown: statusBreakdown.map((s) => ({
      status: formatStage(s.status),
      count: s._count,
    })),
    typeBreakdown: typeBreakdown.map((t) => ({
      type: formatStage(t.type),
      count: t._count,
    })),
  };
}

// ── Campaigns Report ─────────────────────────────────────────
async function getCampaignsReport(where: Record<string, unknown>) {
  const [campaigns, statusBreakdown, typeBreakdown] = await Promise.all([
    db.campaign.findMany({
      where,
      select: {
        id: true,
        name: true,
        status: true,
        type: true,
        createdAt: true,
        _count: { select: { members: true, stages: true } },
      },
    }),
    db.campaign.groupBy({
      by: ["status"],
      where,
      _count: true,
    }),
    db.campaign.groupBy({
      by: ["type"],
      where,
      _count: true,
    }),
  ]);

  const monthly = groupByMonth(campaigns);
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter(
    (c) => c.status === "running" || c.status === "scheduled"
  ).length;
  const totalMembers = campaigns.reduce((sum, c) => sum + c._count.members, 0);

  const campaignIds = campaigns.map((c) => c.id);

  let membersByViaRaw: any[] = [];
  if (campaignIds.length > 0) {
    membersByViaRaw = await (db.campaignMember.groupBy as any)({
      by: ["addedVia"],
      where: { campaignId: { in: campaignIds } },
      _count: true,
    });
  }

  const topCampaigns = campaigns
    .sort((a, b) => b._count.members - a._count.members)
    .slice(0, 10)
    .map((c) => ({ name: c.name, members: c._count.members, status: c.status }));

  return {
    type: "campaigns",
    summary: {
      totalCampaigns,
      activeCampaigns,
      totalMembers,
    },
    monthly,
    statusBreakdown: statusBreakdown.map((s) => ({
      status: formatStage(s.status),
      count: s._count,
    })),
    typeBreakdown: typeBreakdown.map((t) => ({
      type: formatStage(t.type),
      count: t._count,
    })),
    membersByVia: membersByViaRaw.map((m: any) => ({
      via: formatStage(m.addedVia),
      count: m._count,
    })),
    topCampaigns,
  };
}

export async function GET(req: NextRequest) {
  const session = await authOrApiKey(req);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get("brandId") || user.activeBrandId;
  if (!brandId)
    return NextResponse.json({ error: "Brand ID required" }, { status: 400 });

  const type = searchParams.get("type") || "sales";
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where: Record<string, unknown> = { brandId };
  if (dateFrom || dateTo) {
    const createdAt: Record<string, Date> = {};
    if (dateFrom) createdAt.gte = new Date(dateFrom);
    if (dateTo) createdAt.lte = new Date(dateTo + "T23:59:59.999Z");
    where.createdAt = createdAt;
  }

  try {
    switch (type) {
      case "sales":
        return NextResponse.json(await getSalesReport(where));
      case "customers":
        return NextResponse.json(await getCustomersReport(where));
      case "leads":
        return NextResponse.json(await getLeadsReport(where));
      case "vouchers":
        return NextResponse.json(await getVouchersReport(where));
      case "campaigns":
        return NextResponse.json(await getCampaignsReport(where));
      default:
        return NextResponse.json(
          { error: "Invalid report type" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[reports] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
