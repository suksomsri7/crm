import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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

async function getSalesReport(where: Record<string, unknown>) {
  const [deals, dealsByStage] = await Promise.all([
    db.deal.findMany({
      where,
      select: { value: true, stage: true, createdAt: true },
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
  const dealCount = deals.length;
  const avgDealSize = dealCount > 0 ? totalRevenue / dealCount : 0;
  const closedWon = deals.filter((d) => d.stage === "closed_won").length;
  const closedLost = deals.filter((d) => d.stage === "closed_lost").length;
  const winRate =
    closedWon + closedLost > 0
      ? (closedWon / (closedWon + closedLost)) * 100
      : 0;

  return {
    type: "sales",
    summary: {
      totalRevenue,
      dealCount,
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

async function getCustomersReport(where: Record<string, unknown>) {
  const [customers, totalCount, statusBreakdown] = await Promise.all([
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
  };
}

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
  const conversionRate =
    totalLeads > 0 ? (closedWon / totalLeads) * 100 : 0;

  return {
    type: "leads",
    summary: {
      totalLeads,
      conversionRate: Math.round(conversionRate * 10) / 10,
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

async function getTicketsReport(where: Record<string, unknown>) {
  const [tickets, statusBreakdown, priorityBreakdown] = await Promise.all([
    db.ticket.findMany({
      where,
      select: { createdAt: true, resolvedAt: true },
    }),
    db.ticket.groupBy({
      by: ["status"],
      where,
      _count: true,
    }),
    db.ticket.groupBy({
      by: ["priority"],
      where,
      _count: true,
    }),
  ]);

  const monthly = groupByMonth(tickets);
  const totalTickets = tickets.length;
  const resolved = tickets.filter((t) => t.resolvedAt);
  const avgResolutionMs =
    resolved.length > 0
      ? resolved.reduce(
          (sum, t) =>
            sum +
            (new Date(t.resolvedAt!).getTime() -
              new Date(t.createdAt).getTime()),
          0
        ) / resolved.length
      : 0;
  const avgResolutionHours = Math.round((avgResolutionMs / 3600000) * 10) / 10;

  return {
    type: "tickets",
    summary: { totalTickets, avgResolutionHours },
    monthly,
    statusBreakdown: statusBreakdown.map((s) => ({
      status: formatStage(s.status),
      count: s._count,
    })),
    priorityBreakdown: priorityBreakdown.map((p) => ({
      priority: formatStage(p.priority),
      count: p._count,
    })),
  };
}

export async function GET(req: NextRequest) {
  const session = await auth();
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
      case "tickets":
        return NextResponse.json(await getTicketsReport(where));
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
