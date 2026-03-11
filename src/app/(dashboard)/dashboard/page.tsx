"use client";

import { useState, useEffect, useCallback } from "react";
import { useBrand } from "@/components/providers/brand-provider";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  Target,
  HandCoins,
  Gift,
  Activity,
  ArrowUpRight,
  Loader2,
  MessageSquare,
  Phone,
  Mail,
  Calendar,
  UserPlus,
  DollarSign,
  Megaphone,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from "recharts";

type DashboardStats = {
  totalCustomers: number;
  activeLeads: number;
  totalDeals: number;
  openDeals: number;
  totalVouchers: number;
  activeVouchers: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalRevenue: number;
  wonRevenue: number;
  totalVoucherUsed: number;
};

type ActivityItem = {
  id: string;
  type: string;
  title: string;
  createdAt: string;
  user: { id: string; fullName: string; avatarUrl: string | null } | null;
};

type StageGroup = {
  stage: string;
  _count: number;
  _sum?: { value: number | null };
};

type MonthlyTrend = {
  month: string;
  customers: number;
  leads: number;
};

type DashboardData = {
  stats: DashboardStats;
  recentActivities: ActivityItem[];
  dealsByStage: StageGroup[];
  leadsByStage: StageGroup[];
  monthlyTrend: MonthlyTrend[];
};

function formatStage(stage: string): string {
  return stage.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function fmt(val: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(val);
}

function num(val: number): string {
  return new Intl.NumberFormat("en-US").format(val);
}

function getActivityIcon(type: string) {
  const cls = "h-4 w-4 text-muted-foreground";
  switch (type) {
    case "note": return <MessageSquare className={cls} />;
    case "call": return <Phone className={cls} />;
    case "email": return <Mail className={cls} />;
    case "meeting": return <Calendar className={cls} />;
    case "status_change": return <ArrowUpRight className={cls} />;
    case "assignment": return <UserPlus className={cls} />;
    default: return <Activity className={cls} />;
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
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [brandId, isSuperAdmin]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  if (!activeBrand && !isSuperAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Welcome back, {userName}</p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">No brand assigned. Please contact your administrator.</p>
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

  const s = data?.stats ?? {
    totalCustomers: 0, activeLeads: 0, totalDeals: 0, openDeals: 0,
    totalVouchers: 0, activeVouchers: 0, totalCampaigns: 0, activeCampaigns: 0,
    totalRevenue: 0, wonRevenue: 0, totalVoucherUsed: 0,
  };
  const recentActivities = data?.recentActivities ?? [];

  const dealsChartData = (data?.dealsByStage ?? []).map((d) => ({
    name: formatStage(d.stage),
    count: d._count,
    value: d._sum?.value ?? 0,
  }));

  const leadsChartData = (data?.leadsByStage ?? []).map((l) => ({
    name: formatStage(l.stage),
    count: l._count,
  }));

  const monthlyTrend = data?.monthlyTrend ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Welcome back, {userName}</p>
      </div>

      {/* Row 1: Key numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Won Revenue</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(s.wonRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">Total: {fmt(s.totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{num(s.totalCustomers)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Leads</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{num(s.activeLeads)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Deals</CardTitle>
            <HandCoins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{num(s.openDeals)}</p>
            <p className="text-xs text-muted-foreground mt-1">Total: {num(s.totalDeals)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Secondary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vouchers</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{num(s.activeVouchers)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {num(s.totalVouchers)} total · {num(s.totalVoucherUsed)} used
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Campaigns</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{num(s.activeCampaigns)}</p>
            <p className="text-xs text-muted-foreground mt-1">{num(s.totalCampaigns)} total</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Quick Summary</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-bold">{num(s.totalCustomers)}</p>
                <p className="text-[11px] text-muted-foreground">Customers</p>
              </div>
              <div>
                <p className="text-lg font-bold">{num(s.activeLeads)}</p>
                <p className="text-[11px] text-muted-foreground">Active Leads</p>
              </div>
              <div>
                <p className="text-lg font-bold">{num(s.totalDeals)}</p>
                <p className="text-[11px] text-muted-foreground">Deals</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend Chart */}
      {monthlyTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Growth Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="customers" stroke="#18181b" fill="#18181b" fillOpacity={0.1} strokeWidth={2} name="Customers" />
                <Area type="monotone" dataKey="leads" stroke="#71717a" fill="#71717a" fillOpacity={0.08} strokeWidth={2} name="Leads" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deals by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            {dealsChartData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px]">
                <p className="text-muted-foreground">No deal data</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dealsChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis dataKey="name" type="category" fontSize={11} width={100} tickLine={false} />
                  <Tooltip formatter={(value) => typeof value === "number" ? fmt(value) : value} />
                  <Bar dataKey="count" fill="#18181b" radius={[0, 4, 4, 0]} name="Count" />
                  <Bar dataKey="value" fill="#a1a1aa" radius={[0, 4, 4, 0]} name="Value" />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            {leadsChartData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px]">
                <p className="text-muted-foreground">No lead data</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={leadsChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#18181b" radius={[4, 4, 0, 0]} name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            )}
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
