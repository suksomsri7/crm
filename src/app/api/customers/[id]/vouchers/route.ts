import { NextRequest, NextResponse } from "next/server";
import { authOrApiKey } from "@/lib/api-key-auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const customer = await db.customer.findUnique({ where: { id } });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const customerVouchers = await db.customerVoucher.findMany({
    where: { customerId: id },
    orderBy: { createdAt: "desc" },
    include: {
      voucher: {
        select: { id: true, name: true, code: true, type: true, value: true, status: true, expiryDate: true, coverUrl: true },
      },
      assignedBy: { select: { id: true, fullName: true } },
    },
  });

  return NextResponse.json({ customerVouchers });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string };

  const { id } = await params;
  const customer = await db.customer.findUnique({ where: { id } });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const body = await req.json();
  const { voucherId, quantity, notes } = body as { voucherId: string; quantity?: number; notes?: string };

  if (!voucherId) return NextResponse.json({ error: "voucherId is required" }, { status: 400 });

  const qty = quantity && quantity > 0 ? quantity : 1;

  const voucher = await db.voucher.findUnique({ where: { id: voucherId } });
  if (!voucher) return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
  if (voucher.status !== "active") return NextResponse.json({ error: "Voucher is not active" }, { status: 400 });

  if (voucher.usageLimit !== null) {
    if (voucher.usedCount + qty > voucher.usageLimit) {
      return NextResponse.json({ error: "Voucher usage limit would be exceeded" }, { status: 400 });
    }
  }

  const record = await db.customerVoucher.create({
    data: {
      customerId: id,
      voucherId,
      quantity: qty,
      assignedById: user.id,
      notes: notes || null,
    },
    include: {
      voucher: {
        select: { id: true, name: true, code: true, type: true, value: true, status: true, expiryDate: true, coverUrl: true },
      },
      assignedBy: { select: { id: true, fullName: true } },
    },
  });

  await db.voucher.update({
    where: { id: voucherId },
    data: { usedCount: { increment: qty } },
  });

  return NextResponse.json(record, { status: 201 });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const recordId = searchParams.get("recordId");
  if (!recordId) return NextResponse.json({ error: "recordId required" }, { status: 400 });

  const existing = await db.customerVoucher.findUnique({ where: { id: recordId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { quantity, status } = body as { quantity?: number; status?: string };

  const updateData: any = {};
  if (status) updateData.status = status;
  if (status === "used") updateData.usedAt = new Date();

  if (quantity !== undefined && quantity > 0) {
    const diff = quantity - existing.quantity;
    updateData.quantity = quantity;

    if (diff !== 0) {
      if (diff > 0) {
        await db.voucher.update({ where: { id: existing.voucherId }, data: { usedCount: { increment: diff } } });
      } else {
        await db.voucher.update({ where: { id: existing.voucherId }, data: { usedCount: { decrement: Math.abs(diff) } } });
      }
    }
  }

  const record = await db.customerVoucher.update({
    where: { id: recordId },
    data: updateData,
    include: {
      voucher: {
        select: { id: true, name: true, code: true, type: true, value: true, status: true, expiryDate: true, coverUrl: true },
      },
      assignedBy: { select: { id: true, fullName: true } },
    },
  });

  return NextResponse.json(record);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const recordId = searchParams.get("recordId");
  if (!recordId) return NextResponse.json({ error: "recordId required" }, { status: 400 });

  const existing = await db.customerVoucher.findUnique({ where: { id: recordId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.voucher.update({
    where: { id: existing.voucherId },
    data: { usedCount: { decrement: existing.quantity } },
  });

  await db.customerVoucher.delete({ where: { id: recordId } });
  return NextResponse.json({ success: true });
}
