"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { BrandAccess } from "@/lib/auth-types";

interface BrandContextType {
  activeBrand: BrandAccess | null;
  brands: BrandAccess[];
  switchBrand: (brandId: string) => void;
  hasPermission: (permission: string) => boolean;
  isSuperAdmin: boolean;
}

const BrandContext = createContext<BrandContextType>({
  activeBrand: null,
  brands: [],
  switchBrand: () => {},
  hasPermission: () => false,
  isSuperAdmin: false,
});

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const { data: session, update } = useSession();
  const user = session?.user as any;

  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.activeBrandId && !activeBrandId) {
      setActiveBrandId(user.activeBrandId);
    } else if (user?.brands?.length > 0 && !activeBrandId) {
      setActiveBrandId(user.brands[0].id);
    }
  }, [user, activeBrandId]);

  const brands: BrandAccess[] = user?.brands ?? [];
  const activeBrand = brands.find((b) => b.id === activeBrandId) ?? brands[0] ?? null;
  const isSuperAdmin = user?.isSuperAdmin ?? false;

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
      value={{ activeBrand, brands, switchBrand, hasPermission, isSuperAdmin }}
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
