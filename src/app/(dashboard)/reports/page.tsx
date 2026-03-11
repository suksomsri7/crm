"use client";

import { useState, useEffect, useCallback } from "react";
import { useBrand } from "@/components/providers/brand-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Download,
  DollarSign,
  Users,
  Target,
  Gift,
  TrendingUp,
  BarChart3,
  Megaphone,
  Trophy,
  UserCheck,
  Percent,
  ShieldCheck,
  Package,
  ArrowRightLeft,
  FileText,
} from "lucide-react";
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
  AreaChart,
  Area,
} from "recharts";

const COLORS = ["#18181b", "#3f3f46", "#71717a", "#a1a1aa", "#d4d4d8", "#52525b"];

const REPORT_TYPES = [
  { value: "sales", label: "Sales", icon: DollarSign },
  { value: "leads", label: "Leads", icon: Target },
  { value: "customers", label: "Customers", icon: Users },
  { value: "vouchers", label: "Vouchers", icon: Gift },
  { value: "campaigns", label: "Campaigns", icon: Megaphone },
] as const;

type ReportType = (typeof REPORT_TYPES)[number]["value"];

function fmt(val: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

function num(val: number): string {
  return new Intl.NumberFormat("en-US").format(val);
}

function StatCard({
  title,
  value,
  icon: Icon,
  sub,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-[280px]">
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

// ── Sales ────────────────────────────────────────────────────
function SalesReport({ data }: { data: any }) {
  const s = data.summary;
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="Total Revenue" value={fmt(s.totalRevenue)} icon={DollarSign} />
        <StatCard title="Won Revenue" value={fmt(s.closedWonRevenue)} icon={Trophy} />
        <StatCard title="Total Deals" value={num(s.dealCount)} icon={BarChart3} />
        <StatCard title="Open Deals" value={num(s.openDeals)} icon={FileText} />
        <StatCard title="Avg Deal Size" value={fmt(s.avgDealSize)} icon={TrendingUp} />
        <StatCard title="Win Rate" value={`${s.winRate}%`} icon={Percent} sub={`${s.closedWon}W / ${s.closedLost}L`} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Monthly Revenue</CardTitle></CardHeader>
          <CardContent>
            {data.monthly.length === 0 ? <EmptyChart label="No data" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => typeof v === "number" ? fmt(v) : v} />
                  <Area type="monotone" dataKey="value" stroke="#18181b" fill="#18181b" fillOpacity={0.1} strokeWidth={2} name="Revenue" />
                  <Area type="monotone" dataKey="count" stroke="#71717a" fill="#71717a" fillOpacity={0.05} strokeWidth={1.5} name="Deals" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Deals by Stage</CardTitle></CardHeader>
          <CardContent>
            {data.dealsByStage.length === 0 ? <EmptyChart label="No data" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.dealsByStage} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis dataKey="stage" type="category" fontSize={11} width={90} />
                  <Tooltip formatter={(v) => typeof v === "number" ? fmt(v) : v} />
                  <Bar dataKey="count" fill="#18181b" radius={[0, 4, 4, 0]} name="Count" />
                  <Bar dataKey="value" fill="#a1a1aa" radius={[0, 4, 4, 0]} name="Value" />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ── Leads ────────────────────────────────────────────────────
function LeadsReport({ data }: { data: any }) {
  const s = data.summary;
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="Total Leads" value={num(s.totalLeads)} icon={Target} />
        <StatCard title="Qualified" value={num(s.qualified)} icon={ShieldCheck} />
        <StatCard title="Converted" value={num(s.closedWon)} icon={UserCheck} />
        <StatCard title="Conversion Rate" value={`${s.conversionRate}%`} icon={Percent} />
        <StatCard title="Qualification Rate" value={`${s.qualificationRate}%`} icon={TrendingUp} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Monthly Leads</CardTitle></CardHeader>
          <CardContent>
            {data.monthly.length === 0 ? <EmptyChart label="No data" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#18181b" fill="#18181b" fillOpacity={0.1} strokeWidth={2} name="Leads" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Lead Sources</CardTitle></CardHeader>
          <CardContent>
            {data.sourceBreakdown.length === 0 ? <EmptyChart label="No data" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={data.sourceBreakdown} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={95} label={({ name, value }: any) => `${name}: ${value}`} labelLine={false}>
                    {data.sourceBreakdown.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Leads by Stage</CardTitle></CardHeader>
        <CardContent>
          {data.stageBreakdown.length === 0 ? <EmptyChart label="No data" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.stageBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="stage" fontSize={11} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="#18181b" radius={[4, 4, 0, 0]} name="Count" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// ── Customers ────────────────────────────────────────────────
function CustomersReport({ data }: { data: any }) {
  const s = data.summary;
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard title="Total Customers" value={num(s.totalCount)} icon={Users} />
        {data.statusBreakdown.map((st: any) => (
          <StatCard key={st.status} title={st.status} value={num(st.count)} icon={Users} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Customer Growth</CardTitle></CardHeader>
          <CardContent>
            {data.monthly.length === 0 ? <EmptyChart label="No data" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#18181b" fill="#18181b" fillOpacity={0.1} strokeWidth={2} name="New Customers" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Status Breakdown</CardTitle></CardHeader>
          <CardContent>
            {data.statusBreakdown.length === 0 ? <EmptyChart label="No data" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={data.statusBreakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={95} label={({ name, value }: any) => `${name}: ${value}`} labelLine={false}>
                    {data.statusBreakdown.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Customer Sources</CardTitle></CardHeader>
          <CardContent>
            {(!data.sourceBreakdown || data.sourceBreakdown.length === 0) ? <EmptyChart label="No data" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={data.sourceBreakdown} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={95} label={({ name, value }: any) => `${name}: ${value}`} labelLine={false}>
                    {data.sourceBreakdown.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Customer Stages</CardTitle></CardHeader>
          <CardContent>
            {(!data.stageBreakdown || data.stageBreakdown.length === 0) ? <EmptyChart label="No data" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.stageBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="stage" fontSize={11} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3f3f46" radius={[4, 4, 0, 0]} name="Count" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ── Vouchers ─────────────────────────────────────────────────
function VouchersReport({ data }: { data: any }) {
  const s = data.summary;
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="Total Vouchers" value={num(s.totalVouchers)} icon={Gift} />
        <StatCard title="Active" value={num(s.activeVouchers)} icon={ShieldCheck} />
        <StatCard title="Assigned" value={num(s.totalAssigned)} icon={ArrowRightLeft} />
        <StatCard title="Used" value={num(s.totalUsed)} icon={Package} />
        <StatCard title="Total Value" value={fmt(s.totalValue)} icon={DollarSign} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Vouchers Created (Monthly)</CardTitle></CardHeader>
          <CardContent>
            {data.monthly.length === 0 ? <EmptyChart label="No data" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#18181b" radius={[4, 4, 0, 0]} name="Created" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Vouchers Assigned (Monthly)</CardTitle></CardHeader>
          <CardContent>
            {(!data.assignmentMonthly || data.assignmentMonthly.length === 0) ? <EmptyChart label="No data" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data.assignmentMonthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#18181b" strokeWidth={2} dot={{ fill: "#18181b" }} name="Assigned" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">By Status</CardTitle></CardHeader>
          <CardContent>
            {data.statusBreakdown.length === 0 ? <EmptyChart label="No data" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={data.statusBreakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={95} label={({ name, value }: any) => `${name}: ${value}`} labelLine={false}>
                    {data.statusBreakdown.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">By Type</CardTitle></CardHeader>
          <CardContent>
            {data.typeBreakdown.length === 0 ? <EmptyChart label="No data" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={data.typeBreakdown} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={95} label={({ name, value }: any) => `${name}: ${value}`} labelLine={false}>
                    {data.typeBreakdown.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ── Campaigns ────────────────────────────────────────────────
function CampaignsReport({ data }: { data: any }) {
  const s = data.summary;
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard title="Total Campaigns" value={num(s.totalCampaigns)} icon={Megaphone} />
        <StatCard title="Active" value={num(s.activeCampaigns)} icon={ShieldCheck} />
        <StatCard title="Total Members" value={num(s.totalMembers)} icon={Users} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Campaigns Created (Monthly)</CardTitle></CardHeader>
          <CardContent>
            {data.monthly.length === 0 ? <EmptyChart label="No data" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#18181b" radius={[4, 4, 0, 0]} name="Campaigns" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">By Status</CardTitle></CardHeader>
          <CardContent>
            {data.statusBreakdown.length === 0 ? <EmptyChart label="No data" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={data.statusBreakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={95} label={({ name, value }: any) => `${name}: ${value}`} labelLine={false}>
                    {data.statusBreakdown.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">By Type</CardTitle></CardHeader>
          <CardContent>
            {data.typeBreakdown.length === 0 ? <EmptyChart label="No data" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={data.typeBreakdown} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={95} label={({ name, value }: any) => `${name}: ${value}`} labelLine={false}>
                    {data.typeBreakdown.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Members Added Via</CardTitle></CardHeader>
          <CardContent>
            {(!data.membersByVia || data.membersByVia.length === 0) ? <EmptyChart label="No data" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={data.membersByVia} dataKey="count" nameKey="via" cx="50%" cy="50%" outerRadius={95} label={({ name, value }: any) => `${name}: ${value}`} labelLine={false}>
                    {data.membersByVia.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
      {data.topCampaigns && data.topCampaigns.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Top Campaigns by Members</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, data.topCampaigns.length * 36)}>
              <BarChart data={data.topCampaigns} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis type="number" fontSize={12} />
                <YAxis dataKey="name" type="category" fontSize={11} width={140} />
                <Tooltip />
                <Bar dataKey="members" fill="#18181b" radius={[0, 4, 4, 0]} name="Members" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </>
  );
}

// ── Export helpers ────────────────────────────────────────────
function exportCSV(data: any, reportType: ReportType) {
  let rows: string[][] = [];
  let headers: string[] = [];

  if (reportType === "sales") {
    headers = ["Month", "Deals", "Revenue"];
    rows = (data.monthly || []).map((m: any) => [m.month, String(m.count), String(m.value)]);
  } else if (reportType === "leads") {
    headers = ["Month", "Leads"];
    rows = (data.monthly || []).map((m: any) => [m.month, String(m.count)]);
  } else if (reportType === "customers") {
    headers = ["Month", "New Customers"];
    rows = (data.monthly || []).map((m: any) => [m.month, String(m.count)]);
  } else if (reportType === "vouchers") {
    headers = ["Month", "Vouchers Created"];
    rows = (data.monthly || []).map((m: any) => [m.month, String(m.count)]);
  } else if (reportType === "campaigns") {
    headers = ["Campaign", "Members", "Status"];
    rows = (data.topCampaigns || []).map((c: any) => [c.name, String(c.members), c.status]);
  }

  if (rows.length === 0) {
    toast.error("No data to export");
    return;
  }

  const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `report-${reportType}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  toast.success("Report exported");
}

// ── Main ─────────────────────────────────────────────────────
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

      const res = await fetch(`/crm/api/reports?${params.toString()}`);
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
          <p className="text-muted-foreground">Analytics and reporting</p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">No brand assigned. Please contact your administrator.</p>
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
          <p className="text-muted-foreground">Analytics and reporting</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => data && exportCSV(data, reportType)} disabled={!data}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <div className="flex rounded-md border overflow-hidden flex-wrap">
          {REPORT_TYPES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setReportType(value)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                reportType === value ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px] h-9" />
          <span className="text-muted-foreground text-sm">to</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px] h-9" />
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => { setDateFrom(""); setDateTo(""); }}>
              Clear
            </Button>
          )}
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
          {reportType === "leads" && <LeadsReport data={data} />}
          {reportType === "customers" && <CustomersReport data={data} />}
          {reportType === "vouchers" && <VouchersReport data={data} />}
          {reportType === "campaigns" && <CampaignsReport data={data} />}
        </div>
      )}
    </div>
  );
}
