const STORAGE_API_KEY = process.env.BUNNY_STORAGE_API_KEY!;
const STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE!;
const STORAGE_REGION = process.env.BUNNY_STORAGE_REGION || "";
const CDN_URL = process.env.BUNNY_CDN_URL!;

function getStorageHost() {
  if (!STORAGE_REGION || STORAGE_REGION === "de") {
    return "storage.bunnycdn.com";
  }
  return `${STORAGE_REGION}.storage.bunnycdn.com`;
}

export async function uploadToBunny(
  filePath: string,
  buffer: Buffer
): Promise<string> {
  const host = getStorageHost();
  const url = `https://${host}/${STORAGE_ZONE}/${filePath}`;

  const body = new Uint8Array(buffer);
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      AccessKey: STORAGE_API_KEY,
      "Content-Type": "application/octet-stream",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bunny upload failed (${res.status}): ${text}`);
  }

  return `${CDN_URL}/${filePath}`;
}

export async function deleteFromBunny(filePath: string): Promise<void> {
  const host = getStorageHost();
  const url = `https://${host}/${STORAGE_ZONE}/${filePath}`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      AccessKey: STORAGE_API_KEY,
    },
  });

  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`Bunny delete failed (${res.status}): ${text}`);
  }
}

export function cdnUrl(filePath: string): string {
  return `${CDN_URL}/${filePath}`;
}

export function extractPathFromCdnUrl(url: string): string | null {
  if (!url.startsWith(CDN_URL)) return null;
  return url.slice(CDN_URL.length + 1);
}
