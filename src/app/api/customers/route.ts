import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  titlePrefix: z.string().optional().nullable(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  nickname: z.string().optional().nullable(),
  sex: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  stage: z.string().optional().nullable(),
  interest: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  idCard: z.string().optional().nullable(),
  customerAddress: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  notes: z.string().optional().nullable(),
  status: z.enum(["active", "inactive", "prospect"]).optional().default("active"),
});

// GET /api/customers?brandId=xxx&search=xxx&status=xxx&page=1&limit=20
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string; isSuperAdmin?: boolean; brands?: { id: string }[]; activeBrandId?: string };

  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get("brandId") || user.activeBrandId;
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  if (!brandId) return NextResponse.json({ error: "Brand ID required" }, { status: 400 });

  // Check access - super admin can access any brand, others need brand assignment
  if (!user.isSuperAdmin) {
    const hasBrand = user.brands?.some((b) => b.id === brandId);
    if (!hasBrand) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const where: { brandId: string; OR?: Record<string, unknown>[]; status?: string } = { brandId };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" as const } },
      { firstName: { contains: search, mode: "insensitive" as const } },
      { lastName: { contains: search, mode: "insensitive" as const } },
      { email: { contains: search, mode: "insensitive" as const } },
      { phone: { contains: search } },
      { company: { contains: search, mode: "insensitive" as const } },
    ];
  }

  if (status) where.status = status;

  const [customers, total] = await Promise.all([
    db.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.customer.count({ where }),
  ]);

  return NextResponse.json({
    customers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// POST /api/customers - create customer
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string; isSuperAdmin?: boolean; brands?: { id: string }[]; activeBrandId?: string };

  const body = await req.json();
  const brandId = (body.brandId as string) || user.activeBrandId;
  if (!brandId) return NextResponse.json({ error: "Brand ID required" }, { status: 400 });

  if (!user.isSuperAdmin) {
    const hasBrand = user.brands?.some((b) => b.id === brandId);
    if (!hasBrand) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = customerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const customer = await db.customer.create({
    data: {
      brandId,
      assignedTo: user.id,
      ...parsed.data,
    },
  });

  // Create activity log
  await db.activity.create({
    data: {
      brandId,
      userId: user.id,
      customerId: customer.id,
      entityType: "customer",
      entityId: customer.id,
      type: "status_change",
      title: `Customer "${customer.name}" created`,
    },
  });

  await db.auditLog.create({
    data: { brandId, userId: user.id, action: "create", entity: "customer", entityId: customer.id },
  });

  return NextResponse.json(customer, { status: 201 });
}
