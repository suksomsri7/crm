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
  const firstNameIdx = headers.indexOf("firstname");
  const lastNameIdx = headers.indexOf("lastname");
  const emailIdx = headers.indexOf("email");
  const phoneIdx = headers.indexOf("phone");
  const sourceIdx = headers.indexOf("source");
  const stageIdx = headers.indexOf("stage");
  const interestIdx = headers.indexOf("interest");
  const notesIdx = headers.indexOf("notes");

  const validStages = ["prospecting", "qualification", "proposal", "negotiation", "closed_won", "closed_lost"];

  let imported = 0;
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/"/g, ""));
    const firstName = firstNameIdx >= 0 ? cols[firstNameIdx] : null;
    const lastName = lastNameIdx >= 0 ? cols[lastNameIdx] : null;
    const title = [firstName, lastName].filter(Boolean).join(" ") || "Imported Lead";

    if (!firstName && !lastName && (emailIdx < 0 || !cols[emailIdx]) && (phoneIdx < 0 || !cols[phoneIdx])) {
      skipped++;
      continue;
    }

    const rawStage = stageIdx >= 0 ? cols[stageIdx]?.toLowerCase() : "";

    try {
      await db.lead.create({
        data: {
          brandId,
          createdById: user.id,
          assignedToId: user.id,
          title,
          firstName: firstName || null,
          lastName: lastName || null,
          email: emailIdx >= 0 ? cols[emailIdx] || null : null,
          phone: phoneIdx >= 0 ? cols[phoneIdx] || null : null,
          source: sourceIdx >= 0 ? cols[sourceIdx] || null : null,
          stage: validStages.includes(rawStage) ? rawStage : "prospecting",
          status: "new",
          interest: interestIdx >= 0 ? cols[interestIdx] || null : null,
          notes: notesIdx >= 0 ? cols[notesIdx] || null : null,
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
      entity: "lead",
      details: { imported, skipped },
    },
  });

  return NextResponse.json({ imported, skipped, total: lines.length - 1 });
}
