import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";

const createUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email().optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(1),
  isSuperAdmin: z.boolean().optional().default(false),
});

// GET all users (super admin only)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!user.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, username: true, email: true, fullName: true, isSuperAdmin: true, isActive: true, createdAt: true, avatarUrl: true,
      userBrands: {
        include: { brand: { select: { id: true, name: true } }, role: { select: { id: true, name: true } } },
      },
    },
  });

  return NextResponse.json(users);
}

// POST create user (super admin only)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!user.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await db.user.findUnique({ where: { username: parsed.data.username } });
  if (existing) return NextResponse.json({ error: "Username already exists" }, { status: 409 });

  const hashedPassword = await bcrypt.hash(parsed.data.password, 12);

  const newUser = await db.user.create({
    data: {
      username: parsed.data.username,
      email: parsed.data.email || null,
      password: hashedPassword,
      fullName: parsed.data.fullName,
      isSuperAdmin: parsed.data.isSuperAdmin,
    },
  });

  await db.auditLog.create({
    data: { userId: user.id, action: "create", entity: "user", entityId: newUser.id, details: { username: newUser.username, fullName: newUser.fullName } },
  });

  return NextResponse.json({ id: newUser.id, username: newUser.username, fullName: newUser.fullName }, { status: 201 });
}
