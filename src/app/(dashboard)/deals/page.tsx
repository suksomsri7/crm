"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  HandCoins,
  DollarSign,
  TrendingUp,
  Filter,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  GripVertical,
  X,
  User,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useBrand } from "@/components/providers/brand-provider";
import { cn } from "@/lib/utils";

function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value);
  useEffect(() => { const t = setTimeout(() => setD(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return d;
}

interface PersonSearchResult {
  id: string;
  type: "lead" | "customer";
  name: string;
  email: string | null;
  phone: string | null;
}

const STAGES = [
  "proposal",
  "negotiation",
  "contract",
  "closed_won",
  "closed_lost",
] as const;

const STAGE_LABELS: Record<string, string> = {
  proposal: "Proposal",
  negotiation: "Negotiation",
  contract: "Contract",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

type DealStage = (typeof STAGES)[number];

interface Deal {
  id: string;
  title: string;
  value: number;
  stage: string;
  probability: number;
  expectedCloseDate: string | null;
  openedAt: string | null;
  closedAt: string | null;
  customer: { id: string; name: string; company?: string | null } | null;
  lead: { id: string; title: string } | null;
  openedBy: { id: string; fullName: string } | null;
  closedBy: { id: string; fullName: string } | null;
  notes: string | null;
}

interface DealsResponse {
  deals: Deal[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStageBadgeVariant(stage: string) {
  if (stage === "proposal") return "outline";
  if (stage === "negotiation") return "default";
  if (stage === "contract") return "secondary";
  if (stage === "closed_won") return "secondary";
  if (stage === "closed_lost") return "secondary";
  return "outline";
}

export default function DealsPage() {
  const { activeBrand } = useBrand();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [deleteDeal, setDeleteDeal] = useState<Deal | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    value: "" as string | number,
    stage: "proposal" as DealStage,
    notes: "",
  });
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

  // Person picker (lead or customer)
  const [selectedPerson, setSelectedPerson] = useState<PersonSearchResult | null>(null);
  const [personSearch, setPersonSearch] = useState("");
  const debouncedPersonSearch = useDebounce(personSearch, 300);
  const [personResults, setPersonResults] = useState<PersonSearchResult[]>([]);
  const [personSearching, setPersonSearching] = useState(false);
  const [personDropdownOpen, setPersonDropdownOpen] = useState(false);

  const fetchDeals = useCallback(async () => {
    if (!activeBrand?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        brandId: activeBrand.id,
        page: String(pagination.page),
        limit: String(pagination.limit),
      });
      if (stageFilter && stageFilter !== "all") params.set("stage", stageFilter);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/crm/api/deals?${params}`);
      if (!res.ok) throw new Error("Failed to fetch deals");
      const data: DealsResponse = await res.json();
      setDeals(data.deals);
      setPagination(data.pagination);
    } catch {
      toast.error("Failed to load deals");
    } finally {
      setLoading(false);
    }
  }, [activeBrand?.id, pagination.page, pagination.limit, stageFilter, search]);

  useEffect(() => {
    if (activeBrand?.id) {
      fetchDeals();
    }
  }, [activeBrand?.id, fetchDeals]);

  // Search leads & customers for person picker
  useEffect(() => {
    if (!debouncedPersonSearch.trim() || !activeBrand?.id) {
      setPersonResults([]);
      return;
    }
    let cancelled = false;
    setPersonSearching(true);
    (async () => {
      try {
        const q = encodeURIComponent(debouncedPersonSearch);
        const [leadsRes, customersRes] = await Promise.all([
          fetch(`/crm/api/leads?brandId=${activeBrand.id}&search=${q}&limit=8`),
          fetch(`/crm/api/customers?brandId=${activeBrand.id}&search=${q}&limit=8`),
        ]);
        const leadsData = leadsRes.ok ? await leadsRes.json() : { leads: [] };
        const customersData = customersRes.ok ? await customersRes.json() : { customers: [] };
        if (cancelled) return;
        const results: PersonSearchResult[] = [
          ...(leadsData.leads || []).map((l: any) => ({
            id: l.id, type: "lead" as const,
            name: [l.firstName, l.lastName].filter(Boolean).join(" ") || l.title || "Unnamed",
            email: l.email, phone: l.phone,
          })),
          ...(customersData.customers || []).map((c: any) => ({
            id: c.id, type: "customer" as const,
            name: [c.firstName, c.lastName].filter(Boolean).join(" ") || c.name || "Unnamed",
            email: c.email, phone: c.phone,
          })),
        ];
        setPersonResults(results);
      } catch { /* ignore */ }
      finally { if (!cancelled) setPersonSearching(false); }
    })();
    return () => { cancelled = true; };
  }, [debouncedPersonSearch, activeBrand?.id]);

  const openCreateDialog = () => {
    setEditingDeal(null);
    setForm({ title: "", value: "", stage: "proposal", notes: "" });
    setSelectedPerson(null);
    setPersonSearch("");
    setPersonResults([]);
    setPersonDropdownOpen(false);
    setDialogOpen(true);
  };

  const openEditDialog = (deal: Deal) => {
    setEditingDeal(deal);
    setForm({ title: deal.title, value: deal.value, stage: deal.stage as DealStage, notes: deal.notes ?? "" });
    if (deal.customer) {
      setSelectedPerson({ id: deal.customer.id, type: "customer", name: deal.customer.name, email: null, phone: null });
    } else if (deal.lead) {
      setSelectedPerson({ id: deal.lead.id, type: "lead", name: deal.lead.title, email: null, phone: null });
    } else {
      setSelectedPerson(null);
    }
    setPersonSearch("");
    setPersonResults([]);
    setPersonDropdownOpen(false);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!activeBrand?.id) return;
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    const valueNum = Number(form.value);
    if (isNaN(valueNum) || valueNum < 0) {
      toast.error("Value must be a valid number");
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        ...(editingDeal ? {} : { brandId: activeBrand.id }),
        title: form.title.trim(),
        value: valueNum,
        stage: form.stage,
        notes: form.notes.trim() || null,
        customerId: selectedPerson?.type === "customer" ? selectedPerson.id : null,
        leadId: selectedPerson?.type === "lead" ? selectedPerson.id : null,
      };
      if (editingDeal) {
        const res = await fetch(`/crm/api/deals/${editingDeal.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to update deal");
        }
        toast.success("Deal updated");
      } else {
        const res = await fetch("/crm/api/deals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to create deal");
        }
        toast.success("Deal created");
      }
      setDialogOpen(false);
      fetchDeals();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDeal) return;
    try {
      const res = await fetch(`/crm/api/deals/${deleteDeal.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete deal");
      toast.success("Deal deleted");
      setDeleteDeal(null);
      fetchDeals();
    } catch {
      toast.error("Failed to delete deal");
    }
  };

  // Kanban drag
  const dragDealId = useRef<string | null>(null);

  const handleKanbanDragStart = (dealId: string) => {
    dragDealId.current = dealId;
  };
  const handleKanbanDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const handleKanbanDrop = async (stage: string) => {
    const dealId = dragDealId.current;
    if (!dealId) return;
    dragDealId.current = null;
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === stage) return;
    setDeals((prev) => prev.map((d) => d.id === dealId ? { ...d, stage } : d));
    try {
      const res = await fetch(`/crm/api/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Failed to update stage");
      fetchDeals();
    }
  };

  const totalPipelineValue = deals.reduce((sum, d) => {
    if (d.stage === "closed_lost") return sum;
    return sum + d.value;
  }, 0);
  const pipelineDeals = deals.filter((d) => d.stage !== "closed_lost");
  const wonDeals = deals.filter((d) => d.stage === "closed_won");
  const lostDeals = deals.filter((d) => d.stage === "closed_lost");
  const avgDealSize = pipelineDeals.length > 0 ? totalPipelineValue / pipelineDeals.length : 0;
  const winRate = wonDeals.length + lostDeals.length > 0
    ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100)
    : 0;

  if (!activeBrand) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Deals</h2>
          <p className="text-muted-foreground">Monitor your sales pipeline</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground">Select a brand to view deals</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Deals</h2>
        <p className="text-muted-foreground">Monitor your sales pipeline</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search deals..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="size-4" />
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STAGE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          Add Deal
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pipeline Value
            </CardTitle>
            <HandCoins className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {loading ? "—" : formatCurrency(totalPipelineValue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Deal Size
            </CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {loading ? "—" : formatCurrency(avgDealSize)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Win Rate
            </CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{loading ? "—" : `${winRate}%`}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Deals Count
            </CardTitle>
            <HandCoins className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {loading ? "—" : pagination.total}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "table" | "kanban")}>
        <TabsList>
          <TabsTrigger value="table"><List className="size-4" />Table</TabsTrigger>
          <TabsTrigger value="kanban"><LayoutGrid className="size-4" />Kanban</TabsTrigger>
        </TabsList>

        {/* Table View */}
        <TabsContent value="table" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
              ) : deals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-muted-foreground">No deals found</p>
                  <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
                    <Plus className="size-4" />Add your first deal
                  </Button>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead>Opened</TableHead>
                        <TableHead>Opened By</TableHead>
                        <TableHead>Closed By</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deals.map((deal) => (
                        <TableRow key={deal.id}>
                          <TableCell className="font-medium">{deal.title}</TableCell>
                          <TableCell>{deal.customer?.name ?? deal.lead?.title ?? "—"}</TableCell>
                          <TableCell>{formatCurrency(deal.value)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={getStageBadgeVariant(deal.stage)}
                              className={cn(
                                deal.stage === "closed_won" && "text-green-600 dark:text-green-500",
                                deal.stage === "closed_lost" && "text-red-600 dark:text-red-500"
                              )}
                            >
                              {STAGE_LABELS[deal.stage] ?? deal.stage}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{deal.openedAt ? formatDate(deal.openedAt) : "—"}</TableCell>
                      <TableCell className="text-sm">{deal.openedBy?.fullName || "—"}</TableCell>
                      <TableCell className="text-sm">{deal.closedBy?.fullName || "—"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="size-8" onClick={() => openEditDialog(deal)}>
                                <Pencil className="size-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => setDeleteDeal(deal)}>
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                      <p className="text-sm text-muted-foreground">
                        Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}>
                          <ChevronLeft className="size-4" />Previous
                        </Button>
                        <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}>
                          Next<ChevronRight className="size-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kanban View */}
        <TabsContent value="kanban" className="mt-4">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4 min-w-max">
                {STAGES.map((stage) => {
                  const stageDeals = deals.filter((d) => d.stage === stage);
                  const stageValue = stageDeals.reduce((sum, d) => sum + d.value, 0);
                  const stageColor = stage === "closed_won" ? "#22c55e" : stage === "closed_lost" ? "#ef4444" : stage === "contract" ? "#8b5cf6" : stage === "negotiation" ? "#3b82f6" : "#6b7280";
                  return (
                    <div
                      key={stage}
                      className="w-72 shrink-0 rounded-lg border bg-muted/20"
                      onDragOver={handleKanbanDragOver}
                      onDrop={() => handleKanbanDrop(stage)}
                    >
                      <div className="px-3 py-2 border-b" style={{ borderTopColor: stageColor, borderTopWidth: 3 }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{STAGE_LABELS[stage]}</span>
                            <Badge variant="secondary" className="text-xs">{stageDeals.length}</Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(stageValue)}</p>
                      </div>
                      <div className="p-2 space-y-2 min-h-[80px]">
                        {stageDeals.map((deal) => (
                          <div
                            key={deal.id}
                            draggable
                            onDragStart={() => handleKanbanDragStart(deal.id)}
                            className="p-2.5 rounded-md border bg-background cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow"
                          >
                            <div className="flex items-start gap-2">
                              <GripVertical className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{deal.title}</p>
                                <p className="text-xs text-muted-foreground truncate">{deal.customer?.name ?? deal.lead?.title ?? "No customer"}</p>
                                <p className="text-sm font-semibold mt-1">{formatCurrency(deal.value)}</p>
                              </div>
                              <div className="flex flex-col gap-0.5 shrink-0">
                                <Button variant="ghost" size="icon" className="size-6" onClick={() => openEditDialog(deal)}>
                                  <Pencil className="size-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 ml-6 flex-wrap text-[10px] text-muted-foreground">
                              {deal.openedAt && <span>{formatDate(deal.openedAt)}</span>}
                              {deal.openedBy && <span>by {deal.openedBy.fullName}</span>}
                              {deal.closedBy && <span className="text-primary">Closed: {deal.closedBy.fullName}</span>}
                            </div>
                          </div>
                        ))}
                        {stageDeals.length === 0 && (
                          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">Drop deals here</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDeal ? "Edit Deal" : "Add Deal"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Deal title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Value *</Label>
              <Input
                id="value"
                type="number"
                min={0}
                step={0.01}
                value={form.value}
                onChange={(e) =>
                  setForm((f) => ({ ...f, value: e.target.value }))
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stage">Stage</Label>
              <Select
                value={form.stage}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, stage: v as DealStage }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STAGE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Lead / Customer</Label>
              {selectedPerson ? (
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                  <User className="size-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">{selectedPerson.name}</span>
                      <Badge variant={selectedPerson.type === "lead" ? "secondary" : "default"} className="text-[10px] px-1 py-0">{selectedPerson.type}</Badge>
                    </div>
                    {(selectedPerson.email || selectedPerson.phone) && (
                      <p className="text-xs text-muted-foreground truncate">{[selectedPerson.email, selectedPerson.phone].filter(Boolean).join(" · ")}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="size-6 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => setSelectedPerson(null)}>
                    <X className="size-3" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search leads or customers..."
                    value={personSearch}
                    onChange={(e) => { setPersonSearch(e.target.value); setPersonDropdownOpen(true); }}
                    onFocus={() => { if (personSearch.trim()) setPersonDropdownOpen(true); }}
                    className="pl-8"
                  />
                  {personDropdownOpen && (personSearching || personResults.length > 0 || debouncedPersonSearch.trim()) && (
                    <div className="absolute z-50 w-full mt-1 border rounded-md bg-popover shadow-md max-h-48 overflow-y-auto">
                      {personSearching && (
                        <div className="flex justify-center py-3"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>
                      )}
                      {!personSearching && personResults.length === 0 && debouncedPersonSearch.trim() && (
                        <p className="text-sm text-muted-foreground text-center py-3">No results found</p>
                      )}
                      {!personSearching && personResults.map((r) => (
                        <div
                          key={`${r.type}-${r.id}`}
                          className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => { setSelectedPerson(r); setPersonSearch(""); setPersonDropdownOpen(false); setPersonResults([]); }}
                        >
                          <User className="size-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium truncate">{r.name}</span>
                              <Badge variant={r.type === "lead" ? "secondary" : "default"} className="text-[10px] px-1 py-0">{r.type}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{[r.email, r.phone].filter(Boolean).join(" · ")}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {editingDeal ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteDeal}
        onOpenChange={(open) => !open && setDeleteDeal(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete deal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteDeal?.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
