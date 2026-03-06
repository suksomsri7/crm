import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { memberId } = await params;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "File required" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads", "campaign-members", memberId);
  await mkdir(dir, { recursive: true });

  const ts = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${ts}-${safeName}`;
  const filePath = path.join(dir, fileName);
  await writeFile(filePath, buffer);

  const attachment = await db.campaignAttachment.create({
    data: {
      memberId,
      fileName: file.name,
      fileUrl: `/uploads/campaign-members/${memberId}/${fileName}`,
      fileSize: buffer.length,
    },
  });

  return NextResponse.json(attachment, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("fileId");
  if (!fileId) return NextResponse.json({ error: "fileId required" }, { status: 400 });

  const attachment = await db.campaignAttachment.findUnique({ where: { id: fileId } });
  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await unlink(path.join(process.cwd(), "public", attachment.fileUrl));
  } catch { /* file may not exist */ }

  await db.campaignAttachment.delete({ where: { id: fileId } });
  return NextResponse.json({ success: true });
}
