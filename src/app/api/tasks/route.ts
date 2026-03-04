import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(), // ISO date string
  priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional().default("pending"),
  assigneeId: z.string().optional().nullable(),
  entityType: z.string().optional().nullable(),
  entityId: z.string().optional().nullable(),
});

// GET /api/tasks?brandId=xxx&status=pending&assigneeId=xxx
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get("brandId") || user.activeBrandId;
  const status = searchParams.get("status");
  const assigneeId = searchParams.get("assigneeId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = (page - 1) * limit;

  if (!brandId) return NextResponse.json({ error: "Brand ID required" }, { status: 400 });

  const where: any = { brandId };
  if (status) where.status = status;
  if (assigneeId) where.assigneeId = assigneeId;

  // If not super admin and no specific assignee filter, show only own tasks
  if (!user.isSuperAdmin && !assigneeId) {
    where.assigneeId = user.id;
  }

  const [tasks, total] = await Promise.all([
    db.task.findMany({
      where,
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
      include: {
        assignee: { select: { id: true, fullName: true, avatarUrl: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    }),
    db.task.count({ where }),
  ]);

  return NextResponse.json({ tasks, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}

// POST /api/tasks
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const body = await req.json();
  const brandId = body.brandId || user.activeBrandId;
  if (!brandId) return NextResponse.json({ error: "Brand ID required" }, { status: 400 });

  const parsed = taskSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const task = await db.task.create({
    data: {
      brandId,
      createdById: user.id,
      assigneeId: parsed.data.assigneeId || user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      priority: parsed.data.priority,
      status: parsed.data.status,
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
    },
    include: {
      assignee: { select: { id: true, fullName: true, avatarUrl: true } },
      createdBy: { select: { id: true, fullName: true } },
    },
  });

  return NextResponse.json(task, { status: 201 });
}
