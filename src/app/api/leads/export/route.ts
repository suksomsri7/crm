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

  const leads = await db.lead.findMany({ where: { brandId }, orderBy: { createdAt: "desc" } });

  const stageNames: Record<string, string> = {};
  try {
    const stages = await db.leadStage.findMany({ where: { brandId } });
    for (const s of stages) stageNames[s.id] = s.name;
  } catch {}

  const headers = [
    "externalId",
    "titlePrefix",
    "titlePrefixTh",
    "firstName",
    "firstNameTh",
    "lastName",
    "lastNameTh",
    "nickname",
    "sex",
    "phone",
    "email",
    "source",
    "stage",
    "status",
    "interest",
    "birthDate",
    "idCard",
    "address",
    "city",
    "state",
    "postalCode",
    "country",
    "notes",
    "createdAt",
  ];

  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;

  const csv = [
    headers.join(","),
    ...leads.map((l) =>
      [
        l.externalId || "",
        l.titlePrefix || "",
        l.titlePrefixTh || "",
        l.firstName || "",
        l.firstNameTh || "",
        l.lastName || "",
        l.lastNameTh || "",
        l.nickname || "",
        l.sex || "",
        l.phone || "",
        l.email || "",
        l.source || "",
        stageNames[l.stage] || l.stage,
        l.status || "",
        l.interest || "",
        l.birthDate || "",
        l.idCard || "",
        l.address || "",
        l.city || "",
        l.state || "",
        l.postalCode || "",
        l.country || "",
        (l.notes || "").replace(/\n/g, " "),
        l.createdAt.toISOString(),
      ]
        .map(esc)
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
