import { NextRequest, NextResponse } from "next/server";
import { authOrApiKey } from "@/lib/api-key-auth";
import { db } from "@/lib/db";
import { z } from "zod";

const voucherSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional().nullable(),
  type: z.enum(["fixed_amount", "percentage", "free_item"]).default("fixed_amount"),
  value: z.number().optional().nullable(),
  description: z.string().optional().nullable(),
  minPurchase: z.number().optional().nullable(),
  maxDiscount: z.number().optional().nullable(),
  usageLimit: z.number().int().optional().nullable(),
  startDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export async function GET(req: NextRequest) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get("brandId") || user.activeBrandId;
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const type = searchParams.get("type") || "";
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
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status;
  if (type) where.type = type;

  const [vouchers, total] = await Promise.all([
    db.voucher.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        createdBy: { select: { id: true, fullName: true } },
        _count: { select: { customerVouchers: true } },
      },
    }),
    db.voucher.count({ where }),
  ]);

  return NextResponse.json({
    vouchers,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(req: NextRequest) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const body = await req.json();
  const brandId = body.brandId || user.activeBrandId;
  if (!brandId) return NextResponse.json({ error: "Brand ID required" }, { status: 400 });

  const parsed = voucherSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;

  const voucher = await db.voucher.create({
    data: {
      brandId,
      createdById: user.id,
      name: data.name,
      code: data.code || null,
      type: data.type,
      value: data.value ?? null,
      description: data.description || null,
      minPurchase: data.minPurchase ?? null,
      maxDiscount: data.maxDiscount ?? null,
      usageLimit: data.usageLimit ?? null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      status: data.status,
    },
    include: {
      createdBy: { select: { id: true, fullName: true } },
      _count: { select: { customerVouchers: true } },
    },
  });

  return NextResponse.json(voucher, { status: 201 });
}
