import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get("brandId");

  if (!brandId) return NextResponse.json({ error: "brandId required" }, { status: 400 });

  const roles = await db.role.findMany({
    where: { brandId },
    include: {
      rolePermissions: { include: { permission: true } },
      _count: { select: { userBrands: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(roles);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!user.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { brandId, name, description, permissions } = body as {
    brandId: string;
    name: string;
    description?: string;
    permissions?: string[];
  };

  if (!brandId || !name) {
    return NextResponse.json({ error: "brandId and name are required" }, { status: 400 });
  }

  const existing = await db.role.findUnique({
    where: { brandId_name: { brandId, name } },
  });
  if (existing) {
    return NextResponse.json({ error: "A role with this name already exists for this brand" }, { status: 409 });
  }

  const role = await db.role.create({
    data: {
      brandId,
      name,
      description: description ?? null,
    },
  });

  if (permissions && permissions.length > 0) {
    const permRecords = await db.permission.findMany({
      where: {
        OR: permissions.map((p) => {
          const [resource, action] = p.split(":");
          return { resource, action };
        }),
      },
    });

    if (permRecords.length > 0) {
      await db.rolePermission.createMany({
        data: permRecords.map((p) => ({
          roleId: role.id,
          permissionId: p.id,
        })),
      });
    }
  }

  const created = await db.role.findUnique({
    where: { id: role.id },
    include: {
      rolePermissions: { include: { permission: true } },
      _count: { select: { userBrands: true } },
    },
  });

  return NextResponse.json(created, { status: 201 });
}
