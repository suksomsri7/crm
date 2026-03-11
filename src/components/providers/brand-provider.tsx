"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { BrandAccess } from "@/lib/auth-types";

interface BrandContextType {
  activeBrand: BrandAccess | null;
  brands: BrandAccess[];
  allBrands: BrandAccess[];
  switchBrand: (brandId: string) => void;
  hasPermission: (permission: string) => boolean;
  isSuperAdmin: boolean;
}

const BrandContext = createContext<BrandContextType>({
  activeBrand: null,
  brands: [],
  allBrands: [],
  switchBrand: () => {},
  hasPermission: () => false,
  isSuperAdmin: false,
});

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const { data: session, update } = useSession();
  const user = session?.user as any;

  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [superAdminBrands, setSuperAdminBrands] = useState<BrandAccess[]>([]);

  const isSuperAdmin = user?.isSuperAdmin ?? false;
  const sessionBrands: BrandAccess[] = user?.brands ?? [];

  useEffect(() => {
    if (!isSuperAdmin || !user) return;
    let cancelled = false;
    fetch("/api/brands")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return;
        const mapped: BrandAccess[] = data
          .filter((b: any) => b.isActive)
          .map((b: any) => ({
            id: b.id,
            name: b.name,
            logoUrl: b.logoUrl,
            roleId: "",
            roleName: "Super Admin",
            permissions: [],
          }));
        setSuperAdminBrands(mapped);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isSuperAdmin, user]);

  const allBrands = isSuperAdmin
    ? superAdminBrands.length > 0 ? superAdminBrands : sessionBrands
    : sessionBrands;

  useEffect(() => {
    if (allBrands.length > 0 && !activeBrandId) {
      setActiveBrandId(user?.activeBrandId || allBrands[0].id);
    }
  }, [allBrands, activeBrandId, user?.activeBrandId]);

  const activeBrand = allBrands.find((b) => b.id === activeBrandId) ?? allBrands[0] ?? null;

  const switchBrand = useCallback(
    (brandId: string) => {
      setActiveBrandId(brandId);
      update({ activeBrandId: brandId });
    },
    [update]
  );

  const hasPermission = useCallback(
    (permission: string) => {
      if (isSuperAdmin) return true;
      if (!activeBrand) return false;
      return activeBrand.permissions.includes(permission);
    },
    [isSuperAdmin, activeBrand]
  );

  return (
    <BrandContext.Provider
      value={{ activeBrand, brands: sessionBrands, allBrands, switchBrand, hasPermission, isSuperAdmin }}
    >
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error("useBrand must be used within a BrandProvider");
  }
  return context;
}
