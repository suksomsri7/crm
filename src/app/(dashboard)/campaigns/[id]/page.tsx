"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Search,
  Users,
  UserPlus,
  LayoutGrid,
  List,
  GripVertical,
  X,
  Upload,
  Check,
  Paperclip,
  MessageSquare,
  CheckSquare,
  Calendar,
  Tag,
  Send,
  Square,
  SquareCheck,
  FileIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useBrand } from "@/components/providers/brand-provider";
import { useSession } from "next-auth/react";
import { format } from "date-fns";

interface CampaignDetail {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string | null;
  budget: number | null;
  scheduledAt: string | null;
  createdAt: string;
  createdBy: { id: string; fullName: string } | null;
  _count: { members: number; stages: number };
}

interface Stage {
  id: string;
  name: string;
  color: string | null;
  order: number;
  _count: { members: number };
}

interface MemberPerson {
  id: string;
  name?: string;
  title?: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
}

interface CampaignMember {
  id: string;
  campaignId: string;
  stageId: string | null;
  customerId: string | null;
  leadId: string | null;
  status: string;
  addedVia: string;
  notes: string | null;
  description: string | null;
  priority: string;
  dueDate: string | null;
  labels: string[] | null;
  addedAt: string;
  customer: MemberPerson | null;
  lead: MemberPerson | null;
  stage: { id: string; name: string; color: string | null } | null;
  addedBy: { id: string; fullName: string } | null;
  _count?: { checklists: number; comments: number; attachments: number };
}

interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  order: number;
}

interface CommentItem {
  id: string;
  text: string;
  createdAt: string;
  user: { id: string; fullName: string };
}

interface AttachmentItem {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  createdAt: string;
}

interface MemberDetail extends CampaignMember {
  checklists: ChecklistItem[];
  comments: CommentItem[];
  attachments: AttachmentItem[];
}

interface SearchResult {
  id: string;
  type: "lead" | "customer";
  name: string;
  email: string | null;
  phone: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-300",
  scheduled: "bg-blue-100 text-blue-700 border-blue-300",
  running: "bg-green-100 text-green-700 border-green-300",
  completed: "bg-purple-100 text-purple-700 border-purple-300",
  paused: "bg-yellow-100 text-yellow-700 border-yellow-300",
};

function getMemberName(m: CampaignMember): string {
  const person = m.customer || m.lead;
  if (!person) return "Unknown";
  const parts = [person.firstName, person.lastName].filter(Boolean);
  return parts.length ? parts.join(" ") : (person as MemberPerson).name || (person as MemberPerson).title || "Unknown";
}

function getMemberType(m: CampaignMember): "Lead" | "Customer" {
  return m.leadId ? "Lead" : "Customer";
}

function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value);
  useEffect(() => { const t = setTimeout(() => setD(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return d;
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const { activeBrand } = useBrand();

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [members, setMembers] = useState<CampaignMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<"kanban" | "members">("kanban");

  // Add member dialog
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const debouncedMemberSearch = useDebounce(memberSearch, 300);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<SearchResult[]>([]);
  const [targetStageId, setTargetStageId] = useState<string>("__first__");
  const [addingMembers, setAddingMembers] = useState(false);

  // Add stage dialog
  const [addStageOpen, setAddStageOpen] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState("#6b7280");
  const [addingStage, setAddingStage] = useState(false);

  // Delete member
  const [deleteMemberOpen, setDeleteMemberOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<CampaignMember | null>(null);

  // Members tab filter
  const [memberFilterSearch, setMemberFilterSearch] = useState("");
  const debouncedFilterSearch = useDebounce(memberFilterSearch, 300);
  const [memberFilterStage, setMemberFilterStage] = useState("all");
  const [memberFilterType, setMemberFilterType] = useState("all");

  // Drag state (members)
  const dragMember = useRef<string | null>(null);
  const dragOverStage = useRef<string | null>(null);

  // Stage drag reorder
  const dragStageId = useRef<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  // Stage inline rename
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editingStageName, setEditingStageName] = useState("");

  // Import file
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<"lead" | "customer">("lead");
  const [importStageId, setImportStageId] = useState("__first__");
  const [importing, setImporting] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  // Card detail dialog
  const [cardDetailOpen, setCardDetailOpen] = useState(false);
  const [cardDetail, setCardDetail] = useState<MemberDetail | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardDescription, setCardDescription] = useState("");
  const [cardPriority, setCardPriority] = useState("medium");
  const [cardDueDate, setCardDueDate] = useState("");
  const [cardLabels, setCardLabels] = useState<string[]>([]);
  const [newLabelText, setNewLabelText] = useState("");
  const [newCheckText, setNewCheckText] = useState("");
  const [commentText, setCommentText] = useState("");
  const [savingCard, setSavingCard] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const fetchCampaign = useCallback(async () => {
    try {
      const res = await fetch(`/crm/api/campaigns/${id}`);
      if (!res.ok) throw new Error();
      setCampaign(await res.json());
    } catch {
      toast.error("Failed to load campaign");
      router.push("/campaigns");
    }
  }, [id, router]);

  const fetchStages = useCallback(async () => {
    try {
      const res = await fetch(`/crm/api/campaigns/${id}/stages`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStages(data.stages || []);
    } catch { /* ignore */ }
  }, [id]);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/crm/api/campaigns/${id}/members`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMembers(data.members || []);
    } catch { /* ignore */ }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([fetchCampaign(), fetchStages(), fetchMembers()]).finally(() => setLoading(false));
  }, [id, fetchCampaign, fetchStages, fetchMembers]);

  // Search leads/customers for add member dialog
  useEffect(() => {
    if (!debouncedMemberSearch.trim() || !activeBrand?.id) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    (async () => {
      try {
        const [leadsRes, customersRes] = await Promise.all([
          fetch(`/crm/api/leads?brandId=${activeBrand.id}&search=${encodeURIComponent(debouncedMemberSearch)}&limit=10`),
          fetch(`/crm/api/customers?brandId=${activeBrand.id}&search=${encodeURIComponent(debouncedMemberSearch)}&limit=10`),
        ]);
        const leadsData = leadsRes.ok ? await leadsRes.json() : { leads: [] };
        const customersData = customersRes.ok ? await customersRes.json() : { customers: [] };

        if (cancelled) return;

        const existingLeadIds = new Set(members.filter((m) => m.leadId).map((m) => m.leadId));
        const existingCustomerIds = new Set(members.filter((m) => m.customerId).map((m) => m.customerId));

        const results: SearchResult[] = [
          ...(leadsData.leads || [])
            .filter((l: any) => !existingLeadIds.has(l.id))
            .map((l: any) => ({
              id: l.id,
              type: "lead" as const,
              name: [l.firstName, l.lastName].filter(Boolean).join(" ") || l.title,
              email: l.email,
              phone: l.phone,
            })),
          ...(customersData.customers || [])
            .filter((c: any) => !existingCustomerIds.has(c.id))
            .map((c: any) => ({
              id: c.id,
              type: "customer" as const,
              name: [c.firstName, c.lastName].filter(Boolean).join(" ") || c.name,
              email: c.email,
              phone: c.phone,
            })),
        ];
        setSearchResults(results);
      } catch { /* ignore */ }
      finally { if (!cancelled) setSearchLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [debouncedMemberSearch, activeBrand?.id, members]);

  const handleAddMembers = async () => {
    if (!selectedMembers.length) return;
    setAddingMembers(true);
    try {
      const customerIds = selectedMembers.filter((s) => s.type === "customer").map((s) => s.id);
      const leadIds = selectedMembers.filter((s) => s.type === "lead").map((s) => s.id);
      const stageId = targetStageId === "__first__" ? (stages[0]?.id || null) : targetStageId === "__none__" ? null : targetStageId;

      const res = await fetch(`/crm/api/campaigns/${id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerIds, leadIds, stageId }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(`Added ${data.added} member(s)${data.skipped ? `, ${data.skipped} skipped` : ""}`);
      setAddMemberOpen(false);
      setSelectedMembers([]);
      setMemberSearch("");
      await Promise.all([fetchMembers(), fetchStages(), fetchCampaign()]);
    } catch {
      toast.error("Failed to add members");
    } finally {
      setAddingMembers(false);
    }
  };

  const handleAddStage = async () => {
    if (!newStageName.trim()) return;
    setAddingStage(true);
    try {
      const res = await fetch(`/crm/api/campaigns/${id}/stages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newStageName.trim(), color: newStageColor }),
      });
      if (!res.ok) throw new Error();
      toast.success("Stage added");
      setAddStageOpen(false);
      setNewStageName("");
      await fetchStages();
    } catch {
      toast.error("Failed to add stage");
    } finally {
      setAddingStage(false);
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    if (!confirm("Delete this stage? Members will be unassigned.")) return;
    try {
      await fetch(`/crm/api/campaigns/${id}/stages?stageId=${stageId}`, { method: "DELETE" });
      toast.success("Stage deleted");
      await Promise.all([fetchStages(), fetchMembers()]);
    } catch {
      toast.error("Failed to delete stage");
    }
  };

  const handleMoveMember = async (memberId: string, newStageId: string | null) => {
    try {
      await fetch(`/crm/api/campaigns/${id}/members?memberId=${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: newStageId }),
      });
      await Promise.all([fetchMembers(), fetchStages()]);
    } catch {
      toast.error("Failed to move member");
    }
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    try {
      await fetch(`/crm/api/campaigns/${id}/members?memberId=${memberToDelete.id}`, { method: "DELETE" });
      toast.success("Member removed");
      setDeleteMemberOpen(false);
      setMemberToDelete(null);
      await Promise.all([fetchMembers(), fetchStages(), fetchCampaign()]);
    } catch {
      toast.error("Failed to remove member");
    }
  };

  // Stage drag reorder handlers
  const handleStageDragStart = (e: React.DragEvent, stageId: string) => {
    dragStageId.current = stageId;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/stage", stageId);
  };
  const handleStageDragOver = (e: React.DragEvent, stageId: string) => {
    if (!dragStageId.current || dragStageId.current === stageId) return;
    if (e.dataTransfer.types.includes("text/stage")) {
      e.preventDefault();
      setDragOverStageId(stageId);
    }
  };
  const handleStageDrop = async (targetStageId: string) => {
    const sourceId = dragStageId.current;
    if (!sourceId || sourceId === targetStageId) { dragStageId.current = null; setDragOverStageId(null); return; }
    const newStages = [...stages];
    const srcIdx = newStages.findIndex((s) => s.id === sourceId);
    const tgtIdx = newStages.findIndex((s) => s.id === targetStageId);
    if (srcIdx < 0 || tgtIdx < 0) return;
    const [moved] = newStages.splice(srcIdx, 1);
    newStages.splice(tgtIdx, 0, moved);
    const reordered = newStages.map((s, i) => ({ ...s, order: i }));
    setStages(reordered);
    dragStageId.current = null;
    setDragOverStageId(null);
    try {
      await fetch(`/crm/api/campaigns/${id}/stages`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stages: reordered.map((s) => ({ id: s.id, order: s.order })) }),
      });
    } catch { toast.error("Failed to reorder"); await fetchStages(); }
  };

  // Stage inline rename
  const handleStageRename = async (stageId: string) => {
    if (!editingStageName.trim()) { setEditingStageId(null); return; }
    try {
      await fetch(`/crm/api/campaigns/${id}/stages`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stages: [{ id: stageId, name: editingStageName.trim(), order: stages.find((s) => s.id === stageId)?.order ?? 0 }] }),
      });
      setEditingStageId(null);
      await fetchStages();
    } catch { toast.error("Failed to rename stage"); }
  };

  // Import CSV handler
  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", importFile);
      fd.append("type", importType);
      const stageId = importStageId === "__first__" ? (stages[0]?.id || "") : importStageId === "__none__" ? "" : importStageId;
      if (stageId) fd.append("stageId", stageId);
      const res = await fetch(`/crm/api/campaigns/${id}/members/import`, { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(`Imported ${data.imported} member(s)${data.skipped ? `, ${data.skipped} skipped` : ""}`);
      setImportOpen(false);
      setImportFile(null);
      await Promise.all([fetchMembers(), fetchStages(), fetchCampaign()]);
    } catch { toast.error("Failed to import"); }
    finally { setImporting(false); }
  };

  // Card detail handlers
  const openCardDetail = async (m: CampaignMember) => {
    setCardDetailOpen(true);
    setCardLoading(true);
    try {
      const res = await fetch(`/crm/api/campaigns/${id}/members/${m.id}`);
      if (!res.ok) throw new Error();
      const detail: MemberDetail = await res.json();
      setCardDetail(detail);
      setCardDescription(detail.description || "");
      setCardPriority(detail.priority || "medium");
      setCardDueDate(detail.dueDate ? new Date(detail.dueDate).toISOString().split("T")[0] : "");
      setCardLabels(Array.isArray(detail.labels) ? detail.labels : []);
    } catch { toast.error("Failed to load card"); setCardDetailOpen(false); }
    finally { setCardLoading(false); }
  };

  const saveCardFields = async () => {
    if (!cardDetail) return;
    setSavingCard(true);
    try {
      await fetch(`/crm/api/campaigns/${id}/members?memberId=${cardDetail.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: cardDescription || null,
          priority: cardPriority,
          dueDate: cardDueDate || null,
          labels: cardLabels.length ? cardLabels : null,
        }),
      });
      toast.success("Saved");
      await fetchMembers();
    } catch { toast.error("Failed to save"); }
    finally { setSavingCard(false); }
  };

  const addChecklistItem = async () => {
    if (!cardDetail || !newCheckText.trim()) return;
    try {
      const res = await fetch(`/crm/api/campaigns/${id}/members/${cardDetail.id}/checklists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newCheckText.trim() }),
      });
      if (!res.ok) throw new Error();
      const item: ChecklistItem = await res.json();
      setCardDetail((d) => d ? { ...d, checklists: [...d.checklists, item] } : d);
      setNewCheckText("");
    } catch { toast.error("Failed to add"); }
  };

  const toggleChecklistItem = async (itemId: string, done: boolean) => {
    if (!cardDetail) return;
    try {
      await fetch(`/crm/api/campaigns/${id}/members/${cardDetail.id}/checklists?itemId=${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done }),
      });
      setCardDetail((d) => d ? { ...d, checklists: d.checklists.map((c) => c.id === itemId ? { ...c, done } : c) } : d);
    } catch { toast.error("Failed to update"); }
  };

  const deleteChecklistItem = async (itemId: string) => {
    if (!cardDetail) return;
    try {
      await fetch(`/crm/api/campaigns/${id}/members/${cardDetail.id}/checklists?itemId=${itemId}`, { method: "DELETE" });
      setCardDetail((d) => d ? { ...d, checklists: d.checklists.filter((c) => c.id !== itemId) } : d);
    } catch { toast.error("Failed to delete"); }
  };

  const addComment = async () => {
    if (!cardDetail || !commentText.trim()) return;
    try {
      const res = await fetch(`/crm/api/campaigns/${id}/members/${cardDetail.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: commentText.trim() }),
      });
      if (!res.ok) throw new Error();
      const comment: CommentItem = await res.json();
      setCardDetail((d) => d ? { ...d, comments: [comment, ...d.comments] } : d);
      setCommentText("");
    } catch { toast.error("Failed to add comment"); }
  };

  const deleteComment = async (commentId: string) => {
    if (!cardDetail) return;
    try {
      await fetch(`/crm/api/campaigns/${id}/members/${cardDetail.id}/comments?commentId=${commentId}`, { method: "DELETE" });
      setCardDetail((d) => d ? { ...d, comments: d.comments.filter((c) => c.id !== commentId) } : d);
    } catch { toast.error("Failed to delete"); }
  };

  const uploadAttachment = async (file: File) => {
    if (!cardDetail) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`/crm/api/campaigns/${id}/members/${cardDetail.id}/attachments`, { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      const att: AttachmentItem = await res.json();
      setCardDetail((d) => d ? { ...d, attachments: [att, ...d.attachments] } : d);
      toast.success("File uploaded");
    } catch { toast.error("Failed to upload"); }
  };

  const deleteAttachment = async (fileId: string) => {
    if (!cardDetail) return;
    try {
      await fetch(`/crm/api/campaigns/${id}/members/${cardDetail.id}/attachments?fileId=${fileId}`, { method: "DELETE" });
      setCardDetail((d) => d ? { ...d, attachments: d.attachments.filter((a) => a.id !== fileId) } : d);
    } catch { toast.error("Failed to delete"); }
  };

  const deleteCard = async () => {
    if (!cardDetail || !confirm("Delete this card from the campaign?")) return;
    try {
      await fetch(`/crm/api/campaigns/${id}/members?memberId=${cardDetail.id}`, { method: "DELETE" });
      toast.success("Card deleted");
      setCardDetailOpen(false);
      setCardDetail(null);
      await Promise.all([fetchMembers(), fetchStages(), fetchCampaign()]);
    } catch { toast.error("Failed to delete"); }
  };

  // Member drag handlers for Kanban
  const handleDragStart = (memberId: string) => { dragMember.current = memberId; };
  const handleDragOver = (e: React.DragEvent, stageId: string) => { e.preventDefault(); dragOverStage.current = stageId; };
  const handleDrop = (stageId: string) => {
    if (dragMember.current) {
      handleMoveMember(dragMember.current, stageId);
      dragMember.current = null;
      dragOverStage.current = null;
    }
  };

  // Filtered members for table view
  const filteredMembers = members.filter((m) => {
    if (memberFilterStage !== "all" && (m.stageId || "__none__") !== memberFilterStage) return false;
    if (memberFilterType === "lead" && !m.leadId) return false;
    if (memberFilterType === "customer" && !m.customerId) return false;
    if (debouncedFilterSearch) {
      const name = getMemberName(m).toLowerCase();
      const person = m.customer || m.lead;
      const email = person?.email?.toLowerCase() || "";
      const phone = person?.phone || "";
      const q = debouncedFilterSearch.toLowerCase();
      if (!name.includes(q) && !email.includes(q) && !phone.includes(q)) return false;
    }
    return true;
  });

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!campaign) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/campaigns")} className="mt-0.5">
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-bold tracking-tight">{campaign.name}</h2>
              <Badge className={`capitalize ${STATUS_COLORS[campaign.status] || ""}`}>{campaign.status}</Badge>
              <Badge variant="outline" className="capitalize">{campaign.type}</Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span><Users className="size-3.5 inline mr-1" />{campaign._count.members} members</span>
              <span><LayoutGrid className="size-3.5 inline mr-1" />{campaign._count.stages} stages</span>
              {campaign.budget != null && <span>Budget: ฿{campaign.budget.toLocaleString()}</span>}
              {campaign.createdBy && <span>By {campaign.createdBy.fullName}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setImportFile(null); setImportType("lead"); setImportStageId("__first__"); setImportOpen(true); }}>
            <Upload className="size-4" />Import CSV
          </Button>
          <Button size="sm" onClick={() => { setSelectedMembers([]); setMemberSearch(""); setTargetStageId("__first__"); setAddMemberOpen(true); }}>
            <UserPlus className="size-4" />Add Members
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "kanban" | "members")}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="kanban"><LayoutGrid className="size-4" />Kanban</TabsTrigger>
            <TabsTrigger value="members"><List className="size-4" />Members</TabsTrigger>
          </TabsList>
          {viewMode === "kanban" && (
            <Button variant="outline" size="sm" onClick={() => setAddStageOpen(true)}>
              <Plus className="size-4" />Add Stage
            </Button>
          )}
        </div>

        {/* Kanban View */}
        <TabsContent value="kanban" className="mt-4">
          {stages.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center justify-center py-16">
              <LayoutGrid className="size-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No stages yet</p>
              <Button size="sm" className="mt-4" onClick={() => setAddStageOpen(true)}><Plus className="size-4" />Add Stage</Button>
            </CardContent></Card>
          ) : (
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4 min-w-max">
                {stages.map((stage) => {
                  const stageMembers = members.filter((m) => m.stageId === stage.id);
                  return (
                    <div
                      key={stage.id}
                      className={`w-72 shrink-0 rounded-lg border bg-muted/20 transition-all ${dragOverStageId === stage.id ? "ring-2 ring-primary" : ""}`}
                      onDragOver={(e) => { handleDragOver(e, stage.id); handleStageDragOver(e, stage.id); }}
                      onDrop={(e) => { if (e.dataTransfer.types.includes("text/stage")) handleStageDrop(stage.id); else handleDrop(stage.id); }}
                      onDragLeave={() => setDragOverStageId(null)}
                    >
                      <div
                        className="flex items-center justify-between px-3 py-2 border-b cursor-grab active:cursor-grabbing"
                        style={{ borderTopColor: stage.color || undefined, borderTopWidth: stage.color ? 3 : undefined }}
                        draggable
                        onDragStart={(e) => handleStageDragStart(e, stage.id)}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <GripVertical className="size-3.5 text-muted-foreground shrink-0" />
                          {stage.color && <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />}
                          {editingStageId === stage.id ? (
                            <div className="flex items-center gap-1 flex-1">
                              <Input
                                value={editingStageName}
                                onChange={(e) => setEditingStageName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleStageRename(stage.id); if (e.key === "Escape") setEditingStageId(null); }}
                                className="h-6 text-sm px-1"
                                autoFocus
                              />
                              <Button variant="ghost" size="icon" className="size-5" onClick={() => handleStageRename(stage.id)}><Check className="size-3" /></Button>
                            </div>
                          ) : (
                            <span className="text-sm font-semibold truncate cursor-text" onDoubleClick={() => { setEditingStageId(stage.id); setEditingStageName(stage.name); }}>{stage.name}</span>
                          )}
                          <Badge variant="secondary" className="text-xs shrink-0">{stageMembers.length}</Badge>
                        </div>
                        <Button variant="ghost" size="icon" className="size-6 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleDeleteStage(stage.id)}>
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                      <div className="p-2 space-y-2 min-h-[80px]">
                        {stageMembers.map((m) => (
                          <div
                            key={m.id}
                            draggable
                            onDragStart={() => handleDragStart(m.id)}
                            onClick={() => openCardDetail(m)}
                            className="p-2.5 rounded-md border bg-background cursor-pointer hover:shadow-sm transition-shadow"
                          >
                            <div className="flex items-start gap-2">
                              <GripVertical className="size-4 text-muted-foreground shrink-0 mt-0.5 cursor-grab" onMouseDown={(e) => e.stopPropagation()} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-medium truncate">{getMemberName(m)}</p>
                                  <Badge variant={m.leadId ? "secondary" : "default"} className="text-[10px] px-1 py-0">{getMemberType(m)}</Badge>
                                </div>
                                {(m.customer?.email || m.lead?.email) && (
                                  <p className="text-xs text-muted-foreground truncate">{m.customer?.email || m.lead?.email}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 ml-6 flex-wrap">
                              {m.addedBy && <span className="text-[10px] text-muted-foreground">by {m.addedBy.fullName}</span>}
                              {m.addedVia && <Badge variant="outline" className={`text-[10px] px-1 py-0 ${m.addedVia === "import" ? "border-amber-400 text-amber-600" : m.addedVia === "ai" ? "border-purple-400 text-purple-600" : "border-gray-300 text-gray-500"}`}>{m.addedVia}</Badge>}
                              {m.dueDate && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Calendar className="size-2.5" />{format(new Date(m.dueDate), "MMM d")}</span>}
                              {m.priority && m.priority !== "medium" && <Badge variant="outline" className={`text-[10px] px-1 py-0 ${m.priority === "high" ? "border-red-400 text-red-600" : "border-blue-300 text-blue-500"}`}>{m.priority}</Badge>}
                              {(m._count?.checklists ?? 0) > 0 && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><CheckSquare className="size-2.5" />{m._count!.checklists}</span>}
                              {(m._count?.comments ?? 0) > 0 && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MessageSquare className="size-2.5" />{m._count!.comments}</span>}
                              {(m._count?.attachments ?? 0) > 0 && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Paperclip className="size-2.5" />{m._count!.attachments}</span>}
                            </div>
                          </div>
                        ))}
                        {stageMembers.length === 0 && (
                          <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">Drop members here</div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Unassigned column */}
                {members.some((m) => !m.stageId) && (
                  <div className="w-72 shrink-0 rounded-lg border bg-muted/10 border-dashed">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-dashed">
                      <span className="text-sm font-semibold text-muted-foreground">Unassigned</span>
                      <Badge variant="secondary" className="text-xs">{members.filter((m) => !m.stageId).length}</Badge>
                    </div>
                    <div className="p-2 space-y-2 min-h-[80px]">
                      {members.filter((m) => !m.stageId).map((m) => (
                        <div
                          key={m.id}
                          draggable
                          onDragStart={() => handleDragStart(m.id)}
                          onClick={() => openCardDetail(m)}
                          className="p-2.5 rounded-md border bg-background cursor-pointer hover:shadow-sm"
                        >
                          <div className="flex items-start gap-2">
                            <GripVertical className="size-4 text-muted-foreground shrink-0 mt-0.5 cursor-grab" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium truncate">{getMemberName(m)}</p>
                                <Badge variant={m.leadId ? "secondary" : "default"} className="text-[10px] px-1 py-0">{getMemberType(m)}</Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Members Table View */}
        <TabsContent value="members" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">All Members ({members.length})</CardTitle>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input placeholder="Search..." value={memberFilterSearch} onChange={(e) => setMemberFilterSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={memberFilterStage} onValueChange={setMemberFilterStage}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="__none__">Unassigned</SelectItem>
                    {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={memberFilterType} onValueChange={setMemberFilterType}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="lead">Leads</SelectItem>
                    <SelectItem value="customer">Customers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Users className="size-10 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No members found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Added By</TableHead>
                      <TableHead>Via</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{getMemberName(m)}</TableCell>
                        <TableCell>
                          <Badge variant={m.leadId ? "secondary" : "default"} className="text-xs">{getMemberType(m)}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{m.customer?.email || m.lead?.email || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{m.customer?.phone || m.lead?.phone || "—"}</TableCell>
                        <TableCell>
                          <Select value={m.stageId || "__none__"} onValueChange={(v) => handleMoveMember(m.id, v === "__none__" ? null : v)}>
                            <SelectTrigger className="h-7 text-xs w-[130px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Unassigned</SelectItem>
                              {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm">{m.addedBy?.fullName || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs px-1.5 py-0 ${m.addedVia === "import" ? "border-amber-400 text-amber-600" : m.addedVia === "ai" ? "border-purple-400 text-purple-600" : "border-gray-300 text-gray-500"}`}>{m.addedVia || "add"}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(m.addedAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" onClick={() => { setMemberToDelete(m); setDeleteMemberOpen(true); }}>
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Members Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Members to Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Search Leads & Customers</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input placeholder="Search by name, email, or phone..." value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} className="pl-9" />
              </div>
            </div>

            {searchLoading && <div className="flex justify-center py-4"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>}

            {!searchLoading && searchResults.length > 0 && (
              <div className="border rounded-md max-h-48 overflow-y-auto">
                {searchResults.map((r) => {
                  const isSelected = selectedMembers.some((s) => s.id === r.id && s.type === r.type);
                  return (
                    <div
                      key={`${r.type}-${r.id}`}
                      className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors ${isSelected ? "bg-muted" : ""}`}
                      onClick={() => {
                        if (isSelected) setSelectedMembers((prev) => prev.filter((s) => !(s.id === r.id && s.type === r.type)));
                        else setSelectedMembers((prev) => [...prev, r]);
                      }}
                    >
                      <input type="checkbox" checked={isSelected} readOnly className="size-4" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium">{r.name}</span>
                          <Badge variant={r.type === "lead" ? "secondary" : "default"} className="text-[10px] px-1 py-0">{r.type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{[r.email, r.phone].filter(Boolean).join(" · ")}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!searchLoading && debouncedMemberSearch && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No results found</p>
            )}

            {selectedMembers.length > 0 && (
              <div className="space-y-2">
                <Label>Selected ({selectedMembers.length})</Label>
                <div className="flex flex-wrap gap-1.5">
                  {selectedMembers.map((s) => (
                    <Badge key={`${s.type}-${s.id}`} variant="outline" className="gap-1 pr-1">
                      {s.name}
                      <Button variant="ghost" size="icon" className="size-4" onClick={() => setSelectedMembers((prev) => prev.filter((p) => !(p.id === s.id && p.type === s.type)))}>
                        <X className="size-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Add to Stage</Label>
              <Select value={targetStageId} onValueChange={setTargetStageId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__first__">First stage ({stages[0]?.name || "—"})</SelectItem>
                  <SelectItem value="__none__">No stage (unassigned)</SelectItem>
                  {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberOpen(false)}>Cancel</Button>
            <Button onClick={handleAddMembers} disabled={addingMembers || !selectedMembers.length}>
              {addingMembers ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              Add {selectedMembers.length} Member{selectedMembers.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Stage Dialog */}
      <Dialog open={addStageOpen} onOpenChange={setAddStageOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Stage</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Stage Name</Label>
              <Input value={newStageName} onChange={(e) => setNewStageName(e.target.value)} placeholder="e.g. Interested, Registered" />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={newStageColor} onChange={(e) => setNewStageColor(e.target.value)} className="size-8 rounded border cursor-pointer" />
                <Input value={newStageColor} onChange={(e) => setNewStageColor(e.target.value)} className="flex-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddStageOpen(false)}>Cancel</Button>
            <Button onClick={handleAddStage} disabled={addingStage || !newStageName.trim()}>
              {addingStage && <Loader2 className="size-4 animate-spin" />}
              Add Stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Card Detail Dialog */}
      <Dialog open={cardDetailOpen} onOpenChange={(open) => { if (!open) { setCardDetailOpen(false); setCardDetail(null); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          {cardLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : cardDetail ? (
            <div className="flex flex-col sm:flex-row">
              {/* Left side - main content */}
              <div className="flex-1 p-6 space-y-5 min-w-0">
                <div>
                  <h3 className="text-lg font-semibold">{getMemberName(cardDetail)}</h3>
                  <p className="text-sm text-muted-foreground">in {cardDetail.stage?.name || "Unassigned"}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {cardDetail.addedBy && <span className="text-xs text-muted-foreground">Added by {cardDetail.addedBy.fullName}</span>}
                    {cardDetail.addedVia && (
                      <Badge variant="outline" className={`text-xs px-1.5 py-0 ${cardDetail.addedVia === "import" ? "border-amber-400 text-amber-600" : cardDetail.addedVia === "ai" ? "border-purple-400 text-purple-600" : "border-gray-300 text-gray-500"}`}>
                        via {cardDetail.addedVia}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{format(new Date(cardDetail.addedAt), "MMM d, yyyy HH:mm")}</span>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Description</Label>
                  <Textarea
                    value={cardDescription}
                    onChange={(e) => setCardDescription(e.target.value)}
                    onBlur={saveCardFields}
                    placeholder="Add a description..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <Separator />

                {/* Checklist */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="size-4" />
                    <span className="text-sm font-semibold">Checklist</span>
                  </div>
                  {cardDetail.checklists.length > 0 && (
                    <div className="space-y-1">
                      {(() => {
                        const total = cardDetail.checklists.length;
                        const done = cardDetail.checklists.filter((c) => c.done).length;
                        return total > 0 ? (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(done / total) * 100}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{done}/{total}</span>
                          </div>
                        ) : null;
                      })()}
                      {cardDetail.checklists.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 group">
                          <button onClick={() => toggleChecklistItem(item.id, !item.done)} className="shrink-0">
                            {item.done ? <SquareCheck className="size-4 text-primary" /> : <Square className="size-4 text-muted-foreground" />}
                          </button>
                          <span className={`text-sm flex-1 ${item.done ? "line-through text-muted-foreground" : ""}`}>{item.text}</span>
                          <Button variant="ghost" size="icon" className="size-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive" onClick={() => deleteChecklistItem(item.id)}>
                            <X className="size-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Plus className="size-4 text-muted-foreground shrink-0" />
                    <Input
                      value={newCheckText}
                      onChange={(e) => setNewCheckText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") addChecklistItem(); }}
                      placeholder="Add subtask"
                      className="h-7 text-sm"
                    />
                  </div>
                </div>

                <Separator />

                {/* Attachments */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Paperclip className="size-4" />
                      <span className="text-sm font-semibold">Attachments ({cardDetail.attachments.length})</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => attachmentInputRef.current?.click()}>
                      <Upload className="size-3" />Upload
                    </Button>
                    <input ref={attachmentInputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAttachment(f); e.target.value = ""; }} />
                  </div>
                  {cardDetail.attachments.length > 0 && (
                    <div className="space-y-1">
                      {cardDetail.attachments.map((att) => (
                        <div key={att.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 group">
                          <FileIcon className="size-4 text-muted-foreground shrink-0" />
                          <a href={att.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate flex-1">{att.fileName}</a>
                          <span className="text-xs text-muted-foreground shrink-0">{(att.fileSize / 1024).toFixed(0)}KB</span>
                          <Button variant="ghost" size="icon" className="size-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive" onClick={() => deleteAttachment(att.id)}>
                            <X className="size-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Comments */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="size-4" />
                    <span className="text-sm font-semibold">Comments ({cardDetail.comments.length})</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write a comment... Use @ to mention"
                      rows={2}
                      className="resize-none flex-1"
                    />
                    <Button size="icon" className="size-8 shrink-0 mt-1" disabled={!commentText.trim()} onClick={addComment}>
                      <Send className="size-3.5" />
                    </Button>
                  </div>
                  {cardDetail.comments.length > 0 && (
                    <div className="space-y-3 mt-2">
                      {cardDetail.comments.map((c) => (
                        <div key={c.id} className="group">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{c.user.fullName}</span>
                            <span className="text-xs text-muted-foreground">{format(new Date(c.createdAt), "MMM d, yyyy HH:mm")}</span>
                            <Button variant="ghost" size="icon" className="size-4 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive ml-auto" onClick={() => deleteComment(c.id)}>
                              <X className="size-3" />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{c.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right sidebar */}
              <div className="w-full sm:w-56 border-t sm:border-t-0 sm:border-l p-4 space-y-4 bg-muted/10">
                {/* Priority */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Priority</Label>
                  <Select value={cardPriority} onValueChange={(v) => { setCardPriority(v); setTimeout(saveCardFields, 0); }}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Due Date */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1"><Calendar className="size-3" />Due Date</Label>
                  <Input type="date" value={cardDueDate} onChange={(e) => setCardDueDate(e.target.value)} onBlur={saveCardFields} className="h-8 text-sm" />
                </div>

                <Separator />

                {/* Labels */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1"><Tag className="size-3" />Labels</Label>
                  {cardLabels.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {cardLabels.map((lbl, i) => (
                        <Badge key={i} variant="secondary" className="text-xs gap-1 pr-1">
                          {lbl}
                          <button onClick={() => { const next = cardLabels.filter((_, idx) => idx !== i); setCardLabels(next); setTimeout(saveCardFields, 0); }} className="hover:text-destructive"><X className="size-2.5" /></button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Input
                      value={newLabelText}
                      onChange={(e) => setNewLabelText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && newLabelText.trim()) { setCardLabels((prev) => [...prev, newLabelText.trim()]); setNewLabelText(""); setTimeout(saveCardFields, 0); } }}
                      placeholder="Add label"
                      className="h-7 text-xs"
                    />
                  </div>
                </div>

                <Separator />

                {/* Assignees (info) */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1"><Users className="size-3" />Assignees</Label>
                  <p className="text-sm">{cardDetail.addedBy?.fullName || "—"}</p>
                </div>

                <Separator />

                {/* Delete */}
                <Button variant="destructive" size="sm" className="w-full" onClick={deleteCard}>
                  <Trash2 className="size-3.5" />Delete card
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Import Members from CSV</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>CSV File</Label>
              <p className="text-xs text-muted-foreground">Format: firstName, lastName, email, phone (header row required)</p>
              <Input ref={importFileRef} type="file" accept=".csv,.txt" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-2">
              <Label>Create as</Label>
              <Select value={importType} onValueChange={(v) => setImportType(v as "lead" | "customer")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Leads</SelectItem>
                  <SelectItem value="customer">Customers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Add to Stage</Label>
              <Select value={importStageId} onValueChange={setImportStageId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__first__">First stage ({stages[0]?.name || "—"})</SelectItem>
                  <SelectItem value="__none__">No stage (unassigned)</SelectItem>
                  {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={importing || !importFile}>
              {importing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Member Alert */}
      <AlertDialog open={deleteMemberOpen} onOpenChange={setDeleteMemberOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {memberToDelete ? getMemberName(memberToDelete) : ""} from this campaign?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDeleteMember(); }}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
