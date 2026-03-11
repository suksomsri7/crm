import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const { id } = await params;

  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead)
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  if (!user.isSuperAdmin) {
    const hasBrand = user.brands?.some((b: any) => b.id === lead.brandId);
    if (!hasBrand)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (lead.customerId) {
    return NextResponse.json(
      { error: "Lead is already linked to a customer", customerId: lead.customerId },
      { status: 409 }
    );
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const name = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.title;

      const customer = await tx.customer.create({
        data: {
          brandId: lead.brandId,
          name,
          titlePrefix: lead.titlePrefix,
          firstName: lead.firstName,
          lastName: lead.lastName,
          nickname: lead.nickname,
          sex: lead.sex,
          email: lead.email,
          phone: lead.phone,
          source: lead.source,
          stage: "converted",
          interest: lead.interest,
          birthDate: lead.birthDate,
          idCard: lead.idCard,
          address: lead.address,
          city: lead.city,
          state: lead.state,
          postalCode: lead.postalCode,
          country: lead.country,
          notes: lead.notes,
          status: "active",
        },
      });

      // Transfer all extras from lead → customer
      await tx.customerAddress.updateMany({
        where: { leadId: id, customerId: null },
        data: { customerId: customer.id },
      });
      await tx.customerJob.updateMany({
        where: { leadId: id, customerId: null },
        data: { customerId: customer.id },
      });
      await tx.customerEducation.updateMany({
        where: { leadId: id, customerId: null },
        data: { customerId: customer.id },
      });
      await tx.customerEmergencyContact.updateMany({
        where: { leadId: id, customerId: null },
        data: { customerId: customer.id },
      });
      await tx.customerMedical.updateMany({
        where: { leadId: id, customerId: null },
        data: { customerId: customer.id },
      });
      await tx.customerDiving.updateMany({
        where: { leadId: id, customerId: null },
        data: { customerId: customer.id },
      });
      await tx.customerSocial.updateMany({
        where: { leadId: id, customerId: null },
        data: { customerId: customer.id },
      });
      await tx.customerFile.updateMany({
        where: { leadId: id, customerId: null },
        data: { customerId: customer.id },
      });

      // Transfer deals
      await tx.deal.updateMany({
        where: { leadId: id, customerId: null },
        data: { customerId: customer.id },
      });

      // Transfer campaign memberships
      await tx.campaignMember.updateMany({
        where: { leadId: id, customerId: null },
        data: { customerId: customer.id },
      });

      let closedStageId = lead.stage;
      try {
        const closedWonStage = await tx.leadStage.findFirst({
          where: { brandId: lead.brandId, name: { contains: "Closed Won", mode: "insensitive" } },
        });
        if (closedWonStage) closedStageId = closedWonStage.id;
      } catch {}

      await tx.lead.update({
        where: { id },
        data: {
          customerId: customer.id,
          stage: closedStageId,
          status: "converted",
        },
      });

      return customer;
    });

    return NextResponse.json({
      message: "Lead converted to customer",
      customerId: result.id,
      customerName: result.name,
    });
  } catch (err) {
    console.error("Convert lead error:", err);
    return NextResponse.json({ error: "Failed to convert lead" }, { status: 500 });
  }
}
