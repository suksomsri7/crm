import { NextRequest, NextResponse } from "next/server";
import { authOrApiKey } from "@/lib/api-key-auth";
import { db } from "@/lib/db";

/**
 * GET /api/entities/check?externalId=xxx&brandId=xxx
 *
 * ตรวจสอบว่า externalId นี้มีอยู่ใน Leads หรือ Customers แล้วหรือยัง
 * ใช้ก่อนเพิ่มข้อมูลเพื่อป้องกันข้อมูลซ้ำ
 */
export async function GET(req: NextRequest) {
  const session = await authOrApiKey(req);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as { isSuperAdmin?: boolean; brands?: { id: string }[]; activeBrandId?: string };

  const { searchParams } = new URL(req.url);
  const externalId = searchParams.get("externalId");
  const brandId = searchParams.get("brandId") || user.activeBrandId;

  if (!externalId || !externalId.trim()) {
    return NextResponse.json(
      { error: "externalId is required", usage: "?externalId=YOUR_CUSTOMER_ID&brandId=optional" },
      { status: 400 }
    );
  }

  if (!brandId) {
    return NextResponse.json({ error: "brandId is required" }, { status: 400 });
  }

  if (!user.isSuperAdmin) {
    const hasBrand = user.brands?.some((b: { id: string }) => b.id === brandId);
    if (!hasBrand) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const [lead, customer] = await Promise.all([
    db.lead.findFirst({
      where: { brandId, externalId: externalId.trim() },
      select: { id: true, title: true, firstName: true, lastName: true, email: true, stage: true },
    }),
    db.customer.findFirst({
      where: { brandId, externalId: externalId.trim() },
      select: { id: true, name: true, email: true, status: true },
    }),
  ]);

  const exists = !!(lead || customer);

  return NextResponse.json({
    exists,
    externalId: externalId.trim(),
    brandId,
    inLeads: !!lead,
    inCustomers: !!customer,
    lead: lead ?? null,
    customer: customer ?? null,
  });
}
