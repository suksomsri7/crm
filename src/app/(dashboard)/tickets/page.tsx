"use client";

import { useState, useEffect, useCallback } from "react";
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
  Ticket,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock,
  Pause,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useBrand } from "@/components/providers/brand-provider";
import { useSession } from "next-auth/react";
import { format } from "date-fns";

interface TicketItem {
  id: string;
  subject: string;
  description: string | null;
  priority: string;
  status: string;
  category: string | null;
  customerId: string | null;
  assigneeId: string | null;
  resolvedAt: string | null;
  createdAt: string;
  customer: { id: string; name: string } | null;
  assignee: { id: string; fullName: string } | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface CustomerOption {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  fullName: string;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting", label: "Waiting" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "all", label: "All Priorities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const;

const EMPTY_FORM = {
  subject: "",
  description: "",
  priority: "medium",
  status: "open",
  category: "",
  customerId: "",
  assigneeId: "",
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case "low":
      return <Badge variant="secondary">Low</Badge>;
    case "medium":
      return <Badge variant="default">Medium</Badge>;
    case "high":
      return <Badge variant="outline" className="border-orange-500 text-orange-600 dark:text-orange-400">High</Badge>;
    case "urgent":
      return <Badge variant="destructive">Urgent</Badge>;
    default:
      return <Badge variant="secondary">{priority}</Badge>;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "open":
      return <Badge variant="default">Open</Badge>;
    case "in_progress":
      return <Badge className="bg-blue-600 hover:bg-blue-700 text-white">In Progress</Badge>;
    case "waiting":
      return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Waiting</Badge>;
    case "resolved":
      return <Badge className="bg-green-600 hover:bg-green-700 text-white">Resolved</Badge>;
    case "closed":
      return <Badge variant="secondary">Closed</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function TicketsPage() {
  const { status: sessionStatus } = useSession();
  const { activeBrand, isSuperAdmin } = useBrand();

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [counts, setCounts] = useState({ open: 0, in_progress: 0, waiting: 0, resolved: 0 });
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketItem | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<TicketItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, priorityFilter]);

  const fetchTickets = useCallback(async () => {
    if (!activeBrand?.id && !isSuperAdmin) return;
    const brandId = activeBrand?.id;
    if (!brandId) {
      setTickets([]);
      setCounts({ open: 0, in_progress: 0, waiting: 0, resolved: 0 });
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
        priority: priorityFilter === "all" ? "" : priorityFilter,
        page: String(page),
        limit: "20",
      });
      const res = await fetch(`/api/tickets?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch tickets");
      }
      const data = await res.json();
      setTickets(data.tickets);
      setCounts(data.counts);
      setPagination(data.pagination);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch tickets");
      setTickets([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [activeBrand?.id, isSuperAdmin, debouncedSearch, statusFilter, priorityFilter, page]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const fetchDropdowns = useCallback(async () => {
    const brandId = activeBrand?.id;
    if (!brandId) return;

    try {
      const [custRes, userRes] = await Promise.all([
        fetch(`/api/customers?brandId=${brandId}&limit=100`),
        fetch("/api/users"),
      ]);
      if (custRes.ok) {
        const custData = await custRes.json();
        setCustomers(
          (custData.customers || []).map((c: any) => ({ id: c.id, name: c.name }))
        );
      }
      if (userRes.ok) {
        const userData = await userRes.json();
        setUsers(
          (Array.isArray(userData) ? userData : []).map((u: any) => ({
            id: u.id,
            fullName: u.fullName,
          }))
        );
      }
    } catch {
      // dropdowns are optional, fail silently
    }
  }, [activeBrand?.id]);

  useEffect(() => {
    fetchDropdowns();
  }, [fetchDropdowns]);

  const handleCreate = async () => {
    if (!formData.subject.trim()) {
      toast.error("Subject is required");
      return;
    }
    const brandId = activeBrand?.id;
    if (!brandId) {
      toast.error("No brand selected");
      return;
    }

    setFormSubmitting(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          subject: formData.subject.trim(),
          description: formData.description || null,
          priority: formData.priority,
          status: formData.status,
          category: formData.category || null,
          customerId: formData.customerId || null,
          assigneeId: formData.assigneeId || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.error?.fieldErrors?.subject?.[0] || err.error || "Failed to create ticket"
        );
      }
      toast.success("Ticket created");
      setCreateDialogOpen(false);
      setFormData(EMPTY_FORM);
      fetchTickets();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create ticket");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editingTicket || !formData.subject.trim()) {
      toast.error("Subject is required");
      return;
    }

    setFormSubmitting(true);
    try {
      const res = await fetch(`/api/tickets/${editingTicket.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: formData.subject.trim(),
          description: formData.description || null,
          priority: formData.priority,
          status: formData.status,
          category: formData.category || null,
          customerId: formData.customerId || null,
          assigneeId: formData.assigneeId || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update ticket");
      }
      toast.success("Ticket updated");
      setEditDialogOpen(false);
      setEditingTicket(null);
      setFormData(EMPTY_FORM);
      fetchTickets();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update ticket");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!ticketToDelete) return;

    setDeleteSubmitting(true);
    try {
      const res = await fetch(`/api/tickets/${ticketToDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete ticket");
      }
      toast.success("Ticket deleted");
      setDeleteDialogOpen(false);
      setTicketToDelete(null);
      fetchTickets();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete ticket");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const openEditDialog = (ticket: TicketItem) => {
    setEditingTicket(ticket);
    setFormData({
      subject: ticket.subject,
      description: ticket.description || "",
      priority: ticket.priority,
      status: ticket.status,
      category: ticket.category || "",
      customerId: ticket.customerId || "",
      assigneeId: ticket.assigneeId || "",
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (ticket: TicketItem) => {
    setTicketToDelete(ticket);
    setDeleteDialogOpen(true);
  };

  const showEmptyState = !activeBrand && !isSuperAdmin;

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
          <h2 className="text-2xl font-bold tracking-tight">Tickets</h2>
          <p className="text-muted-foreground">Handle customer support tickets</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Ticket className="size-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">Select a brand to manage tickets</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tickets</h2>
          <p className="text-muted-foreground">Handle customer support tickets</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
            <CircleDot className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.open}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.in_progress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waiting</CardTitle>
            <Pause className="size-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.waiting}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle2 className="size-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.resolved}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets Table Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">All Tickets</CardTitle>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by subject..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
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
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((opt) => (
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
              Create Ticket
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Ticket className="size-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No tickets found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium max-w-[250px] truncate">
                        {t.subject}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {t.customer?.name || "—"}
                      </TableCell>
                      <TableCell>{getPriorityBadge(t.priority)}</TableCell>
                      <TableCell>{getStatusBadge(t.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {t.assignee?.fullName || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {t.category || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(t.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEditDialog(t)}
                            aria-label="Edit"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openDeleteDialog(t)}
                            aria-label="Delete"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {pagination && pagination.totalPages > 1 && (
                <>
                  <Separator className="my-4" />
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {(page - 1) * pagination.limit + 1}–
                      {Math.min(page * pagination.limit, pagination.total)} of{" "}
                      {pagination.total}
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
                        onClick={() =>
                          setPage((p) => Math.min(pagination.totalPages, p + 1))
                        }
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
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Create Ticket</DialogTitle>
          </DialogHeader>
          <TicketFormFields
            formData={formData}
            setFormData={setFormData}
            customers={customers}
            users={users}
          />
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
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Edit Ticket</DialogTitle>
          </DialogHeader>
          <TicketFormFields
            formData={formData}
            setFormData={setFormData}
            customers={customers}
            users={users}
          />
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
            <AlertDialogTitle>Delete ticket</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{ticketToDelete?.subject}&quot;? This
              action cannot be undone.
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

function TicketFormFields({
  formData,
  setFormData,
  customers,
  users,
}: {
  formData: typeof EMPTY_FORM;
  setFormData: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
  customers: CustomerOption[];
  users: UserOption[];
}) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="subject">Subject *</Label>
        <Input
          id="subject"
          value={formData.subject}
          onChange={(e) => setFormData((f) => ({ ...f, subject: e.target.value }))}
          placeholder="Ticket subject"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
          placeholder="Describe the issue..."
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="priority">Priority</Label>
          <Select
            value={formData.priority}
            onValueChange={(v) => setFormData((f) => ({ ...f, priority: v }))}
          >
            <SelectTrigger id="priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(v) => setFormData((f) => ({ ...f, status: v }))}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="waiting">Waiting</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="category">Category</Label>
        <Input
          id="category"
          value={formData.category}
          onChange={(e) => setFormData((f) => ({ ...f, category: e.target.value }))}
          placeholder="e.g. Billing, Technical, General"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="customerId">Customer</Label>
          <Select
            value={formData.customerId || "none"}
            onValueChange={(v) =>
              setFormData((f) => ({ ...f, customerId: v === "none" ? "" : v }))
            }
          >
            <SelectTrigger id="customerId">
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="assigneeId">Assignee</Label>
          <Select
            value={formData.assigneeId || "none"}
            onValueChange={(v) =>
              setFormData((f) => ({ ...f, assigneeId: v === "none" ? "" : v }))
            }
          >
            <SelectTrigger id="assigneeId">
              <SelectValue placeholder="Select assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
