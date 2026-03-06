import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { memberId } = await params;

  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "Text required" }, { status: 400 });

  const maxOrder = await db.campaignChecklist.findFirst({
    where: { memberId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const item = await db.campaignChecklist.create({
    data: { memberId, text: text.trim(), order: (maxOrder?.order ?? -1) + 1 },
  });

  return NextResponse.json(item, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.text !== undefined) data.text = body.text;
  if (body.done !== undefined) data.done = body.done;

  const item = await db.campaignChecklist.update({ where: { id: itemId }, data });
  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

  await db.campaignChecklist.delete({ where: { id: itemId } });
  return NextResponse.json({ success: true });
}
