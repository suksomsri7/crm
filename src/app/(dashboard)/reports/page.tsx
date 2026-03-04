"use client";

import { useState, useEffect, useCallback } from "react";
import { useBrand } from "@/components/providers/brand-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Download, DollarSign, Users, Target, Ticket, TrendingUp, BarChart3, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

const COLORS = ["#000000", "#333333", "#666666", "#999999", "#CCCCCC"];

const REPORT_TYPES = [
  { value: "sales", label: "Sales", icon: DollarSign },
  { value: "customers", label: "Customers", icon: Users },
  { value: "leads", label: "Leads", icon: Target },
  { value: "tickets", label: "Tickets", icon: Ticket },
] as const;

type ReportType = (typeof REPORT_TYPES)[number]["value"];

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function SalesReport({ data }: { data: any }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(data.summary.totalRevenue)}
          icon={DollarSign}
        />
        <StatCard
          title="Deal Count"
          value={data.summary.dealCount}
          icon={BarChart3}
        />
        <StatCard
          title="Avg Deal Size"
          value={formatCurrency(data.summary.avgDealSize)}
          icon={TrendingUp}
        />
        <StatCard
          title="Win Rate"
          value={`${data.summary.winRate}%`}
          icon={Target}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {data.monthly.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No data for selected period
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip
                    formatter={(value) => typeof value === "number" ? formatCurrency(value) : value}
                  />
                  <Bar dataKey="value" fill="#000000" radius={[4, 4, 0, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deals by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            {data.dealsByStage.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No data for selected period
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.dealsByStage}
                    dataKey="count"
                    nameKey="stage"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, value }: any) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {data.dealsByStage.map((_: any, i: number) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={COLORS[i % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function CustomersReport({ data }: { data: any }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Customers"
          value={data.summary.totalCount}
          icon={Users}
        />
        {data.statusBreakdown.map((s: any) => (
          <StatCard
            key={s.status}
            title={s.status}
            value={s.count}
            icon={Users}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer Growth</CardTitle>
          </CardHeader>
          <CardContent>
            {data.monthly.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No data for selected period
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#000000"
                    strokeWidth={2}
                    dot={{ fill: "#000000" }}
                    name="New Customers"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {data.statusBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No data for selected period
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.statusBreakdown}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, value }: any) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {data.statusBreakdown.map((_: any, i: number) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={COLORS[i % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function LeadsReport({ data }: { data: any }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Leads"
          value={data.summary.totalLeads}
          icon={Target}
        />
        <StatCard
          title="Conversion Rate"
          value={`${data.summary.conversionRate}%`}
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Leads</CardTitle>
          </CardHeader>
          <CardContent>
            {data.monthly.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No data for selected period
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#000000" radius={[4, 4, 0, 0]} name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Sources</CardTitle>
          </CardHeader>
          <CardContent>
            {data.sourceBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No data for selected period
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.sourceBreakdown}
                    dataKey="count"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, value }: any) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {data.sourceBreakdown.map((_: any, i: number) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={COLORS[i % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leads by Stage</CardTitle>
        </CardHeader>
        <CardContent>
          {data.stageBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No data for selected period
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.stageBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis type="number" fontSize={12} />
                <YAxis dataKey="stage" type="category" fontSize={12} width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#333333" radius={[0, 4, 4, 0]} name="Count" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function TicketsReport({ data }: { data: any }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Tickets"
          value={data.summary.totalTickets}
          icon={Ticket}
        />
        <StatCard
          title="Avg Resolution Time"
          value={`${data.summary.avgResolutionHours}h`}
          icon={Clock}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            {data.monthly.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No data for selected period
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#000000" radius={[4, 4, 0, 0]} name="Tickets" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tickets by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {data.statusBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No data for selected period
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.statusBreakdown}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, value }: any) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {data.statusBreakdown.map((_: any, i: number) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={COLORS[i % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tickets by Priority</CardTitle>
        </CardHeader>
        <CardContent>
          {data.priorityBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No data for selected period
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.priorityBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis type="number" fontSize={12} />
                <YAxis
                  dataKey="priority"
                  type="category"
                  fontSize={12}
                  width={80}
                />
                <Tooltip />
                <Bar dataKey="count" fill="#333333" radius={[0, 4, 4, 0]} name="Count" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export default function ReportsPage() {
  const { activeBrand, isSuperAdmin } = useBrand();
  const brandId = activeBrand?.id;

  const [reportType, setReportType] = useState<ReportType>("sales");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    if (!brandId && !isSuperAdmin) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (brandId) params.set("brandId", brandId);
      params.set("type", reportType);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch report");
      setData(await res.json());
    } catch {
      toast.error("Failed to load report data");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [brandId, isSuperAdmin, reportType, dateFrom, dateTo]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  if (!activeBrand && !isSuperAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground">
            Analytics and reporting
          </p>
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground">
            Analytics and reporting
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast.info("Export coming soon")}
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex rounded-md border overflow-hidden">
          {REPORT_TYPES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setReportType(value)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                reportType === value
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[150px] h-9"
            placeholder="From"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[150px] h-9"
            placeholder="To"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      ) : !data ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">No report data available</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reportType === "sales" && <SalesReport data={data} />}
          {reportType === "customers" && <CustomersReport data={data} />}
          {reportType === "leads" && <LeadsReport data={data} />}
          {reportType === "tickets" && <TicketsReport data={data} />}
        </div>
      )}
    </div>
  );
}
