import { NextRequest, NextResponse } from "next/server";
import { authOrApiKey } from "@/lib/api-key-auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  channel: z.string().min(1),
  senderName: z.string().min(1),
  message: z.string().min(1),
  sentAt: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await authOrApiKey(req);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "0");
  const page = parseInt(searchParams.get("page") || "1");
  const order = searchParams.get("order") === "desc" ? "desc" as const : "asc" as const;

  const where = { customerId: id };
  const orderBy = { sentAt: order };

  if (limit > 0) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      db.chatLog.findMany({ where, orderBy, skip, take: limit }),
      db.chatLog.count({ where }),
    ]);
    return NextResponse.json({
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  const logs = await db.chatLog.findMany({ where, orderBy });
  return NextResponse.json(logs);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await authOrApiKey(req);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const customer = await db.customer.findUnique({ where: { id } });
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const log = await db.chatLog.create({
    data: {
      customerId: id,
      channel: parsed.data.channel,
      senderName: parsed.data.senderName,
      message: parsed.data.message,
      sentAt: parsed.data.sentAt ? new Date(parsed.data.sentAt) : new Date(),
    },
  });

  return NextResponse.json(log, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await authOrApiKey(req);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const logId = req.nextUrl.searchParams.get("logId");
  if (!logId) {
    return NextResponse.json({ error: "logId is required" }, { status: 400 });
  }

  const log = await db.chatLog.findFirst({ where: { id: logId, customerId: id } });
  if (!log) {
    return NextResponse.json({ error: "Chat log not found" }, { status: 404 });
  }

  await db.chatLog.delete({ where: { id: logId } });

  return NextResponse.json({ success: true });
}
