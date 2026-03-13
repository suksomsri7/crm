import { NextRequest, NextResponse } from "next/server";
import { authOrApiKey } from "@/lib/api-key-auth";
import { db } from "@/lib/db";
import { z } from "zod";

const brandSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  logoUrl: z.string().url().optional().nullable(),
  domain: z.string().optional().nullable(),
  settings: z.any().optional().nullable(),
});

// GET /api/brands - list all brands (super admin only)
export async function GET(req: NextRequest) {
  const session = await authOrApiKey(req);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as any;
  if (!user.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const brands = await db.brand.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { userBrands: true, customers: true, leads: true },
      },
    },
  });

  return NextResponse.json(brands);
}

// POST /api/brands - create brand (super admin only)
export async function POST(req: NextRequest) {
  const session = await authOrApiKey(req);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as any;
  if (!user.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = brandSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Create brand with default "Admin" role that has all permissions
  const brand = await db.brand.create({
    data: {
      name: parsed.data.name,
      logoUrl: parsed.data.logoUrl,
      domain: parsed.data.domain,
      settings: parsed.data.settings,
    },
  });

  // Get all permissions and create the default Admin role for this brand
  const allPermissions = await db.permission.findMany();
  const adminRole = await db.role.create({
    data: {
      brandId: brand.id,
      name: "Admin",
      description: "Full access to all features",
      isDefault: true,
      rolePermissions: {
        create: allPermissions.map((p) => ({ permissionId: p.id })),
      },
    },
  });

  // Also create default roles: Sales, Marketing, Support
  const salesPerms = allPermissions.filter((p) =>
    ["customers:read", "customers:write", "leads:read", "leads:write", "leads:delete", "deals:read", "deals:write", "comments:read", "comments:write"].includes(`${p.resource}:${p.action}`)
  );
  await db.role.create({
    data: {
      brandId: brand.id,
      name: "Sales",
      description: "Sales team - manage leads and deals",
      rolePermissions: { create: salesPerms.map((p) => ({ permissionId: p.id })) },
    },
  });

  const marketingPerms = allPermissions.filter((p) =>
    ["customers:read", "campaigns:read", "campaigns:write", "campaigns:delete", "reports:read"].includes(`${p.resource}:${p.action}`)
  );
  await db.role.create({
    data: {
      brandId: brand.id,
      name: "Marketing",
      description: "Marketing team - manage campaigns",
      rolePermissions: { create: marketingPerms.map((p) => ({ permissionId: p.id })) },
    },
  });

  const supportPerms = allPermissions.filter((p) =>
    ["customers:read", "tickets:read", "tickets:write", "tickets:delete"].includes(`${p.resource}:${p.action}`)
  );
  await db.role.create({
    data: {
      brandId: brand.id,
      name: "Support",
      description: "Support team - manage tickets",
      rolePermissions: { create: supportPerms.map((p) => ({ permissionId: p.id })) },
    },
  });

  // Log audit
  await db.auditLog.create({
    data: {
      brandId: brand.id,
      userId: user.id,
      action: "create",
      entity: "brand",
      entityId: brand.id,
      details: { name: brand.name },
    },
  });

  return NextResponse.json(brand, { status: 201 });
}
