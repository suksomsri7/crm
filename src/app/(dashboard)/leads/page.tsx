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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  X,
  LayoutGrid,
  List,
  UserCheck,
  Settings2,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useBrand } from "@/components/providers/brand-provider";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { LeadPipelineCard } from "./lead-pipeline-card";
import { ChatLogSection } from "@/components/chat-log/chat-log-section";

interface LeadStageConfig {
  id: string;
  name: string;
  color: string | null;
  order: number;
}

interface SourceOption { id: string; name: string; isActive: boolean; }

interface Lead {
  id: string;
  title: string;
  externalId: string | null;
  titlePrefix: string | null;
  titlePrefixTh: string | null;
  firstName: string | null;
  firstNameTh: string | null;
  lastName: string | null;
  lastNameTh: string | null;
  nickname: string | null;
  sex: string | null;
  phone: string | null;
  email: string | null;
  interest: string | null;
  customerId: string | null;
  customer: { id: string; name: string } | null;
  source: string | null;
  stage: string;
  birthDate: string | null;
  idCard: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  notes: string | null;
  assignedToId: string | null;
  assignedTo: { id: string; fullName: string | null; avatarUrl: string | null } | null;
  createdAt: string;
}

interface PipelineColumn {
  stage: string;
  label: string;
  color?: string | null;
  leads: Lead[];
  count: number;
}

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

interface LeadForm {
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
  birthDate: string;
  idCard: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  notes: string;
}

const EMPTY_FORM: LeadForm = {
  customerId: "",
  customerRef: "",
  source: null,
  stage: "",
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
const EMPTY_EXTRAS: ExtrasData = { addresses: [], jobs: [], education: [], emergencyContacts: [], medical: [], diving: [], socials: [], files: [] };

// Stage filter options are now built dynamically from LeadStage records

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function LeadsPage() {
  const { status: sessionStatus } = useSession();
  const { activeBrand, isSuperAdmin } = useBrand();

  const [viewMode, setViewMode] = useState<"pipeline" | "list">("pipeline");
  const [pipeline, setPipeline] = useState<PipelineColumn[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [stageFilter, setStageFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importSubmitting, setImportSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; total: number } | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  const [sourceOptions, setSourceOptions] = useState<SourceOption[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState<LeadForm>(EMPTY_FORM);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [dealForm, setDealForm] = useState({ title: "", value: "", stage: "proposal", notes: "" });
  const [dealSubmitting, setDealSubmitting] = useState(false);
  const [converting, setConverting] = useState(false);

  const [extras, setExtras] = useState<ExtrasData>(EMPTY_EXTRAS);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [extrasLoading, setExtrasLoading] = useState(false);
  const [extrasSaving, setExtrasSaving] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const leadFileRef = useRef<HTMLInputElement>(null);

  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);

  const [stageConfigs, setStageConfigs] = useState<LeadStageConfig[]>([]);
  const [stageManageOpen, setStageManageOpen] = useState(false);
  const [stageEdits, setStageEdits] = useState<LeadStageConfig[]>([]);
  const [stageNewName, setStageNewName] = useState("");
  const [stageNewColor, setStageNewColor] = useState("#6b7280");
  const [stageSaving, setStageSaving] = useState(false);
  const [dragOverColIdx, setDragOverColIdx] = useState<number | null>(null);
  const [draggingColIdx, setDraggingColIdx] = useState<number | null>(null);

  const stageLabels: Record<string, string> = {};
  for (const s of stageConfigs) stageLabels[s.id] = s.name;

  const toggleSection = (section: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section); else next.add(section);
      return next;
    });
  };

  const fetchStages = useCallback(async () => {
    if (!activeBrand?.id) return;
    try {
      const res = await fetch(`/api/lead-stages?brandId=${activeBrand.id}`);
      if (!res.ok) throw new Error("Failed to fetch stages");
      const data: LeadStageConfig[] = await res.json();
      setStageConfigs(data);
    } catch { toast.error("Failed to load stages"); }
  }, [activeBrand?.id]);

  const fetchPipeline = useCallback(async () => {
    if (!activeBrand?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/pipeline?brandId=${activeBrand.id}`);
      if (!res.ok) throw new Error("Failed to fetch pipeline");
      setPipeline(await res.json());
    } catch { toast.error("Failed to load pipeline"); }
    finally { setLoading(false); }
  }, [activeBrand?.id]);

  useEffect(() => { setPage(1); }, [debouncedSearch, stageFilter]);

  const fetchLeads = useCallback(async () => {
    if (!activeBrand?.id) return;
    setListLoading(true);
    try {
      const params = new URLSearchParams({ brandId: activeBrand.id, page: String(page), limit: "20" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (stageFilter !== "all") params.set("stage", stageFilter);
      const res = await fetch(`/api/leads?${params}`);
      if (!res.ok) throw new Error("Failed to fetch leads");
      const data = await res.json();
      setLeads(data.leads);
      setPagination(data.pagination);
    } catch { toast.error("Failed to load leads"); }
    finally { setListLoading(false); }
  }, [activeBrand?.id, page, debouncedSearch, stageFilter]);

  useEffect(() => { if (activeBrand?.id) { fetchStages(); fetchPipeline(); } }, [activeBrand?.id, fetchStages, fetchPipeline]);
  useEffect(() => { if (activeBrand?.id && viewMode === "list") fetchLeads(); }, [activeBrand?.id, viewMode, fetchLeads, page]);

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch("/api/sources?active=true");
      if (!res.ok) return;
      const data = await res.json();
      setSourceOptions(data.sources);
    } catch {}
  }, []);

  const fetchExtras = useCallback(async (leadId: string) => {
    setExtrasLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/extras`);
      if (!res.ok) throw new Error("Failed to fetch extras");
      setExtras(await res.json());
    } catch {
      setExtras(EMPTY_EXTRAS);
    } finally { setExtrasLoading(false); }
  }, []);

  const openCreateDialog = () => {
    setEditingLead(null);
    setFormData({ ...EMPTY_FORM, stage: stageConfigs[0]?.id || "" });
    setExtras(EMPTY_EXTRAS);
    setOpenSections(new Set());
    fetchSources();
    setDialogOpen(true);
  };

  const openEditDialog = (lead: Lead) => {
    setEditingLead(lead);
    setFormData({
      customerId: (lead as { externalId?: string | null }).externalId ?? "",
      customerRef: "",
      source: lead.source || null,
      stage: lead.stage,
      titlePrefixTh: (lead as { titlePrefixTh?: string | null }).titlePrefixTh ?? "",
      firstNameTh: (lead as { firstNameTh?: string | null }).firstNameTh ?? "",
      lastNameTh: (lead as { lastNameTh?: string | null }).lastNameTh ?? "",
      titlePrefix: lead.titlePrefix || null,
      firstName: lead.firstName || "",
      lastName: lead.lastName || "",
      nickname: lead.nickname || "",
      sex: lead.sex || null,
      phone: lead.phone || "",
      email: lead.email || "",
      interest: lead.interest || "",
      birthDate: lead.birthDate || "",
      idCard: lead.idCard || "",
      address: lead.address || "",
      city: lead.city || "",
      state: lead.state || "",
      postalCode: lead.postalCode || "",
      country: lead.country || "",
      notes: lead.notes || "",
    });
    setOpenSections(new Set());
    fetchSources();
    setDialogOpen(true);
    fetchExtras(lead.id);
  };

  const handleSubmit = async () => {
    if (!activeBrand?.id) { toast.error("No brand selected"); return; }
    setFormSubmitting(true);
    const autoTitle = [formData.firstName.trim(), formData.lastName.trim()].filter(Boolean).join(" ") || "New Lead";
    const payload = {
      title: autoTitle,
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
      stage: formData.stage,
      interest: formData.interest.trim() || null,
      birthDate: formData.birthDate.trim() || null,
      idCard: formData.idCard.trim() || null,
      address: formData.address.trim() || null,
      city: formData.city.trim() || null,
      state: formData.state.trim() || null,
      postalCode: formData.postalCode.trim() || null,
      country: formData.country.trim() || null,
      notes: formData.notes || null,
    };

    try {
      if (editingLead) {
        const res = await fetch(`/api/leads/${editingLead.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error("Failed to update lead");
        toast.success("Lead updated");
      } else {
        const res = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, brandId: activeBrand.id }) });
        if (!res.ok) throw new Error("Failed to create lead");
        toast.success("Lead created");
      }
      setDialogOpen(false);
      fetchPipeline();
      if (viewMode === "list") fetchLeads();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally { setFormSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!leadToDelete) return;
    setDeleteSubmitting(true);
    try {
      const res = await fetch(`/api/leads/${leadToDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Lead deleted");
      setDeleteDialogOpen(false);
      setLeadToDelete(null);
      fetchPipeline();
      if (viewMode === "list") fetchLeads();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally { setDeleteSubmitting(false); }
  };

  const handleMoveStage = async (leadId: string, newStage: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: newStage }) });
      if (!res.ok) throw new Error("Failed to move lead");
      toast.success("Lead moved");
      fetchPipeline();
      if (viewMode === "list") fetchLeads();
    } catch { toast.error("Failed to move lead"); }
  };

  const saveExtraRecord = async (type: string, data: any, recordId?: string) => {
    if (!editingLead) return;
    setExtrasSaving(true);
    try {
      if (recordId) {
        await fetch(`/api/leads/${editingLead.id}/extras`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, recordId, data }) });
      } else {
        await fetch(`/api/leads/${editingLead.id}/extras`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, data }) });
      }
      await fetchExtras(editingLead.id);
      toast.success("Saved");
    } catch { toast.error("Failed to save"); }
    finally { setExtrasSaving(false); }
  };

  const deleteExtraRecord = async (type: string, recordId: string) => {
    if (!editingLead) return;
    try {
      await fetch(`/api/leads/${editingLead.id}/extras?type=${type}&recordId=${recordId}`, { method: "DELETE" });
      await fetchExtras(editingLead.id);
      toast.success("Deleted");
    } catch { toast.error("Failed to delete"); }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !editingLead) return;
    setFileUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`/api/leads/${editingLead.id}/files`, { method: "POST", body: fd });
        if (!res.ok) throw new Error("Upload failed");
      }
      await fetchExtras(editingLead.id);
      toast.success("File(s) uploaded");
    } catch { toast.error("Failed to upload file"); }
    finally { setFileUploading(false); if (leadFileRef.current) leadFileRef.current.value = ""; }
  };

  const handleFileDelete = async (fileId: string) => {
    if (!editingLead) return;
    try {
      await fetch(`/api/leads/${editingLead.id}/files?fileId=${fileId}`, { method: "DELETE" });
      await fetchExtras(editingLead.id);
      toast.success("File deleted");
    } catch { toast.error("Failed to delete file"); }
  };

  const handleImport = async () => {
    if (!importFile || !activeBrand?.id) return;
    setImportSubmitting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append("file", importFile);
      fd.append("brandId", activeBrand.id);
      const res = await fetch("/api/leads/import", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Import failed");
      const data = await res.json();
      setImportResult({ imported: data.imported, skipped: data.skipped, total: data.total });
      toast.success(`Imported ${data.imported} leads`);
      if (data.imported > 0) { fetchPipeline(); if (viewMode === "list") fetchLeads(); }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally { setImportSubmitting(false); }
  };

  const handleExport = async () => {
    if (!activeBrand?.id) return;
    try {
      const res = await fetch(`/api/leads/export?brandId=${activeBrand.id}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-${activeBrand.id}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  };

  const openStageManage = () => {
    setStageEdits(stageConfigs.map((s) => ({ ...s })));
    setStageNewName("");
    setStageNewColor("#6b7280");
    setStageManageOpen(true);
  };

  const handleAddStage = async () => {
    if (!stageNewName.trim() || !activeBrand?.id) return;
    setStageSaving(true);
    try {
      const res = await fetch("/api/lead-stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId: activeBrand.id, name: stageNewName.trim(), color: stageNewColor }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to add stage (${res.status})`);
      }
      setStageNewName("");
      setStageNewColor("#6b7280");
      await fetchStages();
      await fetchPipeline();
      const freshStages = await fetch(`/api/lead-stages?brandId=${activeBrand.id}`).then((r) => r.json());
      setStageEdits(freshStages);
      toast.success("Stage added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add stage");
    }
    finally { setStageSaving(false); }
  };

  const handleDeleteStage = async (stageId: string) => {
    setStageSaving(true);
    try {
      const res = await fetch(`/api/lead-stages?id=${stageId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete stage");
      }
      await fetchStages();
      await fetchPipeline();
      setStageEdits((prev) => prev.filter((s) => s.id !== stageId));
      toast.success("Stage deleted");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to delete stage"); }
    finally { setStageSaving(false); }
  };

  const handleSaveStages = async () => {
    setStageSaving(true);
    try {
      const res = await fetch("/api/lead-stages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stages: stageEdits.map((s, i) => ({ id: s.id, name: s.name, color: s.color, order: i })) }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to save stages (${res.status})`);
      }
      await fetchStages();
      await fetchPipeline();
      setStageManageOpen(false);
      toast.success("Stages saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save stages");
    }
    finally { setStageSaving(false); }
  };

  const handleColumnDragStart = (idx: number) => { setDraggingColIdx(idx); };
  const handleColumnDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverColIdx(idx); };
  const handleColumnDragEnd = () => { setDraggingColIdx(null); setDragOverColIdx(null); };
  const handleColumnDrop = (dropIdx: number) => {
    if (draggingColIdx === null || draggingColIdx === dropIdx) { setDraggingColIdx(null); setDragOverColIdx(null); return; }
    setStageEdits((prev) => {
      const next = [...prev];
      const [moved] = next.splice(draggingColIdx, 1);
      next.splice(dropIdx, 0, moved);
      return next;
    });
    setDraggingColIdx(null);
    setDragOverColIdx(null);
  };

  const convertToCustomer = async () => {
    if (!editingLead) return;
    if (editingLead.customerId) {
      toast.error("This lead is already linked to a customer");
      return;
    }
    setConverting(true);
    try {
      const res = await fetch(`/api/leads/${editingLead.id}/convert`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to convert");
      toast.success(`Converted to customer: ${data.customerName}`);
      setDialogOpen(false);
      fetchPipeline();
      fetchLeads();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to convert");
    } finally {
      setConverting(false);
    }
  };

  if (sessionStatus === "loading") {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!activeBrand) {
    return (
      <div className="space-y-6">
        <div><h2 className="text-2xl font-bold tracking-tight">Leads</h2><p className="text-muted-foreground">Track and manage your sales pipeline</p></div>
        <Card><CardContent className="flex flex-col items-center justify-center py-16"><Users className="size-12 text-muted-foreground mb-4" /><p className="text-muted-foreground">Select a brand to view leads</p></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-2xl font-bold tracking-tight">Leads</h2><p className="text-muted-foreground">Track and manage your sales pipeline</p></div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="size-4" /><span>{pagination.total} total</span></div>
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "pipeline" | "list")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="pipeline"><LayoutGrid className="size-4" />Kanban</TabsTrigger>
            <TabsTrigger value="list"><List className="size-4" />List</TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search by name, email, phone..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9" />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[160px]"><Filter className="size-4 mr-1.5" /><SelectValue placeholder="Stage" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {stageConfigs.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
              </SelectContent>
            </Select>
            {isSuperAdmin && (
              <Button variant="outline" size="sm" onClick={openStageManage}><Settings2 className="size-4" />Manage Stages</Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}><Upload className="size-4" />Import CSV</Button>
            <Button variant="outline" size="sm" onClick={handleExport}><Download className="size-4" />Export CSV</Button>
            <Button size="sm" onClick={openCreateDialog}><Plus className="size-4" />Add Lead</Button>
          </div>
        </div>

        {/* Kanban View */}
        <TabsContent value="pipeline" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4 min-w-max">
                {pipeline.filter((col) => stageFilter === "all" || col.stage === stageFilter).map((col) => {
                  const filteredLeads = debouncedSearch
                    ? col.leads.filter((l) => {
                        const q = debouncedSearch.toLowerCase();
                        return [l.firstName, l.lastName, l.email, l.phone, l.title].some((v) => v?.toLowerCase().includes(q));
                      })
                    : col.leads;
                  return (
                  <div
                    key={col.stage}
                    className={cn("flex-shrink-0 w-[280px] min-w-[280px] rounded-lg p-3 flex flex-col transition-colors", dragOverStage === col.stage ? "bg-muted/60 ring-2 ring-primary/20" : "bg-muted/30")}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverStage(col.stage); }}
                    onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverStage(null); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverStage(null);
                      const leadId = e.dataTransfer.getData("text/plain");
                      setDraggingLeadId(null);
                      if (leadId && !col.leads.find((l) => l.id === leadId)) handleMoveStage(leadId, col.stage);
                    }}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium text-sm">
                        {col.color && <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: col.color }} />}
                        {col.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{filteredLeads.length}</span>
                    </div>
                    <div className="flex flex-col gap-2 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]" onDragOver={(e) => e.preventDefault()}>
                      {filteredLeads.map((leadItem) => (
                        <div key={leadItem.id} onDragStart={() => setDraggingLeadId(leadItem.id)} onDragEnd={() => { setDraggingLeadId(null); setDragOverStage(null); }}>
                          <LeadPipelineCard lead={leadItem} stage={col.stage} stageColor={col.color} onEdit={() => openEditDialog(leadItem)} isDragging={draggingLeadId === leadItem.id} />
                        </div>
                      ))}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* List View */}
        <TabsContent value="list" className="mt-6">
          {listLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
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
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No leads found</TableCell></TableRow>
                    ) : (
                      leads.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell><p className="font-medium">{[lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.title}</p></TableCell>
                          <TableCell className="text-muted-foreground">{lead.phone || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{lead.email || "—"}</TableCell>
                          <TableCell>{lead.source ? <Badge variant="outline" className="text-xs">{lead.source}</Badge> : "—"}</TableCell>
                          <TableCell><Badge variant="secondary" className="text-xs">{stageLabels[lead.stage] ?? lead.stage}</Badge></TableCell>
                          <TableCell className="text-muted-foreground text-sm">{lead.interest || "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{format(new Date(lead.createdAt), "MMM d, yyyy")}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(lead)}><Pencil className="size-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => { setLeadToDelete(lead); setDeleteDialogOpen(true); }} className="text-destructive hover:text-destructive"><Trash2 className="size-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {pagination.totalPages > 1 && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between px-4 py-3">
                      <p className="text-sm text-muted-foreground">Showing {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total}</p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft className="size-4" />Previous</Button>
                        <span className="text-sm text-muted-foreground">Page {page} of {pagination.totalPages}</span>
                        <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}>Next<ChevronRight className="size-4" /></Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLead ? "Edit Lead" : "Add Lead"}</DialogTitle>
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
                    {stageConfigs.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
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

            {/* Section 2: Lead Information */}
            <Separator />
            <p className="text-sm font-medium">Lead Information</p>
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
            {editingLead && (
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

                    {/* Files & Images */}
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
                        <input ref={leadFileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />
                        <Button variant="outline" size="sm" className="w-full" onClick={() => leadFileRef.current?.click()} disabled={fileUploading}>
                          {fileUploading ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
                          Upload Files / Images
                        </Button>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Chat Log */}
                    <ChatLogSection
                      entityType="lead"
                      entityId={editingLead.id}
                      isOpen={openSections.has("chatLogs")}
                      onToggle={() => toggleSection("chatLogs")}
                    />
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex-1 flex gap-2 flex-wrap">
              {editingLead && (
                <>
                  <Button variant="destructive" size="sm" onClick={() => {
                    setLeadToDelete(editingLead);
                    setDialogOpen(false);
                    setDeleteDialogOpen(true);
                  }}>
                    <Trash2 className="size-4" />Delete
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    const name = [formData.firstName, formData.lastName].filter(Boolean).join(" ") || editingLead.title;
                    setDealForm({ title: `Deal - ${name}`, value: "", stage: "proposal", notes: "" });
                    setDealDialogOpen(true);
                  }}>
                    <Plus className="size-4" />Create Deal
                  </Button>
                  {!editingLead.customerId && (
                    <Button variant="outline" size="sm" onClick={convertToCustomer} disabled={converting}>
                      {converting ? <Loader2 className="size-4 animate-spin" /> : <UserCheck className="size-4" />}
                      Convert to Customer
                    </Button>
                  )}
                  {editingLead.customerId && (
                    <Badge variant="secondary" className="text-xs h-8 flex items-center gap-1">
                      <UserCheck className="size-3" /> Converted
                    </Badge>
                  )}
                </>
              )}
            </div>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={formSubmitting}>
              {formSubmitting && <Loader2 className="size-4 animate-spin" />}
              {editingLead ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lead</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete &quot;{leadToDelete?.title}&quot;? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete(); }} disabled={deleteSubmitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteSubmitting && <Loader2 className="size-4 animate-spin" />}Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={(open) => !open && (() => { setImportFile(null); setImportResult(null); setImportDialogOpen(false); })()}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader><DialogTitle>Import CSV</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Upload a CSV file. Supported columns: externalId, titlePrefix, titlePrefixTh, firstName, firstNameTh, lastName, lastNameTh, nickname, sex, phone, email, source, stage, status, interest, birthDate, idCard, address, city, state, postalCode, country, notes</p>
          <input ref={importFileRef} type="file" accept=".csv" className="hidden" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} />
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={() => importFileRef.current?.click()}><Upload className="size-4" />{importFile ? importFile.name : "Choose file"}</Button>
            {importResult && <p className="text-sm text-muted-foreground">Imported {importResult.imported}, Skipped {importResult.skipped} of {importResult.total} total</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportFile(null); setImportResult(null); setImportDialogOpen(false); }}>{importResult ? "Close" : "Cancel"}</Button>
            {!importResult && <Button onClick={handleImport} disabled={!importFile || importSubmitting}>{importSubmitting && <Loader2 className="size-4 animate-spin" />}Upload</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stage Management Dialog (Super Admin only) */}
      <Dialog open={stageManageOpen} onOpenChange={setStageManageOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Lead Stages</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Add, edit, delete or reorder pipeline stages. Drag rows to reorder.</p>
          <div className="space-y-3 py-2">
            {stageEdits.map((stage, idx) => (
              <div
                key={stage.id}
                draggable
                onDragStart={() => handleColumnDragStart(idx)}
                onDragOver={(e) => handleColumnDragOver(e, idx)}
                onDragEnd={handleColumnDragEnd}
                onDrop={() => handleColumnDrop(idx)}
                className={cn(
                  "flex items-center gap-2 rounded-md border p-2 transition-colors bg-background",
                  draggingColIdx === idx && "opacity-50",
                  dragOverColIdx === idx && draggingColIdx !== idx && "ring-2 ring-primary/30"
                )}
              >
                <GripVertical className="size-4 text-muted-foreground cursor-grab shrink-0" />
                <input
                  type="color"
                  value={stage.color || "#6b7280"}
                  onChange={(e) => setStageEdits((prev) => prev.map((s, i) => i === idx ? { ...s, color: e.target.value } : s))}
                  className="size-7 rounded border cursor-pointer shrink-0"
                />
                <Input
                  value={stage.name}
                  onChange={(e) => setStageEdits((prev) => prev.map((s, i) => i === idx ? { ...s, name: e.target.value } : s))}
                  className="flex-1 h-8"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive hover:text-destructive shrink-0"
                  onClick={() => handleDeleteStage(stage.id)}
                  disabled={stageSaving}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}

            <Separator />

            <div className="flex items-center gap-2">
              <input
                type="color"
                value={stageNewColor}
                onChange={(e) => setStageNewColor(e.target.value)}
                className="size-7 rounded border cursor-pointer shrink-0"
              />
              <Input
                value={stageNewName}
                onChange={(e) => setStageNewName(e.target.value)}
                placeholder="New stage name..."
                className="flex-1 h-8"
                onKeyDown={(e) => { if (e.key === "Enter") handleAddStage(); }}
              />
              <Button size="sm" variant="outline" onClick={handleAddStage} disabled={!stageNewName.trim() || stageSaving}>
                <Plus className="size-3.5" /> Add
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStageManageOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveStages} disabled={stageSaving}>
              {stageSaving && <Loader2 className="size-4 animate-spin" />}
              Save Order & Names
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
  title, icon, isOpen, onToggle, records, type, emptyRecord, onSave, onDelete, saving, fields,
}: {
  title: string; icon: React.ReactNode; isOpen: boolean; onToggle: () => void; records: any[]; type: string; emptyRecord: any;
  onSave: (type: string, data: any, recordId?: string) => Promise<void>; onDelete: (type: string, recordId: string) => Promise<void>; saving: boolean; fields: FieldDef[];
}) {
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const startAdd = () => { setEditingRecord({ __new: true }); setEditForm({ ...emptyRecord }); };
  const startEdit = (record: any) => { setEditingRecord(record); const form: any = {}; fields.forEach((f) => { form[f.key] = record[f.key] ?? ""; }); setEditForm(form); };

  const handleSave = async () => {
    const data: any = {};
    fields.forEach((f) => { const val = editForm[f.key]?.toString().trim(); data[f.key] = val || null; });
    if (type === "diving" && data.diveCount) data.diveCount = parseInt(data.diveCount) || null;
    await onSave(type, data, editingRecord?.__new ? undefined : editingRecord?.id);
    setEditingRecord(null);
  };

  const renderFields = (fields: FieldDef[]) => fields.map((f) =>
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
  );

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-3 py-2 h-auto">
          <span className="flex items-center gap-2 text-sm font-medium">{icon} {title}<Badge variant="secondary" className="ml-1 text-xs">{records.length}</Badge></span>
          {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 space-y-3">
        {records.map((record) => (
          <div key={record.id} className="border rounded-md p-3 space-y-2">
            {editingRecord?.id === record.id ? (
              <>
                <div className="grid grid-cols-2 gap-2">{renderFields(fields)}</div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => setEditingRecord(null)}>Cancel</Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>{saving && <Loader2 className="size-3 animate-spin" />}Save</Button>
                </div>
              </>
            ) : (
              <div className="flex items-start justify-between">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm flex-1">
                  {fields.map((f) => { const val = record[f.key]; if (!val) return null; return (<div key={f.key} className={f.type === "textarea" ? "col-span-2" : ""}><span className="text-muted-foreground text-xs">{f.label}:</span> <span>{val}</span></div>); })}
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
            <div className="grid grid-cols-2 gap-2">{renderFields(fields)}</div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => setEditingRecord(null)}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>{saving && <Loader2 className="size-3 animate-spin" />}Add</Button>
            </div>
          </div>
        )}
        {!editingRecord && (
          <Button variant="outline" size="sm" className="w-full" onClick={startAdd}><Plus className="size-3" /> Add {title}</Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
