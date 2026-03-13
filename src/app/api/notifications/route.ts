import { NextRequest, NextResponse } from "next/server";
import { authOrApiKey } from "@/lib/api-key-auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.notification.count({
      where: { userId: user.id, isRead: false },
    }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

export async function POST(req: NextRequest) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const body = await req.json();

  if (body.action === "markRead" && body.id) {
    await db.notification.updateMany({
      where: { id: body.id, userId: user.id },
      data: { isRead: true },
    });
    return NextResponse.json({ success: true });
  }

  if (body.action === "markAllRead") {
    await db.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ success: true });
  }

  const { userId, brandId, type, title, message, link } = body;
  if (!userId || !type || !title) {
    return NextResponse.json({ error: "userId, type, and title are required" }, { status: 400 });
  }

  const notification = await db.notification.create({
    data: {
      userId,
      brandId: brandId ?? null,
      type,
      title,
      message: message ?? null,
      link: link ?? null,
    },
  });

  return NextResponse.json(notification, { status: 201 });
}
