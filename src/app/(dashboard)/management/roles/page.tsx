"use client";

import { useCallback, useEffect, useState } from "react";
import { useBrand } from "@/components/providers/brand-provider";
import { PERMISSION_GROUPS, ALL_PERMISSIONS, type ResourceAction } from "@/lib/auth-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Shield, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Permission {
  id: string;
  resource: string;
  action: string;
}

interface RolePermission {
  roleId: string;
  permissionId: string;
  permission: Permission;
}

interface Role {
  id: string;
  brandId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  rolePermissions: RolePermission[];
  _count: { userBrands: number };
}

interface Brand {
  id: string;
  name: string;
  isActive: boolean;
}

function getPermissionStrings(role: Role): string[] {
  return role.rolePermissions.map(
    (rp) => `${rp.permission.resource}:${rp.permission.action}`
  );
}

export default function RolesPage() {
  const { allBrands, isSuperAdmin, activeBrand } = useBrand();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetch("/api/brands")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setBrands(data.filter((b: Brand) => b.isActive));
        }
      })
      .catch(() => {});
  }, [isSuperAdmin]);

  useEffect(() => {
    if (brands.length > 0 && !selectedBrandId) {
      setSelectedBrandId(activeBrand?.id ?? brands[0].id);
    }
  }, [brands, selectedBrandId, activeBrand]);

  const fetchRoles = useCallback(async () => {
    if (!selectedBrandId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/roles?brandId=${selectedBrandId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRoles(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load roles");
    } finally {
      setLoading(false);
    }
  }, [selectedBrandId]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const openCreateDialog = () => {
    setEditingRole(null);
    setRoleName("");
    setRoleDescription("");
    setSelectedPermissions(new Set());
    setDialogOpen(true);
  };

  const openEditDialog = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description ?? "");
    setSelectedPermissions(new Set(getPermissionStrings(role)));
    setDialogOpen(true);
  };

  const togglePermission = (perm: string) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  };

  const toggleGroup = (groupPerms: ResourceAction[]) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      const allSelected = groupPerms.every((p) => next.has(p));
      if (allSelected) {
        groupPerms.forEach((p) => next.delete(p));
      } else {
        groupPerms.forEach((p) => next.add(p));
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!roleName.trim()) {
      toast.error("Role name is required");
      return;
    }

    setSaving(true);
    try {
      const permissions = Array.from(selectedPermissions);

      if (editingRole) {
        const res = await fetch(`/api/roles/${editingRole.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: roleName, description: roleDescription || null, permissions }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to update role");
        }
        toast.success("Role updated");
      } else {
        const res = await fetch("/api/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brandId: selectedBrandId,
            name: roleName,
            description: roleDescription || null,
            permissions,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to create role");
        }
        toast.success("Role created");
      }

      setDialogOpen(false);
      fetchRoles();
    } catch (e: any) {
      toast.error(e.message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/roles/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete role");
      }
      toast.success("Role deleted");
      setDeleteTarget(null);
      fetchRoles();
    } catch (e: any) {
      toast.error(e.message ?? "Something went wrong");
    } finally {
      setDeleting(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Roles & Permissions</h2>
          <p className="text-muted-foreground">You need Super Admin access to manage roles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Roles & Permissions</h2>
          <p className="text-muted-foreground">Manage roles and permissions for each brand</p>
        </div>
        <Button onClick={openCreateDialog} disabled={!selectedBrandId}>
          <Plus className="mr-2 size-4" />
          Create Role
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Label>Brand</Label>
        <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a brand" />
          </SelectTrigger>
          <SelectContent>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : roles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="size-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No roles found for this brand</p>
            <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
              <Plus className="mr-2 size-4" />
              Create first role
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => {
            const permCount = role.rolePermissions.length;
            const userCount = role._count.userBrands;
            return (
              <Card key={role.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        {role.name}
                        {role.isDefault && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
                      </CardTitle>
                      {role.description && (
                        <CardDescription className="mt-1">{role.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => openEditDialog(role)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(role)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Shield className="size-3.5" />
                      {permCount} permission{permCount !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="size-3.5" />
                      {userCount} user{userCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden !flex !flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>{editingRole ? "Edit Role" : "Create Role"}</DialogTitle>
            <DialogDescription>
              {editingRole ? "Update role details and permissions" : "Set up a new role with permissions"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0 pr-2 -mr-2">
            <div className="space-y-4 pb-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="role-name">Name</Label>
                  <Input
                    id="role-name"
                    placeholder="e.g. Sales Manager"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role-desc">Description</Label>
                  <Textarea
                    id="role-desc"
                    placeholder="Optional description"
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    rows={1}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Permissions</Label>
                  <p className="text-xs text-muted-foreground">
                    {selectedPermissions.size} of {ALL_PERMISSIONS.length} selected
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSelectedPermissions(new Set(ALL_PERMISSIONS))}>Select All</Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSelectedPermissions(new Set())}>Clear All</Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(PERMISSION_GROUPS).map(([key, group]) => {
                  const allChecked = group.permissions.every((p) => selectedPermissions.has(p));
                  const someChecked = group.permissions.some((p) => selectedPermissions.has(p));
                  return (
                    <div key={key} className="space-y-2 rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={allChecked ? true : someChecked ? "indeterminate" : false}
                          onCheckedChange={() => toggleGroup(group.permissions)}
                        />
                        <Label className="text-sm font-medium cursor-pointer" onClick={() => toggleGroup(group.permissions)}>
                          {group.label}
                        </Label>
                        <Badge variant="secondary" className="text-[10px] ml-auto">
                          {group.permissions.filter((p) => selectedPermissions.has(p)).length}/{group.permissions.length}
                        </Badge>
                      </div>
                      <div className="space-y-1.5 pl-6">
                        {group.permissions.map((perm) => {
                          const action = perm.split(":")[1];
                          return (
                            <div key={perm} className="flex items-center gap-2">
                              <Checkbox
                                checked={selectedPermissions.has(perm)}
                                onCheckedChange={() => togglePermission(perm)}
                              />
                              <span className="text-xs capitalize text-muted-foreground">{action}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t pt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editingRole ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the role and all its permission assignments.
              {(deleteTarget?._count.userBrands ?? 0) > 0 && (
                <span className="block mt-2 font-medium text-destructive">
                  This role has {deleteTarget?._count.userBrands} user(s) assigned. Reassign them first.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
