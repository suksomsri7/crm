import { NextRequest, NextResponse } from "next/server";
import { authOrApiKey } from "@/lib/api-key-auth";
import { db } from "@/lib/db";

const VALID_TYPES = ["addresses", "jobs", "education", "emergencyContacts", "medical", "diving", "socials"] as const;
type ExtraType = (typeof VALID_TYPES)[number];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const lead = await db.lead.findUnique({
    where: { id },
    include: {
      addresses: { orderBy: { createdAt: "desc" } },
      jobs: { orderBy: { createdAt: "desc" } },
      education: { orderBy: { createdAt: "desc" } },
      emergencyContacts: { orderBy: { createdAt: "desc" } },
      medical: { orderBy: { createdAt: "desc" } },
      diving: { orderBy: { createdAt: "desc" } },
      socials: { orderBy: { createdAt: "desc" } },
      files: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    addresses: lead.addresses,
    jobs: lead.jobs,
    education: lead.education,
    emergencyContacts: lead.emergencyContacts,
    medical: lead.medical,
    diving: lead.diving,
    socials: lead.socials,
    files: lead.files,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { type, data } = body as { type: ExtraType; data: any };

  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const modelMap = {
    addresses: db.customerAddress,
    jobs: db.customerJob,
    education: db.customerEducation,
    emergencyContacts: db.customerEmergencyContact,
    medical: db.customerMedical,
    diving: db.customerDiving,
    socials: db.customerSocial,
  } as Record<ExtraType, any>;

  const record = await modelMap[type].create({
    data: { leadId: id, ...data },
  });

  return NextResponse.json(record, { status: 201 });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type, recordId, data } = body as { type: ExtraType; recordId: string; data: any };

  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const modelMap = {
    addresses: db.customerAddress,
    jobs: db.customerJob,
    education: db.customerEducation,
    emergencyContacts: db.customerEmergencyContact,
    medical: db.customerMedical,
    diving: db.customerDiving,
    socials: db.customerSocial,
  } as Record<ExtraType, any>;

  const record = await modelMap[type].update({
    where: { id: recordId },
    data,
  });

  return NextResponse.json(record);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") as ExtraType;
  const recordId = searchParams.get("recordId");

  if (!type || !VALID_TYPES.includes(type) || !recordId) {
    return NextResponse.json({ error: "type and recordId required" }, { status: 400 });
  }

  const modelMap = {
    addresses: db.customerAddress,
    jobs: db.customerJob,
    education: db.customerEducation,
    emergencyContacts: db.customerEmergencyContact,
    medical: db.customerMedical,
    diving: db.customerDiving,
    socials: db.customerSocial,
  } as Record<ExtraType, any>;

  await modelMap[type].delete({ where: { id: recordId } });
  return NextResponse.json({ success: true });
}
