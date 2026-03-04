import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string; isSuperAdmin?: boolean; brands?: { id: string }[]; activeBrandId?: string };

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const brandId = (formData.get("brandId") as string) || user.activeBrandId;

  if (!file) return NextResponse.json({ error: "File required" }, { status: 400 });
  if (!brandId) return NextResponse.json({ error: "Brand ID required" }, { status: 400 });

  if (!user.isSuperAdmin) {
    const hasBrand = user.brands?.some((b) => b.id === brandId);
    if (!hasBrand) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const text = await file.text();
  const lines = text.split("\n").filter(Boolean);

  if (lines.length < 2)
    return NextResponse.json({ error: "CSV must have header + at least 1 row" }, { status: 400 });

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  const nameIdx = headers.indexOf("name");
  const emailIdx = headers.indexOf("email");
  const phoneIdx = headers.indexOf("phone");
  const companyIdx = headers.indexOf("company");
  const cityIdx = headers.indexOf("city");
  const countryIdx = headers.indexOf("country");
  const statusIdx = headers.indexOf("status");

  if (nameIdx === -1) return NextResponse.json({ error: "CSV must have a 'name' column" }, { status: 400 });

  let imported = 0;
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/"/g, ""));
    const name = cols[nameIdx];
    if (!name) {
      skipped++;
      continue;
    }

    try {
      await db.customer.create({
        data: {
          brandId,
          assignedTo: user.id,
          name,
          email: emailIdx >= 0 ? cols[emailIdx] || null : null,
          phone: phoneIdx >= 0 ? cols[phoneIdx] || null : null,
          company: companyIdx >= 0 ? cols[companyIdx] || null : null,
          city: cityIdx >= 0 ? cols[cityIdx] || null : null,
          country: countryIdx >= 0 ? cols[countryIdx] || null : null,
          status:
            statusIdx >= 0 && ["active", "inactive", "prospect"].includes(cols[statusIdx])
              ? cols[statusIdx]
              : "active",
        },
      });
      imported++;
    } catch {
      skipped++;
    }
  }

  await db.auditLog.create({
    data: {
      brandId,
      userId: user.id,
      action: "import",
      entity: "customer",
      details: { imported, skipped },
    },
  });

  return NextResponse.json({ imported, skipped, total: lines.length - 1 });
}
