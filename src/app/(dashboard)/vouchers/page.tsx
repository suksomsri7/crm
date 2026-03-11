"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const RichTextEditor = dynamic(
  () => import("@/components/ui/rich-text-editor").then((m) => ({ default: m.RichTextEditor })),
  { ssr: false, loading: () => <div className="border rounded-md h-[160px] animate-pulse bg-muted/30" /> }
);
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
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Gift,
  ChevronLeft,
  ChevronRight,
  Filter,
  Percent,
  DollarSign,
  Package,
  Upload,
  ImageIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useBrand } from "@/components/providers/brand-provider";
import { useSession } from "next-auth/react";
import { format } from "date-fns";

interface VoucherImage {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  isCover: boolean;
}

interface VoucherItem {
  id: string;
  name: string;
  code: string | null;
  type: string;
  value: number | null;
  description: string | null;
  coverUrl: string | null;
  minPurchase: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  startDate: string | null;
  expiryDate: string | null;
  status: string;
  createdAt: string;
  createdBy: { id: string; fullName: string } | null;
  _count: { customerVouchers: number };
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "expired", label: "Expired" },
] as const;

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "fixed_amount", label: "Fixed Amount" },
  { value: "percentage", label: "Percentage" },
  { value: "free_item", label: "Free Item" },
] as const;

const TYPE_LABELS: Record<string, string> = {
  fixed_amount: "Fixed Amount",
  percentage: "Percentage",
  free_item: "Free Item",
};

interface VoucherForm {
  name: string;
  code: string;
  type: string;
  value: string;
  description: string;
  minPurchase: string;
  maxDiscount: string;
  usageLimit: string;
  startDate: string;
  expiryDate: string;
  status: string;
}

const EMPTY_FORM: VoucherForm = {
  name: "",
  code: "",
  type: "fixed_amount",
  value: "",
  description: "",
  minPurchase: "",
  maxDiscount: "",
  usageLimit: "",
  startDate: "",
  expiryDate: "",
  status: "active",
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

function getTypeBadge(type: string) {
  switch (type) {
    case "fixed_amount":
      return <Badge variant="default" className="gap-1"><DollarSign className="size-3" />Fixed Amount</Badge>;
    case "percentage":
      return <Badge variant="secondary" className="gap-1"><Percent className="size-3" />Percentage</Badge>;
    case "free_item":
      return <Badge variant="outline" className="gap-1"><Package className="size-3" />Free Item</Badge>;
    default:
      return <Badge variant="secondary">{type}</Badge>;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge className="bg-green-600 hover:bg-green-700 text-white">Active</Badge>;
    case "inactive":
      return <Badge variant="secondary">Inactive</Badge>;
    case "expired":
      return <Badge variant="destructive">Expired</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function formatValue(type: string, value: number | null) {
  if (value === null || value === undefined) return "—";
  if (type === "percentage") return `${value}%`;
  if (type === "fixed_amount") return `฿${value.toLocaleString()}`;
  return String(value);
}

export default function VouchersPage() {
  const { status: sessionStatus } = useSession();
  const { activeBrand, isSuperAdmin } = useBrand();

  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<VoucherItem | null>(null);
  const [formData, setFormData] = useState<VoucherForm>(EMPTY_FORM);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [voucherToDelete, setVoucherToDelete] = useState<VoucherItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [voucherImages, setVoucherImages] = useState<VoucherImage[]>([]);
  const [imageUploading, setImageUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, typeFilter]);

  const fetchVouchers = useCallback(async () => {
    if (!activeBrand?.id && !isSuperAdmin) return;
    const brandId = activeBrand?.id;
    if (!brandId) { setVouchers([]); setPagination(null); setLoading(false); return; }

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
      const res = await fetch(`/api/vouchers?${params}`);
      if (!res.ok) throw new Error("Failed to fetch vouchers");
      const data = await res.json();
      setVouchers(data.vouchers);
      setPagination(data.pagination);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch vouchers");
      setVouchers([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [activeBrand?.id, isSuperAdmin, debouncedSearch, statusFilter, typeFilter, page]);

  useEffect(() => { fetchVouchers(); }, [fetchVouchers]);

  const fetchVoucherImages = useCallback(async (voucherId: string) => {
    try {
      const res = await fetch(`/api/vouchers/${voucherId}/files`);
      if (!res.ok) return;
      const data = await res.json();
      setVoucherImages(data.images || []);
    } catch {
      setVoucherImages([]);
    }
  }, []);

  const handleImageUpload = async (files: FileList | null, isCover: boolean) => {
    if (!files || files.length === 0 || !editingVoucher) return;
    setImageUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("isCover", String(isCover));
        const res = await fetch(`/api/vouchers/${editingVoucher.id}/files`, { method: "POST", body: fd });
        if (!res.ok) throw new Error("Upload failed");
      }
      await fetchVoucherImages(editingVoucher.id);
      if (isCover) fetchVouchers();
      toast.success(isCover ? "Cover image uploaded" : "Image(s) uploaded");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setImageUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  };

  const handleImageDelete = async (fileId: string) => {
    if (!editingVoucher) return;
    try {
      await fetch(`/api/vouchers/${editingVoucher.id}/files?fileId=${fileId}`, { method: "DELETE" });
      await fetchVoucherImages(editingVoucher.id);
      fetchVouchers();
      toast.success("Image deleted");
    } catch {
      toast.error("Failed to delete image");
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) { toast.error("Name is required"); return; }
    const brandId = activeBrand?.id;
    if (!brandId) { toast.error("No brand selected"); return; }

    setFormSubmitting(true);
    const payload = {
      brandId,
      name: formData.name.trim(),
      code: formData.code.trim() || null,
      type: formData.type,
      value: formData.value ? Number(formData.value) : null,
      description: formData.description.trim() || null,
      minPurchase: formData.minPurchase ? Number(formData.minPurchase) : null,
      maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : null,
      usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
      startDate: formData.startDate || null,
      expiryDate: formData.expiryDate || null,
      status: formData.status,
    };

    try {
      if (editingVoucher) {
        const res = await fetch(`/api/vouchers/${editingVoucher.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update voucher");
        toast.success("Voucher updated");
        setDialogOpen(false);
        setFormData(EMPTY_FORM);
        setEditingVoucher(null);
      } else {
        const res = await fetch("/api/vouchers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create voucher");
        const created = await res.json();
        toast.success("Voucher created — you can now add images");
        setEditingVoucher(created as VoucherItem);
        setFormData((f) => ({ ...f }));
        fetchVoucherImages(created.id);
      }
      fetchVouchers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setFormSubmitting(false);
    }
  };

  const openEditDialog = (v: VoucherItem) => {
    setEditingVoucher(v);
    setFormData({
      name: v.name,
      code: v.code || "",
      type: v.type,
      value: v.value !== null ? String(v.value) : "",
      description: v.description || "",
      minPurchase: v.minPurchase !== null ? String(v.minPurchase) : "",
      maxDiscount: v.maxDiscount !== null ? String(v.maxDiscount) : "",
      usageLimit: v.usageLimit !== null ? String(v.usageLimit) : "",
      startDate: v.startDate ? v.startDate.split("T")[0] : "",
      expiryDate: v.expiryDate ? v.expiryDate.split("T")[0] : "",
      status: v.status,
    });
    setVoucherImages([]);
    fetchVoucherImages(v.id);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!voucherToDelete) return;
    setDeleteSubmitting(true);
    try {
      const res = await fetch(`/api/vouchers/${voucherToDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Voucher deleted");
      setDeleteDialogOpen(false);
      setVoucherToDelete(null);
      fetchVouchers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const totalCount = pagination?.total ?? 0;

  if (sessionStatus === "loading") {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!activeBrand && !isSuperAdmin) {
    return (
      <div className="space-y-6">
        <div><h2 className="text-2xl font-bold tracking-tight">Vouchers</h2><p className="text-muted-foreground">Create and manage vouchers</p></div>
        <Card><CardContent className="flex flex-col items-center justify-center py-16"><Gift className="size-12 text-muted-foreground mb-4" /><p className="text-muted-foreground text-center">Select a brand to manage vouchers</p></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-2xl font-bold tracking-tight">Vouchers</h2><p className="text-muted-foreground">Create and manage vouchers for your customers</p></div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Gift className="size-4" /><span>{totalCount} total</span></div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">All Vouchers</CardTitle>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search by name or code..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><Filter className="size-4 mr-1.5" /><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>{STATUS_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>{TYPE_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent>
            </Select>
            <Button size="sm" onClick={() => { setFormData(EMPTY_FORM); setEditingVoucher(null); setDialogOpen(true); }}>
              <Plus className="size-4" />Create Voucher
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
          ) : vouchers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16"><Gift className="size-12 text-muted-foreground mb-4" /><p className="text-muted-foreground">No vouchers found</p></div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vouchers.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {v.coverUrl ? (
                            <img src={v.coverUrl} alt="" className="size-10 rounded object-cover shrink-0" />
                          ) : (
                            <div className="size-10 rounded bg-muted flex items-center justify-center shrink-0"><Gift className="size-4 text-muted-foreground" /></div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium">{v.name}</p>
                            {v.description && <p className="text-xs text-muted-foreground truncate max-w-[180px]" dangerouslySetInnerHTML={{ __html: v.description.replace(/<[^>]+>/g, " ").slice(0, 60) }} />}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {v.code ? <Badge variant="outline" className="font-mono text-xs">{v.code}</Badge> : "—"}
                      </TableCell>
                      <TableCell>{getTypeBadge(v.type)}</TableCell>
                      <TableCell className="font-medium">{formatValue(v.type, v.value)}</TableCell>
                      <TableCell>
                        <span className="text-sm">{v._count.customerVouchers} assigned</span>
                        {v.usageLimit && <span className="text-xs text-muted-foreground"> / {v.usageLimit} max</span>}
                      </TableCell>
                      <TableCell>{getStatusBadge(v.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {v.expiryDate ? format(new Date(v.expiryDate), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(v.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(v)}><Pencil className="size-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { setVoucherToDelete(v); setDeleteDialogOpen(true); }} className="text-destructive hover:text-destructive"><Trash2 className="size-4" /></Button>
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
                      Showing {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
                    </p>
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
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVoucher ? "Edit Voucher" : "Create Voucher"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Voucher Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. 10% Off Diving Course" />
              </div>
              <div className="space-y-2">
                <Label>Voucher Code</Label>
                <Input value={formData.code} onChange={(e) => setFormData((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. DIVE10" className="font-mono uppercase" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData((f) => ({ ...f, type: v }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed_amount">Fixed Amount (฿)</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="free_item">Free Item</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{formData.type === "percentage" ? "Discount (%)" : formData.type === "free_item" ? "Qty" : "Amount (฿)"}</Label>
                <Input type="number" min={0} value={formData.value} onChange={(e) => setFormData((f) => ({ ...f, value: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData((f) => ({ ...f, status: v }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <RichTextEditor value={formData.description} onChange={(v) => setFormData((f) => ({ ...f, description: v }))} />
            </div>

            {/* Images */}
            {!editingVoucher && (
              <div className="border border-dashed rounded-md p-3 text-center text-xs text-muted-foreground">
                <ImageIcon className="size-5 mx-auto mb-1 opacity-50" />
                Save the voucher first to add cover &amp; gallery images
              </div>
            )}
            {editingVoucher && (
              <>
                <Separator />
                <p className="text-sm font-medium text-muted-foreground">Images</p>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Cover Image</Label>
                    {(() => {
                      const cover = voucherImages.find((img) => img.isCover);
                      return cover ? (
                        <div className="relative inline-block">
                          <img src={cover.fileUrl} alt="Cover" className="h-32 rounded-md object-cover" />
                          <Button variant="destructive" size="icon" className="absolute top-1 right-1 size-6" onClick={() => handleImageDelete(cover.id)}><X className="size-3" /></Button>
                        </div>
                      ) : (
                        <div>
                          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files, true)} />
                          <Button variant="outline" size="sm" onClick={() => coverInputRef.current?.click()} disabled={imageUploading}>
                            {imageUploading ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
                            Upload Cover Image
                          </Button>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Gallery Images</Label>
                    {voucherImages.filter((img) => !img.isCover).length > 0 && (
                      <div className="grid grid-cols-4 gap-2">
                        {voucherImages.filter((img) => !img.isCover).map((img) => (
                          <div key={img.id} className="relative group">
                            <img src={img.fileUrl} alt={img.fileName} className="h-20 w-full rounded object-cover" />
                            <Button variant="destructive" size="icon" className="absolute top-1 right-1 size-5 opacity-0 group-hover:opacity-100" onClick={() => handleImageDelete(img.id)}><X className="size-3" /></Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageUpload(e.target.files, false)} />
                    <Button variant="outline" size="sm" className="w-full" onClick={() => galleryInputRef.current?.click()} disabled={imageUploading}>
                      {imageUploading ? <Loader2 className="size-3 animate-spin" /> : <ImageIcon className="size-3" />}
                      Add Gallery Images
                    </Button>
                  </div>
                </div>
              </>
            )}

            <Separator />
            <p className="text-sm font-medium text-muted-foreground">Conditions</p>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Min Purchase (฿)</Label>
                <Input type="number" min={0} value={formData.minPurchase} onChange={(e) => setFormData((f) => ({ ...f, minPurchase: e.target.value }))} placeholder="No minimum" />
              </div>
              <div className="space-y-2">
                <Label>Max Discount (฿)</Label>
                <Input type="number" min={0} value={formData.maxDiscount} onChange={(e) => setFormData((f) => ({ ...f, maxDiscount: e.target.value }))} placeholder="No limit" />
              </div>
              <div className="space-y-2">
                <Label>Usage Limit</Label>
                <Input type="number" min={1} value={formData.usageLimit} onChange={(e) => setFormData((f) => ({ ...f, usageLimit: e.target.value }))} placeholder="Unlimited" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valid From</Label>
                <Input type="date" value={formData.startDate} onChange={(e) => setFormData((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Valid Until</Label>
                <Input type="date" value={formData.expiryDate} onChange={(e) => setFormData((f) => ({ ...f, expiryDate: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={formSubmitting}>
              {formSubmitting && <Loader2 className="size-4 animate-spin" />}
              {editingVoucher ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete voucher</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{voucherToDelete?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete(); }} disabled={deleteSubmitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteSubmitting && <Loader2 className="size-4 animate-spin" />}Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
