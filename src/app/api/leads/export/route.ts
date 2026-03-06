import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string; isSuperAdmin?: boolean; brands?: { id: string }[]; activeBrandId?: string };

  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get("brandId") || user.activeBrandId;
  if (!brandId) return NextResponse.json({ error: "Brand ID required" }, { status: 400 });

  if (!user.isSuperAdmin) {
    const hasBrand = user.brands?.some((b) => b.id === brandId);
    if (!hasBrand) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const leads = await db.lead.findMany({
    where: { brandId },
    orderBy: { createdAt: "desc" },
  });

  const headers = ["firstName", "lastName", "email", "phone", "source", "stage", "interest", "notes", "createdAt"];
  const csv = [
    headers.join(","),
    ...leads.map((l) =>
      [
        l.firstName || "",
        l.lastName || "",
        l.email || "",
        l.phone || "",
        l.source || "",
        l.stage,
        l.interest || "",
        (l.notes || "").replace(/,/g, ";").replace(/\n/g, " "),
        l.createdAt.toISOString(),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="leads-${brandId}.csv"`,
    },
  });
}
