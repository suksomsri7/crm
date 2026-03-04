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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users,
  Target,
  HandCoins,
  Ticket,
  Activity,
  Clock,
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

type TaskItem = {
  id: string;
  title: string;
  dueDate: string | null;
  priority: string;
  status: string;
};

type DashboardData = {
  stats: DashboardStats;
  recentActivities: ActivityItem[];
  upcomingTasks: TaskItem[];
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getActivityIcon(type: string) {
  switch (type) {
    case "note":
      return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    case "call":
      return <Phone className="h-4 w-4 text-muted-foreground" />;
    case "email":
      return <Mail className="h-4 w-4 text-muted-foreground" />;
    case "meeting":
      return <Calendar className="h-4 w-4 text-muted-foreground" />;
    case "status_change":
      return <ArrowUpRight className="h-4 w-4 text-muted-foreground" />;
    case "assignment":
      return <UserPlus className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { activeBrand, isSuperAdmin } = useBrand();
  const brandId = activeBrand?.id;
  const userName = session?.user?.name ?? "User";

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);

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

  const handleToggleTask = async (task: TaskItem) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    try {
      setTogglingTaskId(task.id);
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      fetchDashboard();
    } finally {
      setTogglingTaskId(null);
    }
  };

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

  const stats = data?.stats ?? {
    totalCustomers: 0,
    activeLeads: 0,
    openDeals: 0,
    openTickets: 0,
  };
  const recentActivities = data?.recentActivities ?? [];
  const upcomingTasks = data?.upcomingTasks ?? [];

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
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Customers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalCustomers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Leads
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.activeLeads}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open Deals
            </CardTitle>
            <HandCoins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.openDeals}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open Tickets
            </CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.openTickets}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Upcoming Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                          {formatDistanceToNow(new Date(act.createdAt), {
                            addSuffix: true,
                          })}
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Upcoming Tasks</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {upcomingTasks.length === 0 ? (
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-muted-foreground">No upcoming tasks</p>
              </div>
            ) : (
              <div className="space-y-0">
                {upcomingTasks.map((task, i) => (
                  <div key={task.id}>
                    <div className="flex items-center gap-3 py-3">
                      <Checkbox
                        checked={task.status === "completed"}
                        onCheckedChange={() => handleToggleTask(task)}
                        disabled={togglingTaskId === task.id}
                        className="shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm truncate ${
                            task.status === "completed"
                              ? "line-through text-muted-foreground"
                              : "font-medium"
                          }`}
                        >
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {task.dueDate && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          <Badge
                            variant={
                              task.priority === "high"
                                ? "destructive"
                                : task.priority === "low"
                                ? "secondary"
                                : "default"
                            }
                            className="text-xs"
                          >
                            {task.priority}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {task.status.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {i < upcomingTasks.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
