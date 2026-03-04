"use client";

import { useState, useEffect, useCallback } from "react";
import { useBrand } from "@/components/providers/brand-provider";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  Target,
  HandCoins,
  Ticket,
  Activity,
  ArrowUpRight,
  Loader2,
  MessageSquare,
  Phone,
  Mail,
  Calendar,
  UserPlus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type DashboardStats = {
  totalCustomers: number;
  activeLeads: number;
  openDeals: number;
  openTickets: number;
};

type ActivityItem = {
  id: string;
  type: string;
  title: string;
  createdAt: string;
  user: { id: string; fullName: string; avatarUrl: string | null } | null;
};

type DashboardData = {
  stats: DashboardStats;
  recentActivities: ActivityItem[];
};

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getActivityIcon(type: string) {
  switch (type) {
    case "note": return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    case "call": return <Phone className="h-4 w-4 text-muted-foreground" />;
    case "email": return <Mail className="h-4 w-4 text-muted-foreground" />;
    case "meeting": return <Calendar className="h-4 w-4 text-muted-foreground" />;
    case "status_change": return <ArrowUpRight className="h-4 w-4 text-muted-foreground" />;
    case "assignment": return <UserPlus className="h-4 w-4 text-muted-foreground" />;
    default: return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { activeBrand, isSuperAdmin } = useBrand();
  const brandId = activeBrand?.id;
  const userName = session?.user?.name ?? "User";

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    if (!brandId && !isSuperAdmin) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (brandId) params.set("brandId", brandId);
      const res = await fetch(`/api/dashboard?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [brandId, isSuperAdmin]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (!activeBrand && !isSuperAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Welcome back, {userName}</p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">
              No brand assigned. Please contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Welcome back, {userName}</p>
        </div>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const stats = data?.stats ?? { totalCustomers: 0, activeLeads: 0, openDeals: 0, openTickets: 0 };
  const recentActivities = data?.recentActivities ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Welcome back, {userName}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalCustomers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Leads</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.activeLeads}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Deals</CardTitle>
            <HandCoins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.openDeals}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.openTickets}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Recent Activity</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {recentActivities.length === 0 ? (
            <div className="flex items-center justify-center h-[200px]">
              <p className="text-muted-foreground">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-0">
              {recentActivities.map((act, i) => (
                <div key={act.id}>
                  <div className="flex items-start gap-3 py-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={act.user?.avatarUrl ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {act.user ? getInitials(act.user.fullName) : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{act.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {getActivityIcon(act.type)}
                  </div>
                  {i < recentActivities.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
