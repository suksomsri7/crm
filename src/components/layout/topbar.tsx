"use client";

import { useSession, signOut } from "next-auth/react";
import { useBrand } from "@/components/providers/brand-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bell, ChevronDown, LogOut, PanelLeft, PanelLeftClose, Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";

function getUserInitials(name: string | null | undefined): string {
  if (!name?.trim()) return "?";
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return words[0][0].toUpperCase();
}

export function Topbar({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) {
  const { data: session } = useSession();
  const { activeBrand, brands, switchBrand, isSuperAdmin } = useBrand();

  const showBrandSwitcher = brands.length > 1 || isSuperAdmin;
  const user = session?.user;

  return (
    <header
      className={cn(
        "sticky top-0 z-10 flex h-14 w-full items-center justify-between border-b border-border bg-background px-4"
      )}
    >
      {/* Left side */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onToggle} aria-label="Toggle sidebar">
          {isCollapsed ? (
            <PanelLeft className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </Button>
        <Separator orientation="vertical" className="h-6" />
        {showBrandSwitcher && (
          <Select
            value={activeBrand?.id ?? ""}
            onValueChange={(value) => switchBrand(value)}
          >
            <SelectTrigger className="w-[180px] h-9 border-0 bg-transparent shadow-none">
              <SelectValue placeholder="Select brand" />
            </SelectTrigger>
            <SelectContent>
              {brands.map((brand) => (
                <SelectItem key={brand.id} value={brand.id}>
                  {brand.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-4" />
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "flex items-center gap-2",
                isCollapsed ? "px-2" : "px-2 py-6"
              )}
            >
              <Avatar className="size-8">
                <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? ""} />
                <AvatarFallback>{getUserInitials(user?.name)}</AvatarFallback>
              </Avatar>
              {!isCollapsed && user && (
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-medium">{user.name}</span>
                  {activeBrand && (
                    <span className="text-xs text-muted-foreground">{activeBrand.roleName}</span>
                  )}
                </div>
              )}
              <ChevronDown className="size-4 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user?.name}</span>
                {user?.email && (
                  <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 size-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut()}
              variant="destructive"
            >
              <LogOut className="mr-2 size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
