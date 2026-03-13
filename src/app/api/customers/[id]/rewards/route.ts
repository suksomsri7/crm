import { NextRequest, NextResponse } from "next/server";
import { authOrApiKey } from "@/lib/api-key-auth";
import { db } from "@/lib/db";

// GET /api/customers/[id]/rewards - get rewards summary + history
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const customer = await db.customer.findUnique({ where: { id } });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rewards = await db.customerReward.findMany({
    where: { customerId: id },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, fullName: true } },
    },
  });

  // Calculate totals
  let totalVouchers = 0;
  let totalPoints = 0;
  for (const r of rewards) {
    if (r.type === "voucher") totalVouchers += r.amount;
    else if (r.type === "point") totalPoints += r.amount;
  }

  return NextResponse.json({ rewards, totalVouchers, totalPoints });
}

// POST /api/customers/[id]/rewards - add a reward entry
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string };

  const { id } = await params;
  const customer = await db.customer.findUnique({ where: { id } });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const body = await req.json();
  const { type, amount, notes } = body as { type: string; amount: number; notes?: string };

  if (!type || !["voucher", "point"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
  if (!amount || typeof amount !== "number") {
    return NextResponse.json({ error: "Amount is required" }, { status: 400 });
  }

  const reward = await db.customerReward.create({
    data: {
      customerId: id,
      type,
      amount,
      notes: notes || null,
      createdById: user.id,
    },
    include: {
      createdBy: { select: { id: true, fullName: true } },
    },
  });

  return NextResponse.json(reward, { status: 201 });
}
