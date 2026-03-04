import { auth } from "@/lib/auth";
import { SessionUser, BrandAccess } from "@/lib/auth-types";
import { redirect } from "next/navigation";

export async function getSession() {
  const session = await auth();
  return session;
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session.user as SessionUser;
}

export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (!user.isSuperAdmin) {
    redirect("/dashboard");
  }
  return user;
}

export function getActiveBrand(user: SessionUser): BrandAccess | null {
  if (!user.activeBrandId || !user.brands) return user.brands?.[0] ?? null;
  return user.brands.find((b) => b.id === user.activeBrandId) ?? user.brands[0] ?? null;
}

export function hasPermission(user: SessionUser, permission: string): boolean {
  if (user.isSuperAdmin) return true;
  const brand = getActiveBrand(user);
  if (!brand) return false;
  return brand.permissions.includes(permission);
}
