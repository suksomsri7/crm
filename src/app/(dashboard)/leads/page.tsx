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
  Loader2,
  LayoutGrid,
  List,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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

type Stage = (typeof STAGES)[number];

interface SourceOption {
  id: string;
  name: string;
  isActive: boolean;
}

interface AssignedUser {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
}

interface Lead {
  id: string;
  title: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  interest: string | null;
  customerId: string | null;
  customer: { id: string; name: string; company?: string | null } | null;
  source: string | null;
  stage: string;
  notes: string | null;
  assignedToId: string | null;
  assignedTo: AssignedUser | null;
  createdAt: string;
}

interface PipelineColumn {
  stage: string;
  label: string;
  leads: Lead[];
  count: number;
}

interface LeadsResponse {
  leads: Lead[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
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
  const [sourceOptions, setSourceOptions] = useState<SourceOption[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deleteLead, setDeleteLead] = useState<Lead | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [movingLeadId, setMovingLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);

  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [dealForm, setDealForm] = useState({ title: "", value: "", stage: "proposal", notes: "" });
  const [dealSubmitting, setDealSubmitting] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    interest: "",
    source: "" as string | null,
    stage: "prospecting" as Stage,
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

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch("/api/sources?active=true");
      if (!res.ok) return;
      const data = await res.json();
      setSourceOptions(data.sources);
    } catch {}
  }, []);

  useEffect(() => {
    if (dialogOpen) {
      fetchSources();
    }
  }, [dialogOpen, fetchSources]);

  const openCreateDialog = () => {
    setEditingLead(null);
    setForm({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      interest: "",
      source: null,
      stage: "prospecting",
      notes: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (lead: Lead) => {
    setEditingLead(lead);
    setForm({
      firstName: lead.firstName ?? "",
      lastName: lead.lastName ?? "",
      phone: lead.phone ?? "",
      email: lead.email ?? "",
      interest: lead.interest ?? "",
      source: lead.source || null,
      stage: lead.stage as Stage,
      notes: lead.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!activeBrand?.id) return;
    setSubmitting(true);
    try {
      const autoTitle = [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(" ") || "New Lead";
      const payload = {
        title: autoTitle,
        firstName: form.firstName.trim() || null,
        lastName: form.lastName.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        interest: form.interest.trim() || null,
        source: form.source || null,
        stage: form.stage,
        notes: form.notes || null,
      };

      if (editingLead) {
        const res = await fetch(`/api/leads/${editingLead.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
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
          body: JSON.stringify({ ...payload, brandId: activeBrand.id }),
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
                {pipeline.map((col) => (
                  <div
                    key={col.stage}
                    className={cn(
                      "flex-shrink-0 w-[280px] min-w-[280px] rounded-lg p-3 flex flex-col transition-colors",
                      dragOverStage === col.stage
                        ? "bg-muted/60 ring-2 ring-primary/20"
                        : "bg-muted/30"
                    )}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setDragOverStage(col.stage);
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setDragOverStage(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverStage(null);
                      const leadId = e.dataTransfer.getData("text/plain");
                      setDraggingLeadId(null);
                      if (leadId) {
                        const lead = col.leads.find((l) => l.id === leadId);
                        if (!lead) {
                          handleMoveStage(leadId, col.stage);
                        }
                      }
                    }}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-medium text-sm">{col.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {col.leads.length}
                      </span>
                    </div>
                    <div
                      className="flex flex-col gap-2 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]"
                      onDragOver={(e) => e.preventDefault()}
                    >
                      {col.leads.map((leadItem) => (
                        <div
                          key={leadItem.id}
                          onDragStart={() => setDraggingLeadId(leadItem.id)}
                          onDragEnd={() => {
                            setDraggingLeadId(null);
                            setDragOverStage(null);
                          }}
                        >
                          <LeadPipelineCard
                            lead={leadItem}
                            stage={col.stage}
                            onEdit={() => openEditDialog(leadItem)}
                            isDragging={draggingLeadId === leadItem.id}
                          />
                        </div>
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
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Interest</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={10}
                          className="text-center py-12 text-muted-foreground"
                        >
                          No leads found
                        </TableCell>
                      </TableRow>
                    ) : (
                      leads.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell className="font-medium">
                            {[lead.firstName, lead.lastName].filter(Boolean).join(" ") || "—"}
                          </TableCell>
                          <TableCell>
                            {lead.phone || "—"}
                          </TableCell>
                          <TableCell>
                            {lead.email || "—"}
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
                          <TableCell className="text-sm">
                            {lead.interest || "—"}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Select
                  value={form.source ?? "__none__"}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, source: v === "__none__" ? null : v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {sourceOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.name}>
                        {opt.name}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, firstName: e.target.value }))
                  }
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lastName: e.target.value }))
                  }
                  placeholder="Last name"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="Email address"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="interest">Interest</Label>
              <Input
                id="interest"
                value={form.interest}
                onChange={(e) =>
                  setForm((f) => ({ ...f, interest: e.target.value }))
                }
                placeholder="What are they interested in?"
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
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex-1">
              {editingLead && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const name = [editingLead.firstName, editingLead.lastName].filter(Boolean).join(" ") || editingLead.title;
                    setDealForm({ title: `Deal - ${name}`, value: "", stage: "proposal", notes: "" });
                    setDealDialogOpen(true);
                  }}
                >
                  <Plus className="size-4" />
                  Create Deal
                </Button>
              )}
            </div>
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

      {/* Create Deal Dialog */}
      <Dialog open={dealDialogOpen} onOpenChange={setDealDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Deal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={dealForm.title} onChange={(e) => setDealForm((f) => ({ ...f, title: e.target.value }))} placeholder="Deal title" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Value *</Label>
                <Input type="number" min={0} value={dealForm.value} onChange={(e) => setDealForm((f) => ({ ...f, value: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select value={dealForm.stage} onValueChange={(v) => setDealForm((f) => ({ ...f, stage: v }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="negotiation">Negotiation</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="closed_won">Closed Won</SelectItem>
                    <SelectItem value="closed_lost">Closed Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={dealForm.notes} onChange={(e) => setDealForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Additional notes..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDealDialogOpen(false)}>Cancel</Button>
            <Button disabled={dealSubmitting} onClick={async () => {
              if (!dealForm.title.trim() || !dealForm.value) { toast.error("Title and Value are required"); return; }
              if (!activeBrand?.id) return;
              setDealSubmitting(true);
              try {
                const res = await fetch("/api/deals", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    brandId: activeBrand.id,
                    title: dealForm.title.trim(),
                    value: Number(dealForm.value),
                    stage: dealForm.stage,
                    notes: dealForm.notes || null,
                    leadId: editingLead?.id || null,
                  }),
                });
                if (!res.ok) throw new Error("Failed to create deal");
                toast.success("Deal created");
                setDealDialogOpen(false);
              } catch { toast.error("Failed to create deal"); }
              finally { setDealSubmitting(false); }
            }}>
              {dealSubmitting && <Loader2 className="size-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
