import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadToBunny, extractPathFromCdnUrl, deleteFromBunny } from "@/lib/bunny-storage";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const notes = (formData.get("notes") as string) || null;

  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `leads/${id}/${timestamp}_${safeName}`;

  const fileUrl = await uploadToBunny(filePath, buffer);
  const isImage = file.type.startsWith("image/");

  const record = await db.customerFile.create({
    data: {
      leadId: id,
      fileName: file.name,
      fileUrl,
      fileType: isImage ? "image" : "document",
      fileSize: buffer.length,
      notes,
    },
  });

  return NextResponse.json(record, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("fileId");
  if (!fileId) return NextResponse.json({ error: "fileId required" }, { status: 400 });

  const file = await db.customerFile.findUnique({ where: { id: fileId } });
  if (file?.fileUrl) {
    const storagePath = extractPathFromCdnUrl(file.fileUrl);
    if (storagePath) {
      try { await deleteFromBunny(storagePath); } catch { /* ignore */ }
    }
  }

  await db.customerFile.delete({ where: { id: fileId } });
  return NextResponse.json({ success: true });
}
