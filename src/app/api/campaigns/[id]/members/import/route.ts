import { NextRequest, NextResponse } from "next/server";
import { authOrApiKey } from "@/lib/api-key-auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const { id } = await params;

  const campaign = await db.campaign.findUnique({ where: { id }, select: { brandId: true } });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (!user.isSuperAdmin && !user.brands?.some((b: any) => b.id === campaign.brandId))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = (formData.get("type") as string) || "lead";
  const stageId = (formData.get("stageId") as string) || null;

  if (!file) return NextResponse.json({ error: "File required" }, { status: 400 });

  const text = await file.text();
  const lines = text.split("\n").filter(Boolean);
  if (lines.length < 2) return NextResponse.json({ error: "CSV must have header + at least 1 row" }, { status: 400 });

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  const firstNameIdx = headers.indexOf("firstname");
  const lastNameIdx = headers.indexOf("lastname");
  const emailIdx = headers.indexOf("email");
  const phoneIdx = headers.indexOf("phone");

  let imported = 0;
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/"/g, ""));
    const firstName = firstNameIdx >= 0 ? cols[firstNameIdx] : null;
    const lastName = lastNameIdx >= 0 ? cols[lastNameIdx] : null;
    const email = emailIdx >= 0 ? cols[emailIdx] : null;
    const phone = phoneIdx >= 0 ? cols[phoneIdx] : null;

    if (!firstName && !lastName && !email && !phone) { skipped++; continue; }

    try {
      if (type === "customer") {
        const customer = await db.customer.create({
          data: {
            brandId: campaign.brandId,
            name: [firstName, lastName].filter(Boolean).join(" ") || "Imported",
            firstName: firstName || null,
            lastName: lastName || null,
            email: email || null,
            phone: phone || null,
            status: "active",
          },
        });
        await db.campaignMember.create({
          data: { campaignId: id, customerId: customer.id, stageId: stageId || null, addedById: user.id, addedVia: "import" },
        });
      } else {
        const lead = await db.lead.create({
          data: {
            brandId: campaign.brandId,
            createdById: user.id,
            assignedToId: user.id,
            title: [firstName, lastName].filter(Boolean).join(" ") || "Imported Lead",
            firstName: firstName || null,
            lastName: lastName || null,
            email: email || null,
            phone: phone || null,
            status: "new",
            stage: "prospecting",
          },
        });
        await db.campaignMember.create({
          data: { campaignId: id, leadId: lead.id, stageId: stageId || null, addedById: user.id, addedVia: "import" },
        });
      }
      imported++;
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({ imported, skipped, total: lines.length - 1 });
}
