import { NextRequest, NextResponse } from "next/server";
import { authOrApiKey } from "@/lib/api-key-auth";
import { db } from "@/lib/db";
import { z } from "zod";

function getUserId(session: any): string {
  return session.user.id as string;
}

function getIsSuperAdmin(session: any): boolean {
  return !!session.user.isSuperAdmin;
}

const createSchema = z.object({
  text: z.string().min(1),
});

const updateSchema = z.object({
  text: z.string().min(1),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await authOrApiKey(req);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const comments = await db.comment.findMany({
    where: { leadId: id },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, fullName: true, avatarUrl: true } },
    },
  });

  return NextResponse.json(comments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await authOrApiKey(req);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const comment = await db.comment.create({
    data: {
      leadId: id,
      userId: getUserId(session),
      text: parsed.data.text,
    },
    include: {
      user: { select: { id: true, fullName: true, avatarUrl: true } },
    },
  });

  return NextResponse.json(comment, { status: 201 });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await authOrApiKey(req);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const commentId = req.nextUrl.searchParams.get("commentId");
  if (!commentId) {
    return NextResponse.json({ error: "commentId is required" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const comment = await db.comment.findFirst({ where: { id: commentId, leadId: id } });
  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  if (comment.userId !== getUserId(session) && !getIsSuperAdmin(session)) {
    return NextResponse.json({ error: "Can only edit your own comments" }, { status: 403 });
  }

  const updated = await db.comment.update({
    where: { id: commentId },
    data: { text: parsed.data.text },
    include: {
      user: { select: { id: true, fullName: true, avatarUrl: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await authOrApiKey(req);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const commentId = req.nextUrl.searchParams.get("commentId");
  if (!commentId) {
    return NextResponse.json({ error: "commentId is required" }, { status: 400 });
  }

  const comment = await db.comment.findFirst({ where: { id: commentId, leadId: id } });
  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  if (comment.userId !== getUserId(session) && !getIsSuperAdmin(session)) {
    return NextResponse.json({ error: "Can only delete your own comments" }, { status: 403 });
  }

  await db.comment.delete({ where: { id: commentId } });

  return NextResponse.json({ success: true });
}
