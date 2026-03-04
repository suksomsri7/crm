"use client";

import { useState, useEffect, useCallback } from "react";
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
  Calendar,
  TrendingUp,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useBrand } from "@/components/providers/brand-provider";
import { cn } from "@/lib/utils";

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
  customer: { id: string; name: string; company?: string | null } | null;
  lead: { id: string; title: string } | null;
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
    probability: 50,
    expectedCloseDate: "",
    customer: "",
    notes: "",
  });

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
      const res = await fetch(`/api/deals?${params}`);
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

  const openCreateDialog = () => {
    setEditingDeal(null);
    setForm({
      title: "",
      value: "",
      stage: "proposal",
      probability: 50,
      expectedCloseDate: "",
      customer: "",
      notes: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (deal: Deal) => {
    setEditingDeal(deal);
    setForm({
      title: deal.title,
      value: deal.value,
      stage: deal.stage as DealStage,
      probability: deal.probability,
      expectedCloseDate: deal.expectedCloseDate
        ? new Date(deal.expectedCloseDate).toISOString().slice(0, 10)
        : "",
      customer: deal.customer?.name ?? "",
      notes: deal.notes ?? "",
    });
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
      const payload = {
        ...(editingDeal ? {} : { brandId: activeBrand.id }),
        title: form.title.trim(),
        value: valueNum,
        stage: form.stage,
        probability: Math.min(100, Math.max(0, form.probability)),
        expectedCloseDate: form.expectedCloseDate || null,
        customerId: null,
        notes: form.notes.trim() || null,
      };
      if (editingDeal) {
        const res = await fetch(`/api/deals/${editingDeal.id}`, {
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
        const res = await fetch("/api/deals", {
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
      const res = await fetch(`/api/deals/${deleteDeal.id}`, {
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
            <Calendar className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {loading ? "—" : pagination.total}
            </p>
          </CardContent>
        </Card>
      </div>

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
                <Plus className="size-4" />
                Add your first deal
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
                    <TableHead>Probability</TableHead>
                    <TableHead>Expected Close Date</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.map((deal) => (
                    <TableRow key={deal.id}>
                      <TableCell className="font-medium">{deal.title}</TableCell>
                      <TableCell>
                        {deal.customer?.name ?? deal.lead?.title ?? "—"}
                      </TableCell>
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
                      <TableCell>{deal.probability}%</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(deal.expectedCloseDate)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => openEditDialog(deal)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteDeal(deal)}
                          >
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
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() =>
                        setPagination((p) => ({ ...p, page: p.page - 1 }))
                      }
                    >
                      <ChevronLeft className="size-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() =>
                        setPagination((p) => ({ ...p, page: p.page + 1 }))
                      }
                    >
                      Next
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

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
            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="probability">Probability (%)</Label>
                <Input
                  id="probability"
                  type="number"
                  min={0}
                  max={100}
                  value={form.probability}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      probability: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
              <Input
                id="expectedCloseDate"
                type="date"
                value={form.expectedCloseDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expectedCloseDate: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <Input
                id="customer"
                value={form.customer}
                onChange={(e) =>
                  setForm((f) => ({ ...f, customer: e.target.value }))
                }
                placeholder="Customer name (optional)"
              />
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
