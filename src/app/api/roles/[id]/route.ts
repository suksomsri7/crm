import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const role = await db.role.findUnique({
    where: { id },
    include: {
      rolePermissions: { include: { permission: true } },
      _count: { select: { userBrands: true } },
    },
  });

  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  return NextResponse.json(role);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!user.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { name, description, permissions } = body as {
    name?: string;
    description?: string;
    permissions?: string[];
  };

  const existing = await db.role.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Role not found" }, { status: 404 });

  if (name && name !== existing.name) {
    const duplicate = await db.role.findUnique({
      where: { brandId_name: { brandId: existing.brandId, name } },
    });
    if (duplicate) {
      return NextResponse.json({ error: "A role with this name already exists" }, { status: 409 });
    }
  }

  await db.role.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
    },
  });

  if (permissions !== undefined) {
    await db.rolePermission.deleteMany({ where: { roleId: id } });

    if (permissions.length > 0) {
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
            roleId: id,
            permissionId: p.id,
          })),
        });
      }
    }
  }

  const updated = await db.role.findUnique({
    where: { id },
    include: {
      rolePermissions: { include: { permission: true } },
      _count: { select: { userBrands: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!user.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const role = await db.role.findUnique({
    where: { id },
    include: { _count: { select: { userBrands: true } } },
  });

  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

  if (role._count.userBrands > 0) {
    return NextResponse.json(
      { error: `Cannot delete role with ${role._count.userBrands} assigned user(s). Reassign them first.` },
      { status: 400 }
    );
  }

  await db.role.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
