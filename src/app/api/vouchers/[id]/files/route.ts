import { NextRequest, NextResponse } from "next/server";
import { authOrApiKey } from "@/lib/api-key-auth";
import { db } from "@/lib/db";
import { uploadToBunny, extractPathFromCdnUrl, deleteFromBunny } from "@/lib/bunny-storage";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const images = await db.voucherImage.findMany({
    where: { voucherId: id },
    orderBy: [{ isCover: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ images });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const voucher = await db.voucher.findUnique({ where: { id } });
  if (!voucher) return NextResponse.json({ error: "Voucher not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const isCover = formData.get("isCover") === "true";

  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `vouchers/${id}/${timestamp}_${safeName}`;

  const fileUrl = await uploadToBunny(filePath, buffer);

  const record = await db.voucherImage.create({
    data: {
      voucherId: id,
      fileName: file.name,
      fileUrl,
      fileSize: buffer.length,
      isCover,
    },
  });

  if (isCover) {
    await db.voucher.update({
      where: { id },
      data: { coverUrl: fileUrl },
    });
  }

  return NextResponse.json(record, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authOrApiKey(req);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("fileId");
  if (!fileId) return NextResponse.json({ error: "fileId required" }, { status: 400 });

  const image = await db.voucherImage.findUnique({ where: { id: fileId } });
  if (!image) return NextResponse.json({ error: "Image not found" }, { status: 404 });

  if (image.fileUrl) {
    const storagePath = extractPathFromCdnUrl(image.fileUrl);
    if (storagePath) {
      try { await deleteFromBunny(storagePath); } catch { /* ignore */ }
    }
  }

  if (image.isCover) {
    await db.voucher.update({
      where: { id: image.voucherId },
      data: { coverUrl: null },
    });
  }

  await db.voucherImage.delete({ where: { id: fileId } });
  return NextResponse.json({ success: true });
}
