import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET roles for a brand
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
