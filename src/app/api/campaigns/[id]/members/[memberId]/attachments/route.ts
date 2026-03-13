import { NextRequest, NextResponse } from "next/server";
import { authOrApiKey } from "@/lib/api-key-auth";
import { db } from "@/lib/db";
import { uploadToBunny, extractPathFromCdnUrl, deleteFromBunny } from "@/lib/bunny-storage";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { memberId } = await params;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "File required" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const ts = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `campaign-members/${memberId}/${ts}-${safeName}`;

  const fileUrl = await uploadToBunny(filePath, buffer);

  const attachment = await db.campaignAttachment.create({
    data: {
      memberId,
      fileName: file.name,
      fileUrl,
      fileSize: buffer.length,
    },
  });

  return NextResponse.json(attachment, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("fileId");
  if (!fileId) return NextResponse.json({ error: "fileId required" }, { status: 400 });

  const attachment = await db.campaignAttachment.findUnique({ where: { id: fileId } });
  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (attachment.fileUrl) {
    const storagePath = extractPathFromCdnUrl(attachment.fileUrl);
    if (storagePath) {
      try { await deleteFromBunny(storagePath); } catch { /* ignore */ }
    }
  }

  await db.campaignAttachment.delete({ where: { id: fileId } });
  return NextResponse.json({ success: true });
}
