import { NextRequest, NextResponse } from "next/server";
import { authOrApiKey } from "@/lib/api-key-auth";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, memberId } = await params;

  const member = await db.campaignMember.findFirst({
    where: { id: memberId, campaignId: id },
    include: {
      customer: { select: { id: true, name: true, firstName: true, lastName: true, email: true, phone: true } },
      lead: { select: { id: true, title: true, firstName: true, lastName: true, email: true, phone: true } },
      stage: { select: { id: true, name: true, color: true } },
      addedBy: { select: { id: true, fullName: true } },
      checklists: { orderBy: { order: "asc" } },
      comments: { orderBy: { createdAt: "desc" }, include: { user: { select: { id: true, fullName: true } } } },
      attachments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(member);
}
