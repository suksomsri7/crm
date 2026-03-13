import { NextRequest, NextResponse } from "next/server";
import { authOrApiKey } from "@/lib/api-key-auth";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await authOrApiKey(req);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const memberships = await db.campaignMember.findMany({
    where: { customerId: id },
    include: {
      campaign: {
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          startDate: true,
          endDate: true,
        },
      },
      stage: { select: { id: true, name: true, color: true } },
      addedBy: { select: { id: true, fullName: true } },
    },
    orderBy: { addedAt: "desc" },
  });

  return NextResponse.json(memberships);
}
