"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Megaphone,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useBrand } from "@/components/providers/brand-provider";
import { useSession } from "next-auth/react";
import { format } from "date-fns";

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  subject: string | null;
  content: string | null;
  targetSegment: unknown;
  budget: number | null;
  startDate: string | null;
  endDate: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  stats: { sent?: number; opened?: number; clicked?: number; converted?: number } | null;
  createdAt: string;
  _count?: { members: number; stages: number };
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
  { value: "paused", label: "Paused" },
] as const;

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "social", label: "Social" },
  { value: "event", label: "Event" },
  { value: "custom", label: "Custom" },
] as const;

const EMPTY_FORM = {
  name: "",
  subject: "",
  content: "",
  targetSegment: "",
  startDate: "",
  endDate: "",
};

function statusBadgeVariant(status: string) {
  switch (status) {
    case "draft":
      return "secondary" as const;
    case "scheduled":
      return "default" as const;
    case "running":
      return "outline" as const;
    case "completed":
      return "default" as const;
    case "paused":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "running":
      return "border-blue-500 text-blue-600";
    case "completed":
      return "bg-green-600 text-white border-green-600";
    case "paused":
      return "border-yellow-500 text-yellow-600";
    default:
      return "";
  }
}

function typeBadgeVariant(type: string) {
  switch (type) {
    case "email":
      return "outline" as const;
    case "sms":
      return "outline" as const;
    case "social":
      return "outline" as const;
    default:
      return "outline" as const;
  }
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}


export default function CampaignsPage() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const { activeBrand, isSuperAdmin } = useBrand();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, typeFilter]);

  const fetchCampaigns = useCallback(async () => {
    if (!activeBrand?.id && !isSuperAdmin) return;
    const brandId = activeBrand?.id;
    if (!brandId) {
      setCampaigns([]);
      setPagination(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        brandId,
        search: debouncedSearch,
        status: statusFilter === "all" ? "" : statusFilter,
        type: typeFilter === "all" ? "" : typeFilter,
        page: String(page),
        limit: "20",
      });
      const res = await fetch(`/api/campaigns?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch campaigns");
      }
      const data = await res.json();
      setCampaigns(data.campaigns);
      setPagination(data.pagination);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch campaigns");
      setCampaigns([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [activeBrand?.id, isSuperAdmin, debouncedSearch, statusFilter, typeFilter, page]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const brandId = activeBrand?.id;
    if (!brandId) {
      toast.error("No brand selected");
      return;
    }

    setFormSubmitting(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          name: formData.name.trim(),
          type: "custom",
          subject: formData.subject || null,
          content: formData.content || null,
          targetSegment: formData.targetSegment.trim() || null,
          startDate: formData.startDate || null,
          endDate: formData.endDate || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.name?.[0] || err.error || "Failed to create campaign");
      }
      toast.success("Campaign created");
      setCreateDialogOpen(false);
      setFormData(EMPTY_FORM);
      fetchCampaigns();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editingCampaign || !formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setFormSubmitting(true);
    try {
      const res = await fetch(`/api/campaigns/${editingCampaign.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          subject: formData.subject || null,
          content: formData.content || null,
          targetSegment: formData.targetSegment.trim() || null,
          startDate: formData.startDate || null,
          endDate: formData.endDate || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update campaign");
      }
      toast.success("Campaign updated");
      setEditDialogOpen(false);
      setEditingCampaign(null);
      setFormData(EMPTY_FORM);
      fetchCampaigns();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update campaign");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!campaignToDelete) return;

    setDeleteSubmitting(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignToDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete campaign");
      }
      toast.success("Campaign deleted");
      setDeleteDialogOpen(false);
      setCampaignToDelete(null);
      fetchCampaigns();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete campaign");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const openEditDialog = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      subject: campaign.subject || "",
      content: campaign.content || "",
      targetSegment: typeof campaign.targetSegment === "string" ? campaign.targetSegment : campaign.targetSegment ? JSON.stringify(campaign.targetSegment) : "",
      startDate: campaign.startDate ? new Date(campaign.startDate).toISOString().split("T")[0] : "",
      endDate: campaign.endDate ? new Date(campaign.endDate).toISOString().split("T")[0] : "",
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (campaign: Campaign) => {
    setCampaignToDelete(campaign);
    setDeleteDialogOpen(true);
  };

  const showEmptyState = !activeBrand && !isSuperAdmin;
  const totalCount = pagination?.total ?? 0;

  if (sessionStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (showEmptyState) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Campaigns</h2>
          <p className="text-muted-foreground">Create and manage marketing campaigns</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Megaphone className="size-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">Select a brand to manage campaigns</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Campaigns</h2>
          <p className="text-muted-foreground">Create and manage marketing campaigns</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Megaphone className="size-4" />
          <span>{totalCount} total</span>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">All campaigns</CardTitle>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or subject..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="size-4 mr-1.5" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={() => {
                setFormData(EMPTY_FORM);
                setCreateDialogOpen(true);
              }}
            >
              <Plus className="size-4" />
              Create Campaign
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Megaphone className="size-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No campaigns found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Scheduled At</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c) => {
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="cursor-pointer" onClick={() => router.push(`/campaigns/${c.id}`)}>
                            <p className="font-medium hover:underline">{c.name}</p>
                            {c.subject && (
                              <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {c.subject}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={typeBadgeVariant(c.type)} className="capitalize">
                            {c.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={statusBadgeVariant(c.status)}
                            className={statusBadgeClass(c.status) + " capitalize"}
                          >
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {c._count?.members ?? 0}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {c.budget != null ? `฿${c.budget.toLocaleString()}` : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {c.scheduledAt
                            ? format(new Date(c.scheduledAt), "MMM d, yyyy HH:mm")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEditDialog(c)}
                              aria-label="Edit"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openDeleteDialog(c)}
                              aria-label="Delete"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {pagination && pagination.totalPages > 1 && (
                <>
                  <Separator className="my-4" />
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {(page - 1) * pagination.limit + 1}–
                      {Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="size-4" />
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {page} of {pagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= pagination.totalPages}
                        onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      >
                        Next
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Create Campaign</DialogTitle>
          </DialogHeader>
          <CampaignFormFields formData={formData} setFormData={setFormData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={formSubmitting}>
              {formSubmitting && <Loader2 className="size-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
          </DialogHeader>
          <CampaignFormFields formData={formData} setFormData={setFormData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={formSubmitting}>
              {formSubmitting && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{campaignToDelete?.name}&rdquo;? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting && <Loader2 className="size-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CampaignFormFields({
  formData,
  setFormData,
}: {
  formData: typeof EMPTY_FORM;
  setFormData: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
}) {
  return (
    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-1">
      <div className="grid gap-2">
        <Label htmlFor="campaign-name">Name *</Label>
        <Input
          id="campaign-name"
          value={formData.name}
          onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
          placeholder="Summer Sale Campaign"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="campaign-subject">Subject</Label>
        <Input
          id="campaign-subject"
          value={formData.subject}
          onChange={(e) => setFormData((f) => ({ ...f, subject: e.target.value }))}
          placeholder="Campaign subject line"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="campaign-content">Content</Label>
        <Textarea
          id="campaign-content"
          value={formData.content}
          onChange={(e) => setFormData((f) => ({ ...f, content: e.target.value }))}
          placeholder="Campaign message content..."
          rows={4}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="campaign-start">Start Date</Label>
          <Input
            id="campaign-start"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData((f) => ({ ...f, startDate: e.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="campaign-end">End Date</Label>
          <Input
            id="campaign-end"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData((f) => ({ ...f, endDate: e.target.value }))}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="campaign-segment">Target Segment (Prompt)</Label>
        <Textarea
          id="campaign-segment"
          value={formData.targetSegment}
          onChange={(e) => setFormData((f) => ({ ...f, targetSegment: e.target.value }))}
          placeholder="Describe your target audience, e.g. VIP customers who purchased in the last 30 days..."
          rows={3}
        />
      </div>
    </div>
  );
}
