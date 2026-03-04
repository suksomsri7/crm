"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Target,
  HandCoins,
  Megaphone,
  Ticket,
  BarChart3,
  UserCog,
  Building2,
  Shield,
  Settings,
  PanelLeftClose,
  PanelLeft,
  ChevronRight,
  Store,
} from "lucide-react";
import { useBrand } from "@/components/providers/brand-provider";
import { BrandAccess } from "@/lib/auth-types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
};

const CRM_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Target, permission: "leads:read" },
  { href: "/customers", label: "Customers", icon: Users, permission: "customers:read" },
  { href: "/deals", label: "Deals", icon: HandCoins, permission: "deals:read" },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone, permission: "campaigns:read" },
  { href: "/tickets", label: "Tickets", icon: Ticket, permission: "tickets:read" },
  { href: "/reports", label: "Reports", icon: BarChart3, permission: "reports:read" },
];

const MANAGEMENT_ITEMS: NavItem[] = [
  { href: "/management/users", label: "Users", icon: UserCog },
  { href: "/management/brands", label: "Brands", icon: Building2 },
  { href: "/management/roles", label: "Roles", icon: Shield },
  { href: "/management/sources", label: "Sources", icon: Target },
];

function NavItemLink({
  item,
  isActive,
  isCollapsed,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  const content = (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-md text-sm transition-colors",
        "px-3 py-1.5 hover:bg-accent/50",
        isActive && "bg-accent font-medium",
        isCollapsed && "justify-center px-2"
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!isCollapsed && <span>{item.label}</span>}
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

function BrandSection({
  brand,
  isActive,
  isOpen,
  onToggle,
  onSelectBrand,
  isCollapsed,
  pathname,
  isSuperAdmin,
}: {
  brand: BrandAccess;
  isActive: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onSelectBrand: () => void;
  isCollapsed: boolean;
  pathname: string;
  isSuperAdmin: boolean;
}) {
  const visibleItems = CRM_ITEMS.filter((item) => {
    if (isSuperAdmin) return true;
    if (!item.permission) return true;
    return brand.permissions.includes(item.permission);
  });

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            onClick={onSelectBrand}
            className={cn(
              "flex items-center justify-center rounded-md p-2 transition-colors hover:bg-accent/50",
              isActive && "bg-accent"
            )}
          >
            <Store className="size-5 shrink-0" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          {brand.name}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent/50",
            isActive && "bg-accent/30"
          )}
        >
          <Store className="size-4 shrink-0" />
          <span className="flex-1 truncate text-left">{brand.name}</span>
          <ChevronRight
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-90"
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-3 flex flex-col gap-0.5 border-l pl-3 pt-1">
          {visibleItems.map((item) => (
            <NavItemLink
              key={item.href}
              item={item}
              isActive={isActive && pathname === item.href}
              isCollapsed={false}
              onClick={onSelectBrand}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function Sidebar({
  isCollapsed,
  onToggle,
}: {
  isCollapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeBrand, allBrands, switchBrand, isSuperAdmin } = useBrand();

  const [openBrands, setOpenBrands] = useState<Set<string>>(() => {
    if (activeBrand) return new Set([activeBrand.id]);
    return new Set();
  });

  const toggleBrand = (brandId: string) => {
    setOpenBrands((prev) => {
      const next = new Set(prev);
      if (next.has(brandId)) next.delete(brandId);
      else next.add(brandId);
      return next;
    });
  };

  const handleSelectBrand = (brandId: string) => {
    switchBrand(brandId);
    setOpenBrands((prev) => new Set(prev).add(brandId));
  };

  const isManagementPage = pathname.startsWith("/management");

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r bg-background transition-all duration-300",
        isCollapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      <TooltipProvider delayDuration={0}>
        {/* Logo & Toggle */}
        <div
          className={cn(
            "flex shrink-0 items-center justify-between border-b px-3 py-4",
            isCollapsed && "flex-col items-center gap-2"
          )}
        >
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-2 font-bold transition-opacity hover:opacity-80",
              isCollapsed && "flex-col"
            )}
          >
            {isCollapsed ? (
              <span className="text-xl">C</span>
            ) : (
              <div className="flex flex-col">
                <span className="text-lg">CRM</span>
                <span className="text-xs font-normal text-muted-foreground">System</span>
              </div>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="shrink-0"
          >
            {isCollapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-2 py-4">
          <nav className="flex flex-col gap-1">
            {/* Brand sections */}
            {!isCollapsed && allBrands.length > 0 && (
              <h3 className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Brands
              </h3>
            )}
            {allBrands.map((brand) => (
              <BrandSection
                key={brand.id}
                brand={brand}
                isActive={activeBrand?.id === brand.id && !isManagementPage}
                isOpen={openBrands.has(brand.id)}
                onToggle={() => toggleBrand(brand.id)}
                onSelectBrand={() => handleSelectBrand(brand.id)}
                isCollapsed={isCollapsed}
                pathname={pathname}
                isSuperAdmin={isSuperAdmin}
              />
            ))}

            {allBrands.length === 0 && !isSuperAdmin && !isCollapsed && (
              <p className="px-3 text-xs text-muted-foreground">No brands assigned</p>
            )}

            {/* Management Section - Super Admin only */}
            {isSuperAdmin && (
              <>
                {!isCollapsed && <Separator className="my-3" />}
                {isCollapsed && <Separator className="my-2" />}
                {!isCollapsed && (
                  <h3 className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Management
                  </h3>
                )}
                <div className="flex flex-col gap-0.5">
                  {MANAGEMENT_ITEMS.map((item) => (
                    <NavItemLink
                      key={item.href}
                      item={item}
                      isActive={pathname === item.href || pathname.startsWith(item.href)}
                      isCollapsed={isCollapsed}
                    />
                  ))}
                </div>
              </>
            )}
          </nav>
        </ScrollArea>

        <Separator />

        {/* Bottom: Settings */}
        <div className="shrink-0 px-2 py-4">
          <NavItemLink
            item={{ href: "/settings", label: "Settings", icon: Settings }}
            isActive={pathname === "/settings"}
            isCollapsed={isCollapsed}
          />
        </div>
      </TooltipProvider>
    </aside>
  );
}
