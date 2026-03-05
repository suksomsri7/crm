import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const VALID_TYPES = ["addresses", "jobs", "education", "emergencyContacts", "medical", "diving"] as const;
type ExtraType = (typeof VALID_TYPES)[number];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      addresses: { orderBy: { createdAt: "desc" } },
      jobs: { orderBy: { createdAt: "desc" } },
      education: { orderBy: { createdAt: "desc" } },
      emergencyContacts: { orderBy: { createdAt: "desc" } },
      medical: { orderBy: { createdAt: "desc" } },
      diving: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    addresses: customer.addresses,
    jobs: customer.jobs,
    education: customer.education,
    emergencyContacts: customer.emergencyContacts,
    medical: customer.medical,
    diving: customer.diving,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { type, data } = body as { type: ExtraType; data: any };

  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const customer = await db.customer.findUnique({ where: { id } });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const modelMap = {
    addresses: db.customerAddress,
    jobs: db.customerJob,
    education: db.customerEducation,
    emergencyContacts: db.customerEmergencyContact,
    medical: db.customerMedical,
    diving: db.customerDiving,
  } as Record<ExtraType, any>;

  const record = await modelMap[type].create({
    data: { customerId: id, ...data },
  });

  return NextResponse.json(record, { status: 201 });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
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
  } as Record<ExtraType, any>;

  const record = await modelMap[type].update({
    where: { id: recordId },
    data,
  });

  return NextResponse.json(record);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
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
  } as Record<ExtraType, any>;

  await modelMap[type].delete({ where: { id: recordId } });
  return NextResponse.json({ success: true });
}
