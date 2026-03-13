import { NextRequest, NextResponse } from "next/server";
import { authOrApiKey } from "@/lib/api-key-auth";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string };
  const { memberId } = await params;

  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "Text required" }, { status: 400 });

  const comment = await db.campaignComment.create({
    data: { memberId, userId: user.id, text: text.trim() },
    include: { user: { select: { id: true, fullName: true } } },
  });

  return NextResponse.json(comment, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const commentId = searchParams.get("commentId");
  if (!commentId) return NextResponse.json({ error: "commentId required" }, { status: 400 });

  await db.campaignComment.delete({ where: { id: commentId } });
  return NextResponse.json({ success: true });
}
