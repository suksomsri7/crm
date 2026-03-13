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

  const deals = await db.deal.findMany({
    where: { customerId: id },
    include: {
      lead: { select: { id: true, title: true, firstName: true, lastName: true } },
      openedBy: { select: { id: true, fullName: true } },
      closedBy: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(deals);
}
