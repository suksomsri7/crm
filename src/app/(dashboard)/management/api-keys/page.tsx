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
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  KeyRound,
  Loader2,
  Search,
  Copy,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { useBrand } from "@/components/providers/brand-provider";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PERMISSION_GROUPS, type ResourceAction } from "@/lib/auth-types";

type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  user: { id: string; fullName: string };
  brand: { id: string; name: string };
};

type Brand = {
  id: string;
  name: string;
};

export default function ApiKeysPage() {
  const { data: session, status } = useSession();
  const { isSuperAdmin } = useBrand();
  const router = useRouter();

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create form
  const [createOpen, setCreateOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formBrandId, setFormBrandId] = useState("");
  const [formPermissions, setFormPermissions] = useState<string[]>([]);
  const [formExpiry, setFormExpiry] = useState("");
  const [creating, setCreating] = useState(false);

  // Created key display
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/api-keys");
      if (!res.ok) {
        if (res.status === 403) {
          router.push("/dashboard");
          return;
        }
        throw new Error("Failed to fetch");
      }
      const data = await res.json();
      setKeys(data.keys);
    } catch {
      toast.error("Failed to load API keys");
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchBrands = useCallback(async () => {
    try {
      const res = await fetch("/api/brands");
      if (!res.ok) return;
      const data = await res.json();
      setBrands(data.brands || []);
    } catch {
      setBrands([]);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated" && !isSuperAdmin) {
      router.push("/dashboard");
      return;
    }
    if (status === "authenticated" && isSuperAdmin) {
      fetchKeys();
      fetchBrands();
    }
  }, [status, isSuperAdmin, router, fetchKeys, fetchBrands]);

  const filteredKeys = keys.filter(
    (k) =>
      k.name.toLowerCase().includes(search.toLowerCase()) ||
      k.brand.name.toLowerCase().includes(search.toLowerCase()) ||
      k.keyPrefix.toLowerCase().includes(search.toLowerCase())
  );

  const togglePermission = (perm: string) => {
    setFormPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const toggleGroup = (perms: string[]) => {
    const allSelected = perms.every((p) => formPermissions.includes(p));
    if (allSelected) {
      setFormPermissions((prev) => prev.filter((p) => !perms.includes(p)));
    } else {
      setFormPermissions((prev) => [...new Set([...prev, ...perms])]);
    }
  };

  const openCreate = () => {
    setFormName("");
    setFormBrandId("");
    setFormPermissions([]);
    setFormExpiry("");
    setCreatedKey(null);
    setShowKey(false);
    setCopied(false);
    setCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formBrandId) {
      toast.error("Name and brand are required");
      return;
    }
    if (formPermissions.length === 0) {
      toast.error("Select at least one permission");
      return;
    }
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        name: formName.trim(),
        brandId: formBrandId,
        permissions: formPermissions,
      };
      if (formExpiry) body.expiresAt = new Date(formExpiry).toISOString();

      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.formErrors?.[0] || "Failed to create");

      setCreatedKey(data.key);
      setShowKey(true);
      fetchKeys();
      toast.success("API Key created");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleActive = async (key: ApiKey) => {
    try {
      const res = await fetch(`/api/api-keys/${key.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !key.isActive }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(key.isActive ? "Key deactivated" : "Key activated");
      fetchKeys();
    } catch {
      toast.error("Failed to update key");
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("API Key deleted");
      fetchKeys();
    } catch {
      toast.error("Failed to delete key");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (status === "loading" || (status === "authenticated" && !isSuperAdmin)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">API Keys</h2>
        <p className="text-muted-foreground">
          Manage API keys for external integrations (n8n, webhooks, etc.)
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Keys</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, brand, prefix..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64 h-9"
              />
            </div>
            <Dialog
              open={createOpen}
              onOpenChange={(open) => {
                if (!open && createdKey) {
                  setCreatedKey(null);
                }
                setCreateOpen(open);
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" onClick={openCreate}>
                  <Plus className="size-4 mr-2" />
                  Create Key
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {createdKey ? "API Key Created" : "Create API Key"}
                  </DialogTitle>
                  {createdKey && (
                    <DialogDescription>
                      Copy this key now. It will not be shown again.
                    </DialogDescription>
                  )}
                </DialogHeader>

                {createdKey ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border bg-muted/50 p-4">
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        API Key
                      </Label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-sm break-all font-mono">
                          {showKey ? createdKey : createdKey.slice(0, 12) + "••••••••••••••••"}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 size-8"
                          onClick={() => setShowKey(!showKey)}
                        >
                          {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={handleCopy}
                        >
                          {copied ? (
                            <Check className="size-4 mr-1" />
                          ) : (
                            <Copy className="size-4 mr-1" />
                          )}
                          {copied ? "Copied" : "Copy"}
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        This key will only be displayed once. Please copy and store it securely.
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground mb-1">Usage in n8n (HTTP Request node)</p>
                      <p className="text-sm font-mono">
                        Header: <span className="font-semibold">x-api-key</span> = <span className="text-muted-foreground">[your key]</span>
                      </p>
                    </div>
                    <DialogFooter>
                      <Button onClick={() => setCreateOpen(false)}>Done</Button>
                    </DialogFooter>
                  </div>
                ) : (
                  <form onSubmit={handleCreate} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="key-name">Name</Label>
                      <Input
                        id="key-name"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="e.g. n8n Production"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Brand</Label>
                      <Select value={formBrandId} onValueChange={setFormBrandId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select brand" />
                        </SelectTrigger>
                        <SelectContent>
                          {brands.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Expiry (optional)</Label>
                      <Input
                        type="date"
                        value={formExpiry}
                        onChange={(e) => setFormExpiry(e.target.value)}
                      />
                    </div>
                    <div className="space-y-3">
                      <Label>Permissions</Label>
                      <div className="grid gap-3 max-h-60 overflow-y-auto rounded-lg border p-3">
                        {Object.entries(PERMISSION_GROUPS).map(
                          ([key, group]) => {
                            const perms = group.permissions as string[];
                            const allChecked = perms.every((p) =>
                              formPermissions.includes(p)
                            );
                            const someChecked =
                              !allChecked &&
                              perms.some((p) => formPermissions.includes(p));
                            return (
                              <div key={key} className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id={`group-${key}`}
                                    checked={
                                      allChecked
                                        ? true
                                        : someChecked
                                        ? "indeterminate"
                                        : false
                                    }
                                    onCheckedChange={() => toggleGroup(perms)}
                                  />
                                  <Label
                                    htmlFor={`group-${key}`}
                                    className="text-sm font-medium cursor-pointer"
                                  >
                                    {group.label}
                                  </Label>
                                </div>
                                <div className="ml-6 flex flex-wrap gap-x-4 gap-y-1">
                                  {perms.map((perm) => (
                                    <div
                                      key={perm}
                                      className="flex items-center gap-1.5"
                                    >
                                      <Checkbox
                                        id={`perm-${perm}`}
                                        checked={formPermissions.includes(perm)}
                                        onCheckedChange={() =>
                                          togglePermission(perm)
                                        }
                                      />
                                      <Label
                                        htmlFor={`perm-${perm}`}
                                        className="text-xs font-normal text-muted-foreground cursor-pointer"
                                      >
                                        {perm.split(":")[1]}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCreateOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={creating}>
                        {creating && (
                          <Loader2 className="size-4 mr-2 animate-spin" />
                        )}
                        Create
                      </Button>
                    </DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-lg">
              <KeyRound className="size-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {search
                  ? "No keys match your search."
                  : "No API keys yet. Create one to integrate with n8n or other tools."}
              </p>
              {!search && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={openCreate}
                >
                  <Plus className="size-4 mr-2" />
                  Create Key
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                        {key.keyPrefix}••••••••
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {key.brand.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {key.permissions.length <= 3 ? (
                          key.permissions.map((p) => (
                            <Badge
                              key={p}
                              variant="outline"
                              className="text-xs"
                            >
                              {p}
                            </Badge>
                          ))
                        ) : (
                          <>
                            <Badge variant="outline" className="text-xs">
                              {key.permissions[0]}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              +{key.permissions.length - 1} more
                            </Badge>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(key.lastUsedAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {key.expiresAt ? (
                        <span
                          className={
                            new Date(key.expiresAt) < new Date()
                              ? "text-destructive"
                              : ""
                          }
                        >
                          {formatDate(key.expiresAt)}
                        </span>
                      ) : (
                        "Never"
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={key.isActive}
                        onCheckedChange={() => handleToggleActive(key)}
                      />
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            disabled={deletingId === key.id}
                          >
                            {deletingId === key.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete &quot;{key.name}
                              &quot;? Any integrations using this key will stop
                              working immediately.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(key.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
