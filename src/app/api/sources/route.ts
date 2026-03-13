import { NextRequest, NextResponse } from "next/server";
import { authOrApiKey } from "@/lib/api-key-auth";
import { db } from "@/lib/db";
import { z } from "zod";

const sourceSchema = z.object({
  name: z.string().min(1).max(100),
  isActive: z.boolean().optional().default(true),
});

export async function GET(req: NextRequest) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") === "true";

  const where: any = {};
  if (activeOnly) where.isActive = true;

  const sources = await db.source.findMany({
    where,
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ sources });
}

export async function POST(req: NextRequest) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!user.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = sourceSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await db.source.findUnique({ where: { name: parsed.data.name } });
  if (existing) return NextResponse.json({ error: "Source name already exists" }, { status: 409 });

  const source = await db.source.create({ data: parsed.data });
  return NextResponse.json(source, { status: 201 });
}
