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
  MessageCircle,
  FileText,
  Image as ImageIcon,
  X,
  Gift,
  Star,
  HandCoins,
  Megaphone,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useBrand } from "@/components/providers/brand-provider";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { ChatLogSection } from "@/components/chat-log/chat-log-section";
import { CommentSection } from "@/components/comment/comment-section";

interface Customer {
  id: string;
  name: string;
  titlePrefix: string | null;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  sex: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  stage: string | null;
  interest: string | null;
  birthDate: string | null;
  idCard: string | null;
  customerAddress: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
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

const TITLE_PREFIX_OPTIONS = [
  { value: "mr", label: "Mr." },
  { value: "mrs", label: "Mrs." },
  { value: "ms", label: "Ms." },
  { value: "miss", label: "Miss" },
  { value: "dr", label: "Dr." },
  { value: "prof", label: "Prof." },
] as const;

const SEX_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
] as const;

interface CustomerForm {
  customerId: string;
  customerRef: string;
  source: string | null;
  stage: string;
  titlePrefixTh: string;
  firstNameTh: string;
  lastNameTh: string;
  titlePrefix: string | null;
  firstName: string;
  lastName: string;
  nickname: string;
  sex: string | null;
  phone: string;
  email: string;
  interest: string;
  status: "active" | "inactive" | "prospect";
  birthDate: string;
  idCard: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  notes: string;
}

const EMPTY_FORM: CustomerForm = {
  customerId: "",
  customerRef: "",
  source: null,
  stage: "new",
  titlePrefixTh: "",
  firstNameTh: "",
  lastNameTh: "",
  titlePrefix: null,
  firstName: "",
  lastName: "",
  nickname: "",
  sex: null,
  phone: "",
  email: "",
  interest: "",
  status: "active",
  birthDate: "",
  idCard: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  notes: "",
};

// --- Sub-form type definitions ---
interface AddressRecord { id?: string; type: string; street: string; city: string; state: string; postalCode: string; country: string; }
interface JobRecord { id?: string; company: string; position: string; startDate: string; endDate: string; notes: string; }
interface EducationRecord { id?: string; institution: string; degree: string; field: string; startYear: string; endYear: string; }
interface EmergencyContactRecord { id?: string; name: string; relationship: string; phone: string; email: string; }
interface MedicalRecord { id?: string; bloodType: string; allergies: string; conditions: string; medications: string; notes: string; }
interface DivingRecord { id?: string; certLevel: string; licenseNumber: string; diveCount: string; lastDiveDate: string; instructor: string; notes: string; }

interface SocialRecord { id?: string; platform: string; handle: string; url: string; notes: string; }
interface FileRecord { id?: string; fileName: string; fileUrl: string; fileType: string; fileSize: number; notes: string; }
interface RewardRecord { id: string; type: string; amount: number; notes: string | null; createdAt: string; createdBy: { id: string; fullName: string } | null; }
interface RewardsData { rewards: RewardRecord[]; totalVouchers: number; totalPoints: number; }
interface VoucherOption { id: string; name: string; code: string | null; type: string; value: number | null; status: string; expiryDate: string | null; }
interface CustomerVoucherRecord { id: string; quantity: number; status: string; notes: string | null; createdAt: string; voucher: { id: string; name: string; code: string | null; type: string; value: number | null; status: string; expiryDate: string | null; coverUrl: string | null }; assignedBy: { id: string; fullName: string } | null; }

interface CustomerDealRecord {
  id: string;
  title: string;
  value: number;
  stage: string;
  notes: string | null;
  openedAt: string;
  closedAt: string | null;
  createdAt: string;
  lead: { id: string; title: string; firstName: string | null; lastName: string | null } | null;
  openedBy: { id: string; fullName: string } | null;
  closedBy: { id: string; fullName: string } | null;
}

interface CustomerCampaignRecord {
  id: string;
  status: string;
  addedVia: string;
  notes: string | null;
  addedAt: string;
  campaign: { id: string; name: string; type: string; status: string; startDate: string | null; endDate: string | null };
  stage: { id: string; name: string; color: string | null } | null;
  addedBy: { id: string; fullName: string } | null;
}

interface ExtrasData {
  addresses: AddressRecord[];
  jobs: JobRecord[];
  education: EducationRecord[];
  emergencyContacts: EmergencyContactRecord[];
  medical: MedicalRecord[];
  diving: DivingRecord[];
  socials: SocialRecord[];
  files: FileRecord[];
}

const EMPTY_ADDRESS: AddressRecord = { type: "", street: "", city: "", state: "", postalCode: "", country: "" };
const EMPTY_JOB: JobRecord = { company: "", position: "", startDate: "", endDate: "", notes: "" };
const EMPTY_EDUCATION: EducationRecord = { institution: "", degree: "", field: "", startYear: "", endYear: "" };
const EMPTY_EMERGENCY: EmergencyContactRecord = { name: "", relationship: "", phone: "", email: "" };
const EMPTY_MEDICAL: MedicalRecord = { bloodType: "", allergies: "", conditions: "", medications: "", notes: "" };
const EMPTY_DIVING: DivingRecord = { certLevel: "", licenseNumber: "", diveCount: "", lastDiveDate: "", instructor: "", notes: "" };
const EMPTY_SOCIAL: SocialRecord = { platform: "", handle: "", url: "", notes: "" };

const SOCIAL_PLATFORMS = ["LINE", "Facebook", "Instagram", "WhatsApp", "WeChat", "Telegram", "Twitter/X", "TikTok", "Other"] as const;

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
  const [extras, setExtras] = useState<ExtrasData>({ addresses: [], jobs: [], education: [], emergencyContacts: [], medical: [], diving: [], socials: [], files: [] });
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [extrasLoading, setExtrasLoading] = useState(false);
  const [extrasSaving, setExtrasSaving] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const customerFileRef = useRef<HTMLInputElement>(null);

  const [rewardsData, setRewardsData] = useState<RewardsData>({ rewards: [], totalVouchers: 0, totalPoints: 0 });
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [pointForm, setPointForm] = useState({ amount: "", notes: "" });
  const [pointSubmitting, setPointSubmitting] = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState<VoucherOption[]>([]);
  const [customerVouchers, setCustomerVouchers] = useState<CustomerVoucherRecord[]>([]);
  const [voucherFormId, setVoucherFormId] = useState("");
  const [voucherFormQty, setVoucherFormQty] = useState("1");
  const [voucherFormNotes, setVoucherFormNotes] = useState("");
  const [voucherSubmitting, setVoucherSubmitting] = useState(false);

  const [customerDeals, setCustomerDeals] = useState<CustomerDealRecord[]>([]);
  const [customerCampaigns, setCustomerCampaigns] = useState<CustomerCampaignRecord[]>([]);
  const [editDealId, setEditDealId] = useState<string | null>(null);
  const [editDealForm, setEditDealForm] = useState({ title: "", value: "", stage: "proposal", notes: "" });
  const [editDealSaving, setEditDealSaving] = useState(false);

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
      setExtras({ addresses: [], jobs: [], education: [], emergencyContacts: [], medical: [], diving: [], socials: [], files: [] });
    } finally {
      setExtrasLoading(false);
    }
  }, []);

  const openCreateDialog = () => {
    setEditingCustomer(null);
    setFormData(EMPTY_FORM);
    setExtras({ addresses: [], jobs: [], education: [], emergencyContacts: [], medical: [], diving: [], socials: [], files: [] });
    setRewardsData({ rewards: [], totalVouchers: 0, totalPoints: 0 });
    setCustomerVouchers([]);
    setOpenSections(new Set());
    fetchSources();
    setDialogOpen(true);
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      customerId: (customer as { externalId?: string | null }).externalId ?? "",
      customerRef: "",
      source: customer.source || null,
      stage: customer.stage || "new",
      titlePrefixTh: (customer as { titlePrefixTh?: string | null }).titlePrefixTh ?? "",
      firstNameTh: (customer as { firstNameTh?: string | null }).firstNameTh ?? "",
      lastNameTh: (customer as { lastNameTh?: string | null }).lastNameTh ?? "",
      titlePrefix: customer.titlePrefix || null,
      firstName: customer.firstName || customer.name?.split(" ")[0] || "",
      lastName: customer.lastName || customer.name?.split(" ").slice(1).join(" ") || "",
      nickname: customer.nickname || "",
      sex: customer.sex || null,
      phone: customer.phone || "",
      email: customer.email || "",
      interest: customer.interest || "",
      status: customer.status,
      birthDate: customer.birthDate || "",
      idCard: customer.idCard || "",
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      postalCode: customer.postalCode || "",
      country: customer.country || "",
      notes: customer.notes || "",
    });
    setOpenSections(new Set());
    fetchSources();
    fetchAvailableVouchers();
    setDialogOpen(true);
    fetchExtras(customer.id);
    fetchRewards(customer.id);
    fetchCustomerDeals(customer.id);
    fetchCustomerCampaigns(customer.id);
  };

  const handleSubmit = async () => {
    if (!activeBrand?.id) { toast.error("No brand selected"); return; }
    setFormSubmitting(true);
    const autoName = [formData.firstName.trim(), formData.lastName.trim()].filter(Boolean).join(" ") || "Unnamed";
    const payload = {
      name: autoName,
      externalId: formData.customerId?.trim() || null,
      titlePrefix: formData.titlePrefix || null,
      titlePrefixTh: formData.titlePrefixTh?.trim() || null,
      firstName: formData.firstName.trim() || null,
      firstNameTh: formData.firstNameTh?.trim() || null,
      lastName: formData.lastName.trim() || null,
      lastNameTh: formData.lastNameTh?.trim() || null,
      nickname: formData.nickname.trim() || null,
      sex: formData.sex || null,
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      source: formData.source || null,
      stage: formData.stage || null,
      interest: formData.interest.trim() || null,
      birthDate: formData.birthDate.trim() || null,
      idCard: formData.idCard.trim() || null,
      address: formData.address.trim() || null,
      city: formData.city.trim() || null,
      state: formData.state.trim() || null,
      postalCode: formData.postalCode.trim() || null,
      country: formData.country.trim() || null,
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

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !editingCustomer) return;
    setFileUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`/api/customers/${editingCustomer.id}/files`, { method: "POST", body: fd });
        if (!res.ok) throw new Error("Upload failed");
      }
      await fetchExtras(editingCustomer.id);
      toast.success("File(s) uploaded");
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setFileUploading(false);
      if (customerFileRef.current) customerFileRef.current.value = "";
    }
  };

  const fetchRewards = useCallback(async (customerId: string) => {
    setRewardsLoading(true);
    try {
      const [rewardsRes, vouchersRes] = await Promise.all([
        fetch(`/api/customers/${customerId}/rewards`),
        fetch(`/api/customers/${customerId}/vouchers`),
      ]);
      if (rewardsRes.ok) {
        setRewardsData(await rewardsRes.json());
      } else {
        setRewardsData({ rewards: [], totalVouchers: 0, totalPoints: 0 });
      }
      if (vouchersRes.ok) {
        const data = await vouchersRes.json();
        setCustomerVouchers(data.customerVouchers || []);
      } else {
        setCustomerVouchers([]);
      }
    } catch {
      setRewardsData({ rewards: [], totalVouchers: 0, totalPoints: 0 });
      setCustomerVouchers([]);
    } finally {
      setRewardsLoading(false);
    }
  }, []);

  const fetchCustomerDeals = useCallback(async (customerId: string) => {
    try {
      const res = await fetch(`/api/customers/${customerId}/deals`);
      if (res.ok) setCustomerDeals(await res.json());
      else setCustomerDeals([]);
    } catch { setCustomerDeals([]); }
  }, []);

  const fetchCustomerCampaigns = useCallback(async (customerId: string) => {
    try {
      const res = await fetch(`/api/customers/${customerId}/campaigns`);
      if (res.ok) setCustomerCampaigns(await res.json());
      else setCustomerCampaigns([]);
    } catch { setCustomerCampaigns([]); }
  }, []);

  const saveEditDeal = async () => {
    if (!editDealId) return;
    setEditDealSaving(true);
    try {
      const res = await fetch(`/api/deals/${editDealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editDealForm.title,
          value: Number(editDealForm.value) || 0,
          stage: editDealForm.stage,
          notes: editDealForm.notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Deal updated");
      setEditDealId(null);
      if (editingCustomer) fetchCustomerDeals(editingCustomer.id);
    } catch {
      toast.error("Failed to update deal");
    } finally {
      setEditDealSaving(false);
    }
  };

  const fetchAvailableVouchers = useCallback(async () => {
    if (!activeBrand?.id) return;
    try {
      const res = await fetch(`/api/vouchers?brandId=${activeBrand.id}&status=active&limit=100`);
      if (!res.ok) return;
      const data = await res.json();
      setAvailableVouchers(data.vouchers || []);
    } catch {}
  }, [activeBrand?.id]);

  const addPoint = async () => {
    if (!editingCustomer || !pointForm.amount) return;
    setPointSubmitting(true);
    try {
      const res = await fetch(`/api/customers/${editingCustomer.id}/rewards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "point", amount: Number(pointForm.amount), notes: pointForm.notes || null }),
      });
      if (!res.ok) throw new Error("Failed to add points");
      toast.success("Points added");
      setPointForm({ amount: "", notes: "" });
      await fetchRewards(editingCustomer.id);
    } catch {
      toast.error("Failed to add points");
    } finally {
      setPointSubmitting(false);
    }
  };

  const assignVoucher = async () => {
    if (!editingCustomer || !voucherFormId) return;
    setVoucherSubmitting(true);
    try {
      const qty = parseInt(voucherFormQty) || 1;
      const res = await fetch(`/api/customers/${editingCustomer.id}/vouchers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voucherId: voucherFormId, quantity: qty, notes: voucherFormNotes || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to assign voucher");
      }
      toast.success("Voucher assigned");
      setVoucherFormId("");
      setVoucherFormQty("1");
      setVoucherFormNotes("");
      await fetchRewards(editingCustomer.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign voucher");
    } finally {
      setVoucherSubmitting(false);
    }
  };

  const updateVoucherQuantity = async (recordId: string, delta: number) => {
    if (!editingCustomer) return;
    const cv = customerVouchers.find((c) => c.id === recordId);
    if (!cv) return;
    const newQty = cv.quantity + delta;
    if (newQty < 1) return;
    try {
      const res = await fetch(`/api/customers/${editingCustomer.id}/vouchers?recordId=${recordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQty }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Quantity updated");
      await fetchRewards(editingCustomer.id);
    } catch {
      toast.error("Failed to update quantity");
    }
  };

  const deleteCustomerVoucher = async (recordId: string) => {
    if (!editingCustomer || !confirm("Remove this voucher from customer?")) return;
    try {
      const res = await fetch(`/api/customers/${editingCustomer.id}/vouchers?recordId=${recordId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Voucher removed");
      await fetchRewards(editingCustomer.id);
    } catch {
      toast.error("Failed to remove voucher");
    }
  };

  const handleFileDelete = async (fileId: string) => {
    if (!editingCustomer) return;
    try {
      await fetch(`/api/customers/${editingCustomer.id}/files?fileId=${fileId}`, { method: "DELETE" });
      await fetchExtras(editingCustomer.id);
      toast.success("File deleted");
    } catch {
      toast.error("Failed to delete file");
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
            {/* Row 1: Customer ID / Customer Ref */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer ID</Label>
                <Input value={formData.customerId ?? ""} onChange={(e) => setFormData((f) => ({ ...f, customerId: e.target.value }))} placeholder="Customer ID" />
              </div>
              <div className="space-y-2">
                <Label>Customer Ref</Label>
                <Input value={formData.customerRef ?? ""} onChange={(e) => setFormData((f) => ({ ...f, customerRef: e.target.value }))} placeholder="Customer Ref" />
              </div>
            </div>
            {/* Row 2: Source / Stage */}
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
            {/* Row 3: คำนำหน้า / ชื่อ / นามสกุล (Thai) */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>คำนำหน้า</Label>
                <Input value={formData.titlePrefixTh ?? ""} onChange={(e) => setFormData((f) => ({ ...f, titlePrefixTh: e.target.value }))} placeholder="คำนำหน้า" />
              </div>
              <div className="space-y-2">
                <Label>ชื่อ</Label>
                <Input value={formData.firstNameTh ?? ""} onChange={(e) => setFormData((f) => ({ ...f, firstNameTh: e.target.value }))} placeholder="ชื่อ (ภาษาไทย)" />
              </div>
              <div className="space-y-2">
                <Label>นามสกุล</Label>
                <Input value={formData.lastNameTh ?? ""} onChange={(e) => setFormData((f) => ({ ...f, lastNameTh: e.target.value }))} placeholder="นามสกุล (ภาษาไทย)" />
              </div>
            </div>
            {/* Row 4: Title Prefix / First Name / Last Name (English) */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Title Prefix</Label>
                <Select value={formData.titlePrefix ?? "__none__"} onValueChange={(v) => setFormData((f) => ({ ...f, titlePrefix: v === "__none__" ? null : v }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {TITLE_PREFIX_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input value={formData.firstName} onChange={(e) => setFormData((f) => ({ ...f, firstName: e.target.value }))} placeholder="First name" />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={formData.lastName} onChange={(e) => setFormData((f) => ({ ...f, lastName: e.target.value }))} placeholder="Last name" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nickname</Label>
                <Input value={formData.nickname} onChange={(e) => setFormData((f) => ({ ...f, nickname: e.target.value }))} placeholder="Nickname" />
              </div>
              <div className="space-y-2">
                <Label>Sex</Label>
                <Select value={formData.sex ?? "__none__"} onValueChange={(v) => setFormData((f) => ({ ...f, sex: v === "__none__" ? null : v }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-</SelectItem>
                    {SEX_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={formData.phone} onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))} placeholder="Phone number" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))} placeholder="Email address" />
              </div>
              <div className="space-y-2">
                <Label>Interest</Label>
                <Input value={formData.interest} onChange={(e) => setFormData((f) => ({ ...f, interest: e.target.value }))} placeholder="What are they interested in?" />
              </div>
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
            <p className="text-xs font-medium text-muted-foreground pt-2">Address</p>
            <div className="space-y-2">
              <Label>Street</Label>
              <Input value={formData.address} onChange={(e) => setFormData((f) => ({ ...f, address: e.target.value }))} placeholder="Street address" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={formData.city} onChange={(e) => setFormData((f) => ({ ...f, city: e.target.value }))} placeholder="City" />
              </div>
              <div className="space-y-2">
                <Label>State / Province</Label>
                <Input value={formData.state} onChange={(e) => setFormData((f) => ({ ...f, state: e.target.value }))} placeholder="State or province" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Postal Code</Label>
                <Input value={formData.postalCode} onChange={(e) => setFormData((f) => ({ ...f, postalCode: e.target.value }))} placeholder="Postal code" />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input value={formData.country} onChange={(e) => setFormData((f) => ({ ...f, country: e.target.value }))} placeholder="Country" />
              </div>
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
                    <ExtraSection title="Social Media / Chat" icon={<MessageCircle className="size-4" />} isOpen={openSections.has("socials")} onToggle={() => toggleSection("socials")}
                      records={extras.socials} type="socials" emptyRecord={EMPTY_SOCIAL} onSave={saveExtraRecord} onDelete={deleteExtraRecord} saving={extrasSaving}
                      fields={[
                        { key: "platform", label: "Platform", type: "select", options: SOCIAL_PLATFORMS as unknown as string[] },
                        { key: "handle", label: "Username / ID" },
                        { key: "url", label: "Profile URL" },
                        { key: "notes", label: "Notes" },
                      ]}
                    />

                    {/* Section 3: Files & Images */}
                    <Collapsible open={openSections.has("files")} onOpenChange={() => toggleSection("files")}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between px-3 py-2 h-auto">
                          <span className="flex items-center gap-2 text-sm font-medium">
                            <FileText className="size-4" /> Files & Images
                            <Badge variant="secondary" className="ml-1 text-xs">{extras.files.length}</Badge>
                          </span>
                          {openSections.has("files") ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-3 pb-3 space-y-3">
                        {extras.files.length > 0 && (
                          <div className="grid grid-cols-2 gap-2">
                            {extras.files.map((file) => (
                              <div key={file.id} className="border rounded-md p-2 flex items-center gap-2 group">
                                {file.fileType === "image" ? (
                                  <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                    <img src={file.fileUrl} alt={file.fileName} className="size-12 rounded object-cover" />
                                  </a>
                                ) : (
                                  <FileText className="size-8 text-muted-foreground shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium truncate block hover:underline">{file.fileName}</a>
                                  <p className="text-xs text-muted-foreground">{file.fileSize ? `${(file.fileSize / 1024).toFixed(1)} KB` : ""}</p>
                                </div>
                                <Button variant="ghost" size="icon" className="size-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive shrink-0" onClick={() => handleFileDelete(file.id!)}><X className="size-3" /></Button>
                              </div>
                            ))}
                          </div>
                        )}
                        <input ref={customerFileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />
                        <Button variant="outline" size="sm" className="w-full" onClick={() => customerFileRef.current?.click()} disabled={fileUploading}>
                          {fileUploading ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
                          Upload Files / Images
                        </Button>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Comments */}
                    <CommentSection
                      entityType="customer"
                      entityId={editingCustomer.id}
                      isOpen={openSections.has("comments")}
                      onToggle={() => toggleSection("comments")}
                    />

                    {/* Chat Log */}
                    <ChatLogSection
                      entityType="customer"
                      entityId={editingCustomer.id}
                      isOpen={openSections.has("chatLogs")}
                      onToggle={() => toggleSection("chatLogs")}
                    />
                  </div>
                )}

                {/* Rewards Section */}
                <Separator />
                <p className="text-sm font-medium text-muted-foreground">Rewards</p>
                {rewardsLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
                ) : (
                  <div className="space-y-3">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="flex items-center gap-3 py-3 px-4">
                          <Gift className="size-5 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Vouchers Assigned</p>
                            <p className="text-lg font-bold">{customerVouchers.reduce((s, cv) => s + cv.quantity, 0)}</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="flex items-center gap-3 py-3 px-4">
                          <Star className="size-5 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Total Points</p>
                            <p className="text-lg font-bold">{rewardsData.totalPoints.toLocaleString()}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Add Point */}
                    <div className="border rounded-md p-3 space-y-3">
                      <p className="text-xs font-medium flex items-center gap-1.5"><Star className="size-3" /> Add Points</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="number" min={1} placeholder="Amount" className="h-8 text-xs" value={pointForm.amount} onChange={(e) => setPointForm((f) => ({ ...f, amount: e.target.value }))} />
                        <Input placeholder="Notes (optional)" className="h-8 text-xs" value={pointForm.notes} onChange={(e) => setPointForm((f) => ({ ...f, notes: e.target.value }))} />
                      </div>
                      <Button size="sm" className="w-full" onClick={addPoint} disabled={pointSubmitting || !pointForm.amount}>
                        {pointSubmitting ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                        Add Points
                      </Button>
                    </div>

                    {/* Point History */}
                    {rewardsData.rewards.length > 0 && (
                      <div className="border rounded-md overflow-hidden">
                        <div className="px-3 py-2 bg-muted/30 border-b"><p className="text-xs font-medium">Point History</p></div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs h-8 text-right">Amount</TableHead>
                              <TableHead className="text-xs h-8">Notes</TableHead>
                              <TableHead className="text-xs h-8">Added By</TableHead>
                              <TableHead className="text-xs h-8">Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rewardsData.rewards.map((r) => (
                              <TableRow key={r.id}>
                                <TableCell className="py-1.5 text-right font-medium text-sm">{r.amount.toLocaleString()}</TableCell>
                                <TableCell className="py-1.5 text-xs text-muted-foreground max-w-[120px] truncate">{r.notes || "—"}</TableCell>
                                <TableCell className="py-1.5 text-xs text-muted-foreground">{r.createdBy?.fullName || "—"}</TableCell>
                                <TableCell className="py-1.5 text-xs text-muted-foreground">{format(new Date(r.createdAt), "MMM d, yyyy HH:mm")}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    <Separator />

                    {/* Assign Voucher */}
                    <div className="border rounded-md p-3 space-y-3">
                      <p className="text-xs font-medium flex items-center gap-1.5"><Gift className="size-3" /> Assign Voucher</p>
                      <div className="space-y-2">
                        <Select value={voucherFormId || "__none__"} onValueChange={(v) => setVoucherFormId(v === "__none__" ? "" : v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select a voucher" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Select a voucher...</SelectItem>
                            {availableVouchers.map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.name}{v.code ? ` (${v.code})` : ""} — {v.type === "percentage" ? `${v.value}%` : v.type === "fixed_amount" ? `฿${v.value}` : v.type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Input type="number" min="1" placeholder="Qty" className="h-8 text-xs w-20" value={voucherFormQty} onChange={(e) => setVoucherFormQty(e.target.value)} />
                          <Input placeholder="Notes (optional)" className="h-8 text-xs flex-1" value={voucherFormNotes} onChange={(e) => setVoucherFormNotes(e.target.value)} />
                        </div>
                      </div>
                      <Button size="sm" className="w-full" onClick={assignVoucher} disabled={voucherSubmitting || !voucherFormId}>
                        {voucherSubmitting ? <Loader2 className="size-3 animate-spin" /> : <Gift className="size-3" />}
                        Assign Voucher
                      </Button>
                      {availableVouchers.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center">No active vouchers. Create vouchers in the Vouchers menu first.</p>
                      )}
                    </div>

                    {/* Assigned Vouchers History */}
                    {customerVouchers.length > 0 && (
                      <div className="border rounded-md overflow-hidden">
                        <div className="px-3 py-2 bg-muted/30 border-b"><p className="text-xs font-medium">Assigned Vouchers ({customerVouchers.reduce((s, cv) => s + cv.quantity, 0)} total)</p></div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs h-8">Voucher</TableHead>
                              <TableHead className="text-xs h-8">Value</TableHead>
                              <TableHead className="text-xs h-8 text-center">Qty</TableHead>
                              <TableHead className="text-xs h-8">Status</TableHead>
                              <TableHead className="text-xs h-8">By</TableHead>
                              <TableHead className="text-xs h-8">Date</TableHead>
                              <TableHead className="text-xs h-8 w-16"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {customerVouchers.map((cv) => (
                              <TableRow key={cv.id}>
                                <TableCell className="py-1.5">
                                  <div className="flex items-center gap-1.5">
                                    {cv.voucher.coverUrl && <img src={cv.voucher.coverUrl} alt="" className="size-6 rounded object-cover shrink-0" />}
                                    <div>
                                      <p className="text-xs font-medium">{cv.voucher.name}</p>
                                      {cv.voucher.code && <p className="text-[10px] text-muted-foreground font-mono">{cv.voucher.code}</p>}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="py-1.5 text-xs font-medium">
                                  {cv.voucher.type === "percentage" ? `${cv.voucher.value}%` : cv.voucher.type === "fixed_amount" ? `฿${cv.voucher.value}` : "Free Item"}
                                </TableCell>
                                <TableCell className="py-1.5 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <Button variant="outline" size="icon" className="size-5" onClick={() => updateVoucherQuantity(cv.id, -1)} disabled={cv.quantity <= 1}><span className="text-xs">-</span></Button>
                                    <span className="text-xs font-bold w-6 text-center">{cv.quantity}</span>
                                    <Button variant="outline" size="icon" className="size-5" onClick={() => updateVoucherQuantity(cv.id, 1)}><span className="text-xs">+</span></Button>
                                  </div>
                                </TableCell>
                                <TableCell className="py-1.5">
                                  <Badge variant={cv.status === "assigned" ? "default" : cv.status === "used" ? "secondary" : "destructive"} className="text-xs capitalize">{cv.status}</Badge>
                                </TableCell>
                                <TableCell className="py-1.5 text-xs text-muted-foreground">{cv.assignedBy?.fullName || "—"}</TableCell>
                                <TableCell className="py-1.5 text-xs text-muted-foreground">{format(new Date(cv.createdAt), "MMM d, yyyy HH:mm")}</TableCell>
                                <TableCell className="py-1.5">
                                  <Button variant="ghost" size="icon" className="size-6 text-destructive hover:text-destructive" onClick={() => deleteCustomerVoucher(cv.id)}>
                                    <Trash2 className="size-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Deals Section ──────────────────── */}
                <Separator />
                <Collapsible open={openSections.has("deals")} onOpenChange={() => toggleSection("deals")}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full py-1 group">
                    <div className="flex items-center gap-2">
                      <HandCoins className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Deals</span>
                      <Badge variant="secondary" className="text-[10px]">{customerDeals.length}</Badge>
                    </div>
                    {openSections.has("deals") ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-2">
                    {customerDeals.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No deals found for this customer.</p>
                    ) : (
                      <div className="space-y-2">
                        {customerDeals.map((deal) => (
                          <div key={deal.id} className="border rounded-lg p-3 space-y-2">
                            {editDealId === deal.id ? (
                              <div className="space-y-2">
                                <Input className="h-8 text-xs" value={editDealForm.title} onChange={(e) => setEditDealForm((f) => ({ ...f, title: e.target.value }))} placeholder="Deal title" />
                                <div className="grid grid-cols-2 gap-2">
                                  <Input type="number" className="h-8 text-xs" value={editDealForm.value} onChange={(e) => setEditDealForm((f) => ({ ...f, value: e.target.value }))} placeholder="Value" />
                                  <Select value={editDealForm.stage} onValueChange={(v) => setEditDealForm((f) => ({ ...f, stage: v }))}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {["proposal","negotiation","contract","closed_won","closed_lost"].map((s) => (
                                        <SelectItem key={s} value={s} className="text-xs">{s.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Textarea className="text-xs" rows={2} value={editDealForm.notes} onChange={(e) => setEditDealForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Notes" />
                                <div className="flex gap-2 justify-end">
                                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditDealId(null)}>Cancel</Button>
                                  <Button size="sm" className="h-7 text-xs" onClick={saveEditDeal} disabled={editDealSaving}>
                                    {editDealSaving && <Loader2 className="size-3 animate-spin mr-1" />}Save
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-medium truncate">{deal.title}</p>
                                    <Badge variant={deal.stage === "closed_won" ? "default" : deal.stage === "closed_lost" ? "destructive" : "secondary"} className="text-[10px] capitalize">
                                      {deal.stage.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                                    <span className="font-medium text-foreground">${deal.value.toLocaleString()}</span>
                                    {deal.openedBy && <span>Opened by {deal.openedBy.fullName}</span>}
                                    {deal.closedBy && <span>Closed by {deal.closedBy.fullName}</span>}
                                    <span>{format(new Date(deal.openedAt || deal.createdAt), "MMM d, yyyy")}</span>
                                  </div>
                                  {deal.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{deal.notes}</p>}
                                  {deal.lead && <p className="text-[10px] text-muted-foreground mt-0.5">Lead: {deal.lead.firstName} {deal.lead.lastName}</p>}
                                </div>
                                <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => {
                                  setEditDealId(deal.id);
                                  setEditDealForm({ title: deal.title, value: String(deal.value), stage: deal.stage, notes: deal.notes || "" });
                                }}>
                                  <Pencil className="size-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <Button variant="outline" size="sm" className="w-full" onClick={() => {
                      if (!editingCustomer) return;
                      const name = [formData.firstName, formData.lastName].filter(Boolean).join(" ") || editingCustomer.name;
                      setDealForm({ title: `Deal - ${name}`, value: "", stage: "proposal", notes: "" });
                      setDealDialogOpen(true);
                    }}>
                      <Plus className="size-3 mr-1" />Create New Deal
                    </Button>
                  </CollapsibleContent>
                </Collapsible>

                {/* ── Campaigns Section ──────────────── */}
                <Separator />
                <Collapsible open={openSections.has("campaigns")} onOpenChange={() => toggleSection("campaigns")}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full py-1 group">
                    <div className="flex items-center gap-2">
                      <Megaphone className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Campaigns</span>
                      <Badge variant="secondary" className="text-[10px]">{customerCampaigns.length}</Badge>
                    </div>
                    {openSections.has("campaigns") ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-2">
                    {customerCampaigns.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">Not a member of any campaign.</p>
                    ) : (
                      <div className="space-y-2">
                        {customerCampaigns.map((cm) => (
                          <div key={cm.id} className="border rounded-lg p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-medium truncate">{cm.campaign.name}</p>
                                  <Badge variant={cm.campaign.status === "running" ? "default" : cm.campaign.status === "completed" ? "secondary" : "outline"} className="text-[10px] capitalize">
                                    {cm.campaign.status}
                                  </Badge>
                                  <Badge variant="outline" className="text-[10px] capitalize">{cm.campaign.type}</Badge>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                                  {cm.stage && (
                                    <span className="flex items-center gap-1">
                                      {cm.stage.color && <span className="size-2 rounded-full inline-block" style={{ backgroundColor: cm.stage.color }} />}
                                      Stage: {cm.stage.name}
                                    </span>
                                  )}
                                  <span>Status: <span className="capitalize">{cm.status}</span></span>
                                  {cm.addedBy && <span>Added by {cm.addedBy.fullName}</span>}
                                  <span className="capitalize">via {cm.addedVia}</span>
                                  <span>{format(new Date(cm.addedAt), "MMM d, yyyy")}</span>
                                </div>
                                {cm.campaign.startDate && (
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    Period: {format(new Date(cm.campaign.startDate), "MMM d, yyyy")}
                                    {cm.campaign.endDate ? ` — ${format(new Date(cm.campaign.endDate), "MMM d, yyyy")}` : " — ongoing"}
                                  </p>
                                )}
                                {cm.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{cm.notes}</p>}
                              </div>
                              <Button variant="ghost" size="icon" className="size-7 shrink-0" asChild>
                                <a href={`/campaigns/${cm.campaign.id}`} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="size-3" />
                                </a>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex-1 flex gap-2 flex-wrap">
              {editingCustomer && (
                <>
                  <Button variant="destructive" size="sm" onClick={() => {
                    setCustomerToDelete(editingCustomer);
                    setDialogOpen(false);
                    setDeleteDialogOpen(true);
                  }}>
                    <Trash2 className="size-4" />Delete
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    const name = [formData.firstName, formData.lastName].filter(Boolean).join(" ") || editingCustomer.name;
                    setDealForm({ title: `Deal - ${name}`, value: "", stage: "proposal", notes: "" });
                    setDealDialogOpen(true);
                  }}>
                    <Plus className="size-4" />Create Deal
                  </Button>
                </>
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
          <p className="text-sm text-muted-foreground">Upload a CSV file. Supported columns: externalId, name, titlePrefix, titlePrefixTh, firstName, firstNameTh, lastName, lastNameTh, nickname, sex, email, phone, company, source, stage, status, interest, birthDate, idCard, address, city, state, postalCode, country, tags, notes</p>
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
                if (editingCustomer) fetchCustomerDeals(editingCustomer.id);
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
  type?: "text" | "textarea" | "select";
  options?: string[];
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
                    ) : f.type === "select" && f.options ? (
                      <div key={f.key} className="space-y-1">
                        <Label className="text-xs">{f.label}</Label>
                        <Select value={editForm[f.key] || "__none__"} onValueChange={(v) => setEditForm((p: any) => ({ ...p, [f.key]: v === "__none__" ? "" : v }))}>
                          <SelectTrigger className="w-full h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">-</SelectItem>
                            {f.options.map((opt) => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}
                          </SelectContent>
                        </Select>
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
                ) : f.type === "select" && f.options ? (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs">{f.label}</Label>
                    <Select value={editForm[f.key] || "__none__"} onValueChange={(v) => setEditForm((p: any) => ({ ...p, [f.key]: v === "__none__" ? "" : v }))}>
                      <SelectTrigger className="w-full h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-</SelectItem>
                        {f.options.map((opt) => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}
                      </SelectContent>
                    </Select>
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
