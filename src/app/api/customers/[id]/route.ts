import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  interest: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
  status: z.enum(["active", "inactive", "prospect"]).optional(),
  assignedTo: z.string().optional().nullable(),
});

function canAccessBrand(user: { isSuperAdmin?: boolean; brands?: { id: string }[] }, brandId: string): boolean {
  if (user.isSuperAdmin) return true;
  return user.brands?.some((b) => b.id === brandId) ?? false;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string; isSuperAdmin?: boolean; brands?: { id: string }[] };

  const { id } = await params;

  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      leads: { orderBy: { createdAt: "desc" }, take: 10 },
      tickets: { orderBy: { createdAt: "desc" }, take: 10 },
      deals: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canAccessBrand(user, customer.brandId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const activities = await db.activity.findMany({
    where: { brandId: customer.brandId, entityType: "customer", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
  });

  return NextResponse.json({ ...customer, activities });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string; isSuperAdmin?: boolean; brands?: { id: string }[] };

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await db.customer.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canAccessBrand(user, existing.brandId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const customer = await db.customer.update({
    where: { id },
    data: parsed.data,
  });

  await db.activity.create({
    data: {
      brandId: customer.brandId,
      userId: user.id,
      customerId: customer.id,
      entityType: "customer",
      entityId: customer.id,
      type: "status_change",
      title: `Customer "${customer.name}" updated`,
    },
  });

  await db.auditLog.create({
    data: { brandId: customer.brandId, userId: user.id, action: "update", entity: "customer", entityId: id },
  });

  return NextResponse.json(customer);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string; isSuperAdmin?: boolean; brands?: { id: string }[] };

  const { id } = await params;
  const customer = await db.customer.findUnique({ where: { id } });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canAccessBrand(user, customer.brandId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.customer.delete({ where: { id } });

  await db.auditLog.create({
    data: { brandId: customer.brandId, userId: user.id, action: "delete", entity: "customer", entityId: id },
  });

  return NextResponse.json({ success: true });
}
