"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  LayoutGrid,
  List,
} from "lucide-react";
import { toast } from "sonner";
import { useBrand } from "@/components/providers/brand-provider";
import { LeadPipelineCard } from "./lead-pipeline-card";

const STAGES = [
  "prospecting",
  "qualification",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
] as const;

const STAGE_LABELS: Record<string, string> = {
  prospecting: "Prospecting",
  qualification: "Qualification",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

const SOURCE_OPTIONS = [
  { value: "web", label: "Web" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "referral", label: "Referral" },
  { value: "social", label: "Social" },
  { value: "other", label: "Other" },
] as const;

type Stage = (typeof STAGES)[number];
type Source = (typeof SOURCE_OPTIONS)[number]["value"];

interface Customer {
  id: string;
  name: string;
  company?: string | null;
}

interface AssignedUser {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
}

interface Lead {
  id: string;
  title: string;
  customerId: string | null;
  customer: { id: string; name: string; company?: string | null } | null;
  source: string | null;
  stage: string;
  value: number | null;
  notes: string | null;
  assignedToId: string | null;
  assignedTo: AssignedUser | null;
  createdAt: string;
}

interface PipelineColumn {
  stage: string;
  label: string;
  leads: Lead[];
  totalValue: number;
}

interface LeadsResponse {
  leads: Lead[];
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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function LeadsPage() {
  const { activeBrand } = useBrand();
  const [viewMode, setViewMode] = useState<"pipeline" | "list">("pipeline");
  const [search, setSearch] = useState("");
  const [pipeline, setPipeline] = useState<PipelineColumn[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deleteLead, setDeleteLead] = useState<Lead | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [movingLeadId, setMovingLeadId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    customerId: "" as string | null,
    source: "" as Source | null,
    stage: "prospecting" as Stage,
    value: "" as string | number,
    notes: "",
  });

  const fetchPipeline = useCallback(async () => {
    if (!activeBrand?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/pipeline?brandId=${activeBrand.id}`);
      if (!res.ok) throw new Error("Failed to fetch pipeline");
      const data = await res.json();
      setPipeline(data);
    } catch (err) {
      toast.error("Failed to load pipeline");
    } finally {
      setLoading(false);
    }
  }, [activeBrand?.id]);

  const fetchLeads = useCallback(
    async (page = pagination.page) => {
      if (!activeBrand?.id) return;
      setListLoading(true);
      try {
        const params = new URLSearchParams({
          brandId: activeBrand.id,
          page: String(page),
          limit: String(pagination.limit),
        });
        if (search) params.set("search", search);
        const res = await fetch(`/api/leads?${params}`);
        if (!res.ok) throw new Error("Failed to fetch leads");
        const data: LeadsResponse = await res.json();
        setLeads(data.leads);
        setPagination(data.pagination);
      } catch (err) {
        toast.error("Failed to load leads");
      } finally {
        setListLoading(false);
      }
    },
    [activeBrand?.id, pagination.page, pagination.limit, search]
  );

  const fetchCustomers = useCallback(async () => {
    if (!activeBrand?.id) return;
    setCustomersLoading(true);
    try {
      const res = await fetch(
        `/api/customers?brandId=${activeBrand.id}&limit=100`
      );
      if (!res.ok) throw new Error("Failed to fetch customers");
      const data = await res.json();
      setCustomers(data.customers);
    } catch (err) {
      toast.error("Failed to load customers");
    } finally {
      setCustomersLoading(false);
    }
  }, [activeBrand?.id]);

  useEffect(() => {
    if (activeBrand?.id) {
      fetchPipeline();
    }
  }, [activeBrand?.id, fetchPipeline]);

  useEffect(() => {
    if (activeBrand?.id && viewMode === "list") {
      fetchLeads();
    }
  }, [activeBrand?.id, viewMode, fetchLeads]);

  useEffect(() => {
    if (dialogOpen && activeBrand?.id) {
      fetchCustomers();
    }
  }, [dialogOpen, activeBrand?.id, fetchCustomers]);

  const openCreateDialog = () => {
    setEditingLead(null);
    setForm({
      title: "",
      customerId: null,
      source: null,
      stage: "prospecting",
      value: "",
      notes: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (lead: Lead) => {
    setEditingLead(lead);
    setForm({
      title: lead.title,
      customerId: lead.customerId || null,
      source: (lead.source as Source) || null,
      stage: lead.stage as Stage,
      value: lead.value ?? "",
      notes: lead.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!activeBrand?.id) return;
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSubmitting(true);
    try {
      if (editingLead) {
        const res = await fetch(`/api/leads/${editingLead.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title.trim(),
            customerId: form.customerId || null,
            source: form.source || null,
            stage: form.stage,
            value: form.value ? Number(form.value) : null,
            notes: form.notes || null,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to update lead");
        }
        toast.success("Lead updated");
      } else {
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brandId: activeBrand.id,
            title: form.title.trim(),
            customerId: form.customerId || null,
            source: form.source || null,
            stage: form.stage,
            value: form.value ? Number(form.value) : null,
            notes: form.notes || null,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to create lead");
        }
        toast.success("Lead created");
      }
      setDialogOpen(false);
      fetchPipeline();
      if (viewMode === "list") fetchLeads();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveStage = async (leadId: string, newStage: string) => {
    setMovingLeadId(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      if (!res.ok) throw new Error("Failed to move lead");
      toast.success("Lead moved");
      fetchPipeline();
      if (viewMode === "list") fetchLeads();
    } catch (err) {
      toast.error("Failed to move lead");
    } finally {
      setMovingLeadId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteLead) return;
    try {
      const res = await fetch(`/api/leads/${deleteLead.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete lead");
      toast.success("Lead deleted");
      setDeleteLead(null);
      fetchPipeline();
      if (viewMode === "list") fetchLeads();
    } catch (err) {
      toast.error("Failed to delete lead");
    }
  };

  if (!activeBrand) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Leads</h2>
          <p className="text-muted-foreground">
            Track and manage your sales pipeline
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground">
              Select a brand to view leads
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Leads</h2>
        <p className="text-muted-foreground">
          Track and manage your sales pipeline
        </p>
      </div>

      <Tabs
        value={viewMode}
        onValueChange={(v) => setViewMode(v as "pipeline" | "list")}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="pipeline">
              <LayoutGrid className="size-4" />
              Pipeline View
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="size-4" />
              List View
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            {viewMode === "list" && (
              <Input
                placeholder="Search leads..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="w-64"
              />
            )}
            <Button onClick={openCreateDialog}>
              <Plus className="size-4" />
              Add Lead
            </Button>
          </div>
        </div>

        <TabsContent value="pipeline" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4 min-w-max">
                {pipeline.map((col, colIndex) => (
                  <div
                    key={col.stage}
                    className="flex-shrink-0 w-[280px] min-w-[280px] bg-muted/30 rounded-lg p-3 flex flex-col"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-medium text-sm">{col.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {col.leads.length} ·{" "}
                        {formatCurrency(col.totalValue)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
                      {col.leads.map((leadItem) => (
                        <LeadPipelineCard
                          key={leadItem.id}
                          lead={leadItem}
                          stage={col.stage}
                          onEdit={() => openEditDialog(leadItem)}
                          onMoveStage={handleMoveStage}
                          movingLeadId={movingLeadId}
                          formatCurrency={formatCurrency}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          {listLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center py-12 text-muted-foreground"
                        >
                          No leads found
                        </TableCell>
                      </TableRow>
                    ) : (
                      leads.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell className="font-medium">
                            {lead.title}
                          </TableCell>
                          <TableCell>
                            {lead.customer?.name ?? "—"}
                          </TableCell>
                          <TableCell>
                            {lead.source ? (
                              <Badge variant="outline" className="text-xs">
                                {lead.source}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                lead.stage === "closed_won"
                                  ? "default"
                                  : lead.stage === "closed_lost"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {STAGE_LABELS[lead.stage] ?? lead.stage}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {lead.value != null && lead.value > 0
                              ? formatCurrency(lead.value)
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {lead.assignedTo ? (
                              <div className="flex items-center gap-2">
                                <Avatar size="sm" className="size-6">
                                  <AvatarImage
                                    src={lead.assignedTo.avatarUrl ?? undefined}
                                  />
                                  <AvatarFallback className="text-xs">
                                    {lead.assignedTo.fullName
                                      ?.split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .slice(0, 2) ?? "—"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">
                                  {lead.assignedTo.fullName ?? "—"}
                                </span>
                              </div>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(lead.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => openEditDialog(lead)}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setDeleteLead(lead)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <p className="text-sm text-muted-foreground">
                      Page {pagination.page} of {pagination.totalPages} (
                      {pagination.total} total)
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
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingLead ? "Edit Lead" : "Add Lead"}
            </DialogTitle>
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
                placeholder="Lead title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <Select
                value={form.customerId ?? "__none__"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, customerId: v === "__none__" ? null : v }))
                }
                disabled={customersLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.company ? ` (${c.company})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Select
                  value={form.source ?? ""}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, source: (v as Source) || null }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stage">Stage</Label>
                <Select
                  value={form.stage}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, stage: v as Stage }))
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Value</Label>
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
              {submitting && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {editingLead ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteLead}
        onOpenChange={(open) => !open && setDeleteLead(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteLead?.title}"? This
              action cannot be undone.
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
