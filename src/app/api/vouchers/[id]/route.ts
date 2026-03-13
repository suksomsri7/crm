import { NextRequest, NextResponse } from "next/server";
import { authOrApiKey } from "@/lib/api-key-auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().optional().nullable(),
  type: z.enum(["fixed_amount", "percentage", "free_item"]).optional(),
  value: z.number().optional().nullable(),
  description: z.string().optional().nullable(),
  minPurchase: z.number().optional().nullable(),
  maxDiscount: z.number().optional().nullable(),
  usageLimit: z.number().int().optional().nullable(),
  startDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  status: z.enum(["active", "inactive", "expired"]).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const voucher = await db.voucher.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, fullName: true } },
      customerVouchers: {
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { id: true, name: true, firstName: true, lastName: true } },
          assignedBy: { select: { id: true, fullName: true } },
        },
      },
    },
  });

  if (!voucher) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(voucher);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await db.voucher.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  const updateData: any = { ...data };
  if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
  if (data.expiryDate !== undefined) updateData.expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;

  const voucher = await db.voucher.update({
    where: { id },
    data: updateData,
    include: {
      createdBy: { select: { id: true, fullName: true } },
    },
  });

  return NextResponse.json(voucher);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await db.voucher.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.voucher.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
