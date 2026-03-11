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

  const customers = await db.customer.findMany({
    where: { brandId },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "externalId",
    "name",
    "titlePrefix",
    "titlePrefixTh",
    "firstName",
    "firstNameTh",
    "lastName",
    "lastNameTh",
    "nickname",
    "sex",
    "email",
    "phone",
    "company",
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
    "tags",
    "notes",
    "createdAt",
  ];

  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;

  const csv = [
    headers.join(","),
    ...customers.map((c) =>
      [
        c.externalId || "",
        c.name,
        c.titlePrefix || "",
        c.titlePrefixTh || "",
        c.firstName || "",
        c.firstNameTh || "",
        c.lastName || "",
        c.lastNameTh || "",
        c.nickname || "",
        c.sex || "",
        c.email || "",
        c.phone || "",
        c.company || "",
        c.source || "",
        c.stage || "",
        c.status,
        c.interest || "",
        c.birthDate || "",
        c.idCard || "",
        c.address || "",
        c.city || "",
        c.state || "",
        c.postalCode || "",
        c.country || "",
        (c.tags || []).join(";"),
        (c.notes || "").replace(/\n/g, " "),
        c.createdAt.toISOString(),
      ]
        .map(esc)
        .join(",")
    ),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="customers-${brandId}.csv"`,
    },
  });
}
