import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const ticketSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  description: z.string().optional().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium"),
  status: z.enum(["open", "in_progress", "waiting", "resolved", "closed"]).optional().default("open"),
  category: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
});

// GET /api/tickets?brandId=xxx&search=xxx&status=xxx&priority=xxx&page=1&limit=20
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get("brandId") || user.activeBrandId;
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const priority = searchParams.get("priority") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  if (!brandId) return NextResponse.json({ error: "Brand ID required" }, { status: 400 });

  if (!user.isSuperAdmin) {
    const hasBrand = user.brands?.some((b: any) => b.id === brandId);
    if (!hasBrand) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const where: any = { brandId };

  if (search) {
    where.subject = { contains: search, mode: "insensitive" };
  }

  if (status) where.status = status;
  if (priority) where.priority = priority;

  const [tickets, total, openCount, inProgressCount, waitingCount, resolvedCount] = await Promise.all([
    db.ticket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        customer: { select: { id: true, name: true } },
        assignee: { select: { id: true, fullName: true } },
      },
    }),
    db.ticket.count({ where }),
    db.ticket.count({ where: { brandId, status: "open" } }),
    db.ticket.count({ where: { brandId, status: "in_progress" } }),
    db.ticket.count({ where: { brandId, status: "waiting" } }),
    db.ticket.count({ where: { brandId, status: "resolved" } }),
  ]);

  return NextResponse.json({
    tickets,
    counts: { open: openCount, in_progress: inProgressCount, waiting: waitingCount, resolved: resolvedCount },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// POST /api/tickets
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const body = await req.json();
  const brandId = (body.brandId as string) || user.activeBrandId;
  if (!brandId) return NextResponse.json({ error: "Brand ID required" }, { status: 400 });

  if (!user.isSuperAdmin) {
    const hasBrand = user.brands?.some((b: any) => b.id === brandId);
    if (!hasBrand) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = ticketSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data: any = { brandId, ...parsed.data };
  if (parsed.data.status === "resolved") {
    data.resolvedAt = new Date();
  }

  const ticket = await db.ticket.create({
    data,
    include: {
      customer: { select: { id: true, name: true } },
      assignee: { select: { id: true, fullName: true } },
    },
  });

  await db.auditLog.create({
    data: { brandId, userId: user.id, action: "create", entity: "ticket", entityId: ticket.id },
  });

  return NextResponse.json(ticket, { status: 201 });
}
