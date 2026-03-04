"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Target,
  HandCoins,
  Megaphone,
  Ticket,
  UserCog,
  Building2,
  Shield,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { useBrand } from "@/components/providers/brand-provider";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  superAdminOnly?: boolean;
};

type NavSection = {
  title: string;
  items: NavItem[];
  superAdminOnly?: boolean;
};

function NavItemLink({
  item,
  isActive,
  isCollapsed,
}: {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
}) {
  const Icon = item.icon;
  const content = (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-md text-sm transition-colors",
        "px-3 py-2 hover:bg-accent/50",
        isActive && "bg-accent font-medium",
        isCollapsed && "justify-center px-2"
      )}
    >
      <Icon className="size-5 shrink-0" />
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

const BRAND_CRM_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users, permission: "customers:read" },
  { href: "/leads", label: "Leads", icon: Target, permission: "leads:read" },
  { href: "/deals", label: "Deals", icon: HandCoins, permission: "deals:read" },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone, permission: "campaigns:read" },
  { href: "/tickets", label: "Tickets", icon: Ticket, permission: "tickets:read" },
];

const MANAGEMENT_SECTION: NavSection = {
  title: "MANAGEMENT",
  superAdminOnly: true,
  items: [
    { href: "/management/users", label: "Users", icon: UserCog, superAdminOnly: true },
    { href: "/management/brands", label: "Brands", icon: Building2, superAdminOnly: true },
    { href: "/management/roles", label: "Roles", icon: Shield, superAdminOnly: true },
  ],
};

export function Sidebar({
  isCollapsed,
  onToggle,
}: {
  isCollapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const { activeBrand, hasPermission, isSuperAdmin } = useBrand();

  const isItemVisible = (item: NavItem) => {
    if (item.superAdminOnly) return isSuperAdmin;
    if (item.permission) return isSuperAdmin || hasPermission(item.permission);
    return true;
  };

  const brandName = activeBrand?.name;

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
                <span className="text-xs font-normal text-muted-foreground">
                  System
                </span>
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
            {isCollapsed ? (
              <PanelLeft className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-2 py-4">
          <nav className="flex flex-col gap-6">
            {/* Brand CRM Section */}
            {(activeBrand || isSuperAdmin) && (
              <div>
                {!isCollapsed && brandName && (
                  <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {brandName}
                  </h3>
                )}
                {!isCollapsed && !brandName && isSuperAdmin && (
                  <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    CRM
                  </h3>
                )}
                <div className="flex flex-col gap-0.5">
                  {BRAND_CRM_ITEMS.filter(isItemVisible).map((item) => (
                    <NavItemLink
                      key={item.href}
                      item={item}
                      isActive={pathname === item.href}
                      isCollapsed={isCollapsed}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Management Section - Super Admin only */}
            {isSuperAdmin && (
              <div>
                {!isCollapsed && (
                  <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {MANAGEMENT_SECTION.title}
                  </h3>
                )}
                {isCollapsed && <Separator className="my-2" />}
                <div className="flex flex-col gap-0.5">
                  {MANAGEMENT_SECTION.items.map((item) => (
                    <NavItemLink
                      key={item.href}
                      item={item}
                      isActive={pathname === item.href || pathname.startsWith(item.href)}
                      isCollapsed={isCollapsed}
                    />
                  ))}
                </div>
              </div>
            )}
          </nav>
        </ScrollArea>

        <Separator />

        {/* Bottom: Settings */}
        <div className="shrink-0 px-2 py-4">
          <div className="flex flex-col gap-0.5">
            <NavItemLink
              item={{ href: "/settings", label: "Settings", icon: Settings }}
              isActive={pathname === "/settings"}
              isCollapsed={isCollapsed}
            />
          </div>
        </div>
      </TooltipProvider>
    </aside>
  );
}
