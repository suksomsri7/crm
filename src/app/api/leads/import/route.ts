import { NextRequest, NextResponse } from "next/server";
import { authOrApiKey } from "@/lib/api-key-auth";
import { db } from "@/lib/db";

function idx(headers: string[], name: string) {
  return headers.indexOf(name.toLowerCase());
}

function col(cols: string[], i: number): string | null {
  return i >= 0 ? cols[i]?.trim() || null : null;
}

export async function POST(req: NextRequest) {
  const session = await authOrApiKey(req);
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

  const iExternalId = idx(headers, "externalid");
  const iTitlePrefix = idx(headers, "titleprefix");
  const iTitlePrefixTh = idx(headers, "titleprefixth");
  const iFirstName = idx(headers, "firstname");
  const iFirstNameTh = idx(headers, "firstnameth");
  const iLastName = idx(headers, "lastname");
  const iLastNameTh = idx(headers, "lastnameth");
  const iNickname = idx(headers, "nickname");
  const iSex = idx(headers, "sex");
  const iPhone = idx(headers, "phone");
  const iEmail = idx(headers, "email");
  const iSource = idx(headers, "source");
  const iStage = idx(headers, "stage");
  const iStatus = idx(headers, "status");
  const iInterest = idx(headers, "interest");
  const iBirthDate = idx(headers, "birthdate");
  const iIdCard = idx(headers, "idcard");
  const iAddress = idx(headers, "address");
  const iCity = idx(headers, "city");
  const iState = idx(headers, "state");
  const iPostalCode = idx(headers, "postalcode");
  const iCountry = idx(headers, "country");
  const iNotes = idx(headers, "notes");

  let stageNameToId: Record<string, string> = {};
  let defaultStageId = "prospecting";
  try {
    const brandStages = await db.leadStage.findMany({ where: { brandId }, orderBy: { order: "asc" } });
    for (const s of brandStages) stageNameToId[s.name.toLowerCase()] = s.id;
    defaultStageId = brandStages[0]?.id || "prospecting";
  } catch {}

  const validStatuses = ["new", "contacted", "qualified", "unqualified"];

  let imported = 0;
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/"/g, ""));
    const firstName = col(cols, iFirstName);
    const lastName = col(cols, iLastName);
    const email = col(cols, iEmail);
    const phone = col(cols, iPhone);
    const title = [firstName, lastName].filter(Boolean).join(" ") || "Imported Lead";

    if (!firstName && !lastName && !email && !phone) {
      skipped++;
      continue;
    }

    const rawStage = col(cols, iStage)?.toLowerCase() || "";
    const resolvedStageId = stageNameToId[rawStage] || defaultStageId;

    const rawStatus = col(cols, iStatus)?.toLowerCase() || "";
    const resolvedStatus = validStatuses.includes(rawStatus) ? rawStatus : "new";

    try {
      await db.lead.create({
        data: {
          brandId,
          createdById: user.id,
          assignedToId: user.id,
          title,
          externalId: col(cols, iExternalId),
          titlePrefix: col(cols, iTitlePrefix),
          titlePrefixTh: col(cols, iTitlePrefixTh),
          firstName,
          firstNameTh: col(cols, iFirstNameTh),
          lastName,
          lastNameTh: col(cols, iLastNameTh),
          nickname: col(cols, iNickname),
          sex: col(cols, iSex),
          phone,
          email,
          source: col(cols, iSource),
          stage: resolvedStageId,
          status: resolvedStatus,
          interest: col(cols, iInterest),
          birthDate: col(cols, iBirthDate),
          idCard: col(cols, iIdCard),
          address: col(cols, iAddress),
          city: col(cols, iCity),
          state: col(cols, iState),
          postalCode: col(cols, iPostalCode),
          country: col(cols, iCountry),
          notes: col(cols, iNotes),
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
