"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Upload,
  Download,
  Users,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  Briefcase,
  GraduationCap,
  AlertTriangle,
  Heart,
  Waves,
} from "lucide-react";
import { toast } from "sonner";
import { useBrand } from "@/components/providers/brand-provider";
import { useSession } from "next-auth/react";
import { format } from "date-fns";

interface Customer {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  stage: string | null;
  interest: string | null;
  birthDate: string | null;
  idCard: string | null;
  customerAddress: string | null;
  status: "active" | "inactive" | "prospect";
  tags: string[];
  notes: string | null;
  createdAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "prospect", label: "Prospect" },
] as const;

interface SourceOption {
  id: string;
  name: string;
  isActive: boolean;
}

const CUSTOMER_STAGES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
] as const;

interface CustomerForm {
  source: string | null;
  stage: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  interest: string;
  status: "active" | "inactive" | "prospect";
  birthDate: string;
  idCard: string;
  customerAddress: string;
  notes: string;
}

const EMPTY_FORM: CustomerForm = {
  source: null,
  stage: "new",
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  interest: "",
  status: "active",
  birthDate: "",
  idCard: "",
  customerAddress: "",
  notes: "",
};

// --- Sub-form type definitions ---
interface AddressRecord { id?: string; type: string; street: string; city: string; state: string; postalCode: string; country: string; }
interface JobRecord { id?: string; company: string; position: string; startDate: string; endDate: string; notes: string; }
interface EducationRecord { id?: string; institution: string; degree: string; field: string; startYear: string; endYear: string; }
interface EmergencyContactRecord { id?: string; name: string; relationship: string; phone: string; email: string; }
interface MedicalRecord { id?: string; bloodType: string; allergies: string; conditions: string; medications: string; notes: string; }
interface DivingRecord { id?: string; certLevel: string; licenseNumber: string; diveCount: string; lastDiveDate: string; instructor: string; notes: string; }

interface ExtrasData {
  addresses: AddressRecord[];
  jobs: JobRecord[];
  education: EducationRecord[];
  emergencyContacts: EmergencyContactRecord[];
  medical: MedicalRecord[];
  diving: DivingRecord[];
}

const EMPTY_ADDRESS: AddressRecord = { type: "", street: "", city: "", state: "", postalCode: "", country: "" };
const EMPTY_JOB: JobRecord = { company: "", position: "", startDate: "", endDate: "", notes: "" };
const EMPTY_EDUCATION: EducationRecord = { institution: "", degree: "", field: "", startYear: "", endYear: "" };
const EMPTY_EMERGENCY: EmergencyContactRecord = { name: "", relationship: "", phone: "", email: "" };
const EMPTY_MEDICAL: MedicalRecord = { bloodType: "", allergies: "", conditions: "", medications: "", notes: "" };
const EMPTY_DIVING: DivingRecord = { certLevel: "", licenseNumber: "", diveCount: "", lastDiveDate: "", instructor: "", notes: "" };

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function CustomersPage() {
  const { status: sessionStatus } = useSession();
  const { activeBrand, isSuperAdmin } = useBrand();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [sourceOptions, setSourceOptions] = useState<SourceOption[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerForm>(EMPTY_FORM);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importSubmitting, setImportSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Deal dialog
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [dealForm, setDealForm] = useState({ title: "", value: "", stage: "proposal", notes: "" });
  const [dealSubmitting, setDealSubmitting] = useState(false);

  // Sub-forms
  const [extras, setExtras] = useState<ExtrasData>({ addresses: [], jobs: [], education: [], emergencyContacts: [], medical: [], diving: [] });
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [extrasLoading, setExtrasLoading] = useState(false);
  const [extrasSaving, setExtrasSaving] = useState(false);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const fetchCustomers = useCallback(async () => {
    if (!activeBrand?.id && !isSuperAdmin) return;
    const brandId = activeBrand?.id;
    if (!brandId) { setCustomers([]); setPagination(null); setLoading(false); return; }

    setLoading(true);
    try {
      const params = new URLSearchParams({ brandId, search: debouncedSearch, status: statusFilter === "all" ? "" : statusFilter, page: String(page), limit: "20" });
      const res = await fetch(`/api/customers?${params}`);
      if (!res.ok) throw new Error("Failed to fetch customers");
      const data = await res.json();
      setCustomers(data.customers);
      setPagination(data.pagination);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch customers");
      setCustomers([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [activeBrand?.id, isSuperAdmin, debouncedSearch, statusFilter, page]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch("/api/sources?active=true");
      if (!res.ok) return;
      const data = await res.json();
      setSourceOptions(data.sources);
    } catch {}
  }, []);

  const fetchExtras = useCallback(async (customerId: string) => {
    setExtrasLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/extras`);
      if (!res.ok) throw new Error("Failed to fetch extras");
      const data = await res.json();
      setExtras(data);
    } catch {
      setExtras({ addresses: [], jobs: [], education: [], emergencyContacts: [], medical: [], diving: [] });
    } finally {
      setExtrasLoading(false);
    }
  }, []);

  const openCreateDialog = () => {
    setEditingCustomer(null);
    setFormData(EMPTY_FORM);
    setExtras({ addresses: [], jobs: [], education: [], emergencyContacts: [], medical: [], diving: [] });
    setOpenSections(new Set());
    fetchSources();
    setDialogOpen(true);
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      source: (customer as any).source || null,
      stage: (customer as any).stage || "new",
      firstName: customer.firstName || customer.name?.split(" ")[0] || "",
      lastName: customer.lastName || customer.name?.split(" ").slice(1).join(" ") || "",
      phone: customer.phone || "",
      email: customer.email || "",
      interest: customer.interest || "",
      status: customer.status,
      birthDate: (customer as any).birthDate || "",
      idCard: (customer as any).idCard || "",
      customerAddress: (customer as any).customerAddress || "",
      notes: customer.notes || "",
    });
    setOpenSections(new Set());
    fetchSources();
    setDialogOpen(true);
    fetchExtras(customer.id);
  };

  const handleSubmit = async () => {
    if (!activeBrand?.id) { toast.error("No brand selected"); return; }
    setFormSubmitting(true);
    const autoName = [formData.firstName.trim(), formData.lastName.trim()].filter(Boolean).join(" ") || "Unnamed";
    const payload = {
      name: autoName,
      firstName: formData.firstName.trim() || null,
      lastName: formData.lastName.trim() || null,
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      source: formData.source || null,
      stage: formData.stage || null,
      interest: formData.interest.trim() || null,
      birthDate: formData.birthDate.trim() || null,
      idCard: formData.idCard.trim() || null,
      customerAddress: formData.customerAddress.trim() || null,
      status: formData.status,
      notes: formData.notes || null,
    };

    try {
      if (editingCustomer) {
        const res = await fetch(`/api/customers/${editingCustomer.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update customer");
        toast.success("Customer updated");
      } else {
        const res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, brandId: activeBrand.id }),
        });
        if (!res.ok) throw new Error("Failed to create customer");
        toast.success("Customer created");
      }
      setDialogOpen(false);
      fetchCustomers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!customerToDelete) return;
    setDeleteSubmitting(true);
    try {
      const res = await fetch(`/api/customers/${customerToDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Customer deleted");
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
      fetchCustomers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const saveExtraRecord = async (type: string, data: any, recordId?: string) => {
    if (!editingCustomer) return;
    setExtrasSaving(true);
    try {
      if (recordId) {
        await fetch(`/api/customers/${editingCustomer.id}/extras`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, recordId, data }),
        });
      } else {
        await fetch(`/api/customers/${editingCustomer.id}/extras`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, data }),
        });
      }
      await fetchExtras(editingCustomer.id);
      toast.success("Saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setExtrasSaving(false);
    }
  };

  const deleteExtraRecord = async (type: string, recordId: string) => {
    if (!editingCustomer) return;
    try {
      await fetch(`/api/customers/${editingCustomer.id}/extras?type=${type}&recordId=${recordId}`, { method: "DELETE" });
      await fetchExtras(editingCustomer.id);
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleImport = async () => {
    if (!importFile || !activeBrand?.id) return;
    setImportSubmitting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append("file", importFile);
      fd.append("brandId", activeBrand.id);
      const res = await fetch("/api/customers/import", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Import failed");
      const data = await res.json();
      setImportResult({ imported: data.imported, skipped: data.skipped, total: data.total });
      toast.success(`Imported ${data.imported} customers`);
      if (data.imported > 0) fetchCustomers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImportSubmitting(false);
    }
  };

  const handleExport = async () => {
    if (!activeBrand?.id) return;
    try {
      const res = await fetch(`/api/customers/export?brandId=${activeBrand.id}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `customers-${activeBrand.id}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  };

  const totalCount = pagination?.total ?? 0;

  if (sessionStatus === "loading") {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!activeBrand && !isSuperAdmin) {
    return (
      <div className="space-y-6">
        <div><h2 className="text-2xl font-bold tracking-tight">Customers</h2><p className="text-muted-foreground">Manage your customer database</p></div>
        <Card><CardContent className="flex flex-col items-center justify-center py-16"><Users className="size-12 text-muted-foreground mb-4" /><p className="text-muted-foreground text-center">Select a brand to manage customers</p></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-2xl font-bold tracking-tight">Customers</h2><p className="text-muted-foreground">Manage your customer database</p></div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="size-4" /><span>{totalCount} total</span></div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">All customers</CardTitle>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search by name, email, phone..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><Filter className="size-4 mr-1.5" /><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>{STATUS_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}><Upload className="size-4" />Import CSV</Button>
            <Button variant="outline" size="sm" onClick={handleExport}><Download className="size-4" />Export CSV</Button>
            <Button size="sm" onClick={openCreateDialog}><Plus className="size-4" />Add Customer</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16"><Users className="size-12 text-muted-foreground mb-4" /><p className="text-muted-foreground">No customers found</p></div>
          ) : (
            <>
              <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Interest</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <p className="font-medium">
                          {[c.firstName, c.lastName].filter(Boolean).join(" ") || c.name}
                        </p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.phone || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
                      <TableCell>{c.source ? <Badge variant="outline" className="text-xs">{c.source}</Badge> : "—"}</TableCell>
                      <TableCell>{c.stage ? <Badge variant="secondary" className="text-xs capitalize">{c.stage}</Badge> : "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{c.interest || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{format(new Date(c.createdAt), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(c)}><Pencil className="size-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { setCustomerToDelete(c); setDeleteDialogOpen(true); }} className="text-destructive hover:text-destructive"><Trash2 className="size-4" /></Button>
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
                    <p className="text-sm text-muted-foreground">Showing {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total}</p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft className="size-4" />Previous</Button>
                      <span className="text-sm text-muted-foreground">Page {page} of {pagination.totalPages}</span>
                      <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}>Next<ChevronRight className="size-4" /></Button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? "Edit Customer" : "Add Customer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Section 1 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={formData.source ?? "__none__"} onValueChange={(v) => setFormData((f) => ({ ...f, source: v === "__none__" ? null : v }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {sourceOptions.map((opt) => (<SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select value={formData.stage} onValueChange={(v) => setFormData((f) => ({ ...f, stage: v }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CUSTOMER_STAGES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input value={formData.firstName} onChange={(e) => setFormData((f) => ({ ...f, firstName: e.target.value }))} placeholder="First name" />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={formData.lastName} onChange={(e) => setFormData((f) => ({ ...f, lastName: e.target.value }))} placeholder="Last name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={formData.phone} onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))} placeholder="Phone number" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))} placeholder="Email address" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Interest</Label>
              <Input value={formData.interest} onChange={(e) => setFormData((f) => ({ ...f, interest: e.target.value }))} placeholder="What are they interested in?" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))} placeholder="Additional notes..." rows={2} />
            </div>

            {/* Section 2: Customer Information */}
            <Separator />
            <p className="text-sm font-medium">Customer Information</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input type="date" value={formData.birthDate} onChange={(e) => setFormData((f) => ({ ...f, birthDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>ID Card / Passport</Label>
                <Input value={formData.idCard} onChange={(e) => setFormData((f) => ({ ...f, idCard: e.target.value }))} placeholder="ID Card or Passport number" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea value={formData.customerAddress} onChange={(e) => setFormData((f) => ({ ...f, customerAddress: e.target.value }))} placeholder="Full address" rows={2} />
            </div>

            {/* Sub-forms (only in edit mode) */}
            {editingCustomer && (
              <>
                <Separator />
                <p className="text-sm font-medium text-muted-foreground">Additional Information</p>
                {extrasLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
                ) : (
                  <div className="space-y-2">
                    <ExtraSection title="Diving" icon={<Waves className="size-4" />} isOpen={openSections.has("diving")} onToggle={() => toggleSection("diving")}
                      records={extras.diving} type="diving" emptyRecord={EMPTY_DIVING} onSave={saveExtraRecord} onDelete={deleteExtraRecord} saving={extrasSaving}
                      fields={[
                        { key: "certLevel", label: "Certification Level" },
                        { key: "licenseNumber", label: "License Number" },
                        { key: "diveCount", label: "Dive Count" },
                        { key: "lastDiveDate", label: "Last Dive Date" },
                        { key: "instructor", label: "Instructor" },
                        { key: "notes", label: "Notes", type: "textarea" },
                      ]}
                    />
                    <ExtraSection title="Address" icon={<MapPin className="size-4" />} isOpen={openSections.has("addresses")} onToggle={() => toggleSection("addresses")}
                      records={extras.addresses} type="addresses" emptyRecord={EMPTY_ADDRESS} onSave={saveExtraRecord} onDelete={deleteExtraRecord} saving={extrasSaving}
                      fields={[
                        { key: "type", label: "Type (home/work)" },
                        { key: "street", label: "Street" },
                        { key: "city", label: "City" },
                        { key: "state", label: "State/Province" },
                        { key: "postalCode", label: "Postal Code" },
                        { key: "country", label: "Country" },
                      ]}
                    />
                    <ExtraSection title="Jobs" icon={<Briefcase className="size-4" />} isOpen={openSections.has("jobs")} onToggle={() => toggleSection("jobs")}
                      records={extras.jobs} type="jobs" emptyRecord={EMPTY_JOB} onSave={saveExtraRecord} onDelete={deleteExtraRecord} saving={extrasSaving}
                      fields={[
                        { key: "company", label: "Company" },
                        { key: "position", label: "Position" },
                        { key: "startDate", label: "Start Date" },
                        { key: "endDate", label: "End Date" },
                        { key: "notes", label: "Notes", type: "textarea" },
                      ]}
                    />
                    <ExtraSection title="Education" icon={<GraduationCap className="size-4" />} isOpen={openSections.has("education")} onToggle={() => toggleSection("education")}
                      records={extras.education} type="education" emptyRecord={EMPTY_EDUCATION} onSave={saveExtraRecord} onDelete={deleteExtraRecord} saving={extrasSaving}
                      fields={[
                        { key: "institution", label: "Institution" },
                        { key: "degree", label: "Degree" },
                        { key: "field", label: "Field of Study" },
                        { key: "startYear", label: "Start Year" },
                        { key: "endYear", label: "End Year" },
                      ]}
                    />
                    <ExtraSection title="Emergency Contact" icon={<AlertTriangle className="size-4" />} isOpen={openSections.has("emergencyContacts")} onToggle={() => toggleSection("emergencyContacts")}
                      records={extras.emergencyContacts} type="emergencyContacts" emptyRecord={EMPTY_EMERGENCY} onSave={saveExtraRecord} onDelete={deleteExtraRecord} saving={extrasSaving}
                      fields={[
                        { key: "name", label: "Name" },
                        { key: "relationship", label: "Relationship" },
                        { key: "phone", label: "Phone" },
                        { key: "email", label: "Email" },
                      ]}
                    />
                    <ExtraSection title="Medical" icon={<Heart className="size-4" />} isOpen={openSections.has("medical")} onToggle={() => toggleSection("medical")}
                      records={extras.medical} type="medical" emptyRecord={EMPTY_MEDICAL} onSave={saveExtraRecord} onDelete={deleteExtraRecord} saving={extrasSaving}
                      fields={[
                        { key: "bloodType", label: "Blood Type" },
                        { key: "allergies", label: "Allergies" },
                        { key: "conditions", label: "Conditions" },
                        { key: "medications", label: "Medications" },
                        { key: "notes", label: "Notes", type: "textarea" },
                      ]}
                    />
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex-1">
              {editingCustomer && (
                <Button variant="outline" size="sm" onClick={() => {
                  const name = [formData.firstName, formData.lastName].filter(Boolean).join(" ") || editingCustomer.name;
                  setDealForm({ title: `Deal - ${name}`, value: "", stage: "proposal", notes: "" });
                  setDealDialogOpen(true);
                }}>
                  <Plus className="size-4" />Create Deal
                </Button>
              )}
            </div>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={formSubmitting}>
              {formSubmitting && <Loader2 className="size-4 animate-spin" />}
              {editingCustomer ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete {customerToDelete?.name}? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete(); }} disabled={deleteSubmitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteSubmitting && <Loader2 className="size-4 animate-spin" />}Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={(open) => !open && (() => { setImportFile(null); setImportResult(null); setImportDialogOpen(false); })()}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader><DialogTitle>Import CSV</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Upload a CSV file with columns: name, email, phone, company, city, country, status</p>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} />
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="size-4" />{importFile ? importFile.name : "Choose file"}</Button>
            {importResult && <p className="text-sm text-muted-foreground">Imported {importResult.imported}, Skipped {importResult.skipped} of {importResult.total} total</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportFile(null); setImportResult(null); setImportDialogOpen(false); }}>{importResult ? "Close" : "Cancel"}</Button>
            {!importResult && <Button onClick={handleImport} disabled={!importFile || importSubmitting}>{importSubmitting && <Loader2 className="size-4 animate-spin" />}Upload</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Deal Dialog */}
      <Dialog open={dealDialogOpen} onOpenChange={setDealDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create Deal</DialogTitle></DialogHeader>
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
                    customerId: editingCustomer?.id || null,
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

// --- Reusable Extra Section Component ---
interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "textarea";
}

function ExtraSection({
  title,
  icon,
  isOpen,
  onToggle,
  records,
  type,
  emptyRecord,
  onSave,
  onDelete,
  saving,
  fields,
}: {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  records: any[];
  type: string;
  emptyRecord: any;
  onSave: (type: string, data: any, recordId?: string) => Promise<void>;
  onDelete: (type: string, recordId: string) => Promise<void>;
  saving: boolean;
  fields: FieldDef[];
}) {
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const startAdd = () => {
    setEditingRecord({ __new: true });
    setEditForm({ ...emptyRecord });
  };

  const startEdit = (record: any) => {
    setEditingRecord(record);
    const form: any = {};
    fields.forEach((f) => { form[f.key] = record[f.key] ?? ""; });
    setEditForm(form);
  };

  const handleSave = async () => {
    const data: any = {};
    fields.forEach((f) => {
      const val = editForm[f.key]?.toString().trim();
      data[f.key] = val || null;
    });
    if (type === "diving" && data.diveCount) {
      data.diveCount = parseInt(data.diveCount) || null;
    }
    await onSave(type, data, editingRecord?.__new ? undefined : editingRecord?.id);
    setEditingRecord(null);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-3 py-2 h-auto">
          <span className="flex items-center gap-2 text-sm font-medium">
            {icon} {title}
            <Badge variant="secondary" className="ml-1 text-xs">{records.length}</Badge>
          </span>
          {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 space-y-3">
        {records.map((record) => (
          <div key={record.id} className="border rounded-md p-3 space-y-2">
            {editingRecord?.id === record.id ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {fields.map((f) =>
                    f.type === "textarea" ? (
                      <div key={f.key} className="col-span-2 space-y-1">
                        <Label className="text-xs">{f.label}</Label>
                        <Textarea value={editForm[f.key] || ""} onChange={(e) => setEditForm((p: any) => ({ ...p, [f.key]: e.target.value }))} rows={2} />
                      </div>
                    ) : (
                      <div key={f.key} className="space-y-1">
                        <Label className="text-xs">{f.label}</Label>
                        <Input value={editForm[f.key] || ""} onChange={(e) => setEditForm((p: any) => ({ ...p, [f.key]: e.target.value }))} />
                      </div>
                    )
                  )}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => setEditingRecord(null)}>Cancel</Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>{saving && <Loader2 className="size-3 animate-spin" />}Save</Button>
                </div>
              </>
            ) : (
              <div className="flex items-start justify-between">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm flex-1">
                  {fields.map((f) => {
                    const val = record[f.key];
                    if (!val) return null;
                    return (
                      <div key={f.key} className={f.type === "textarea" ? "col-span-2" : ""}>
                        <span className="text-muted-foreground text-xs">{f.label}:</span>{" "}
                        <span>{val}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => startEdit(record)}><Pencil className="size-3" /></Button>
                  <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" onClick={() => onDelete(type, record.id)}><Trash2 className="size-3" /></Button>
                </div>
              </div>
            )}
          </div>
        ))}

        {editingRecord?.__new && (
          <div className="border rounded-md p-3 space-y-2 border-dashed">
            <div className="grid grid-cols-2 gap-2">
              {fields.map((f) =>
                f.type === "textarea" ? (
                  <div key={f.key} className="col-span-2 space-y-1">
                    <Label className="text-xs">{f.label}</Label>
                    <Textarea value={editForm[f.key] || ""} onChange={(e) => setEditForm((p: any) => ({ ...p, [f.key]: e.target.value }))} rows={2} />
                  </div>
                ) : (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs">{f.label}</Label>
                    <Input value={editForm[f.key] || ""} onChange={(e) => setEditForm((p: any) => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                )
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => setEditingRecord(null)}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>{saving && <Loader2 className="size-3 animate-spin" />}Add</Button>
            </div>
          </div>
        )}

        {!editingRecord && (
          <Button variant="outline" size="sm" className="w-full" onClick={startAdd}>
            <Plus className="size-3" /> Add {title}
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
