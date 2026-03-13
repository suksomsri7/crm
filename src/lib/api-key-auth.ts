import { NextRequest } from "next/server";
import { createHash, randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { BrandAccess } from "@/lib/auth-types";

// ---------------------------------------------------------------------------
// Key generation & hashing
// ---------------------------------------------------------------------------

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = `crm_${randomBytes(32).toString("hex")}`;
  const hash = hashApiKey(raw);
  const prefix = raw.slice(0, 12);
  return { raw, hash, prefix };
}

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

// ---------------------------------------------------------------------------
// Resolve user from API key → returns session-compatible shape
// ---------------------------------------------------------------------------

async function resolveApiKey(req: NextRequest) {
  const key = req.headers.get("x-api-key");
  if (!key) return null;

  const keyHash = hashApiKey(key);

  const apiKey = await db.apiKey.findUnique({
    where: { keyHash },
    include: {
      user: { select: { id: true, email: true, fullName: true, avatarUrl: true, isSuperAdmin: true, isActive: true } },
      brand: { select: { id: true, name: true, logoUrl: true } },
    },
  });

  if (!apiKey) return null;
  if (!apiKey.isActive) return null;
  if (!apiKey.user.isActive) return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  db.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

  const brand: BrandAccess = {
    id: apiKey.brand.id,
    name: apiKey.brand.name,
    logoUrl: apiKey.brand.logoUrl,
    roleId: "api-key",
    roleName: "API Key",
    permissions: apiKey.permissions,
  };

  return {
    user: {
      id: apiKey.user.id,
      email: apiKey.user.email ?? "",
      name: apiKey.user.fullName,
      image: apiKey.user.avatarUrl,
      isSuperAdmin: apiKey.user.isSuperAdmin,
      brands: [brand],
      activeBrandId: apiKey.brand.id,
    },
  };
}

// ---------------------------------------------------------------------------
// Drop-in replacement for auth() — tries session first, then API key.
// Returns the same shape as NextAuth's auth(): { user } | null
// ---------------------------------------------------------------------------

export async function authOrApiKey(req: NextRequest) {
  const session = await auth();
  if (session?.user) return session;

  return resolveApiKey(req);
}
