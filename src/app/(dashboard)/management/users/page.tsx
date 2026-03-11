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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Plus,
  Pencil,
  Trash2,
  UserCog,
  Shield,
  Building2,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useBrand } from "@/components/providers/brand-provider";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type UserBrand = {
  brand: { id: string; name: string };
  role: { id: string; name: string };
};

type User = {
  id: string;
  username: string;
  email: string | null;
  fullName: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  avatarUrl: string | null;
  createdAt: string;
  userBrands: UserBrand[];
};

type BrandWithRoles = {
  id: string;
  name: string;
  roles: { id: string; name: string }[];
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function UsersPage() {
  const { data: session, status } = useSession();
  const { isSuperAdmin } = useBrand();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [manageBrandsDialogOpen, setManageBrandsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [manageBrandsUser, setManageBrandsUser] = useState<User | null>(null);

  // Create form
  const [formFullName, setFormFullName] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formIsSuperAdmin, setFormIsSuperAdmin] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Edit form
  const [editFullName, setEditFullName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editIsSuperAdmin, setEditIsSuperAdmin] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Manage brands
  const [brandsWithRoles, setBrandsWithRoles] = useState<BrandWithRoles[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [assignBrandId, setAssignBrandId] = useState<string>("");
  const [assignRoleId, setAssignRoleId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [removingBrandId, setRemovingBrandId] = useState<string | null>(null);

  // Delete
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      if (!res.ok) {
        if (res.status === 403) {
          router.push("/dashboard");
          return;
        }
        throw new Error("Failed to fetch users");
      }
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      toast.error("Failed to load users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchBrandsWithRoles = useCallback(async () => {
    try {
      setBrandsLoading(true);
      const res = await fetch("/api/brands/with-roles");
      if (!res.ok) throw new Error("Failed to fetch brands");
      const data = await res.json();
      setBrandsWithRoles(data);
    } catch (err) {
      toast.error("Failed to load brands");
      setBrandsWithRoles([]);
    } finally {
      setBrandsLoading(false);
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
      fetchUsers();
    }
  }, [status, isSuperAdmin, router, fetchUsers]);

  useEffect(() => {
    if (manageBrandsDialogOpen) {
      fetchBrandsWithRoles();
    }
  }, [manageBrandsDialogOpen, fetchBrandsWithRoles]);

  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase())
  );

  const openCreateDialog = () => {
    setFormFullName("");
    setFormUsername("");
    setFormPassword("");
    setFormIsSuperAdmin(false);
    setCreateDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setEditFullName(user.fullName);
    setEditUsername(user.username);
    setEditPassword("");
    setEditIsActive(user.isActive);
    setEditIsSuperAdmin(user.isSuperAdmin);
    setEditDialogOpen(true);
  };

  const openManageBrandsDialog = (user: User) => {
    setManageBrandsUser(user);
    setAssignBrandId("");
    setAssignRoleId("");
    setManageBrandsDialogOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullName.trim() || !formUsername.trim() || !formPassword) {
      toast.error("Full name, username, and password are required");
      return;
    }
    if (formPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setCreateSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formFullName.trim(),
          username: formUsername.trim(),
          password: formPassword,
          isSuperAdmin: formIsSuperAdmin,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create user");
      }
      toast.success("User created");
      setCreateDialogOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editFullName.trim() || !editUsername.trim()) {
      toast.error("Full name and username are required");
      return;
    }
    if (editPassword && editPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setEditSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        fullName: editFullName.trim(),
        username: editUsername.trim(),
        isActive: editIsActive,
        isSuperAdmin: editIsSuperAdmin,
      };
      if (editPassword) body.password = editPassword;

      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update user");
      }
      toast.success("User updated");
      setEditDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleAssignBrand = async () => {
    if (!manageBrandsUser || !assignBrandId || !assignRoleId) {
      toast.error("Select a brand and role");
      return;
    }
    setAssigning(true);
    try {
      const res = await fetch(`/api/users/${manageBrandsUser.id}/brands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId: assignBrandId, roleId: assignRoleId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to assign brand");
      }
      toast.success("User assigned to brand");
      setAssignBrandId("");
      setAssignRoleId("");
      fetchUsers();
      if (manageBrandsUser) {
        setManageBrandsUser((prev) => {
          if (!prev) return prev;
          const brand = brandsWithRoles.find((b) => b.id === assignBrandId);
          const role = brand?.roles.find((r) => r.id === assignRoleId);
          if (!brand || !role) return prev;
          return {
            ...prev,
            userBrands: [
              ...prev.userBrands,
              { brand: { id: brand.id, name: brand.name }, role: { id: role.id, name: role.name } },
            ],
          };
        });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveBrand = async (brandId: string) => {
    if (!manageBrandsUser) return;
    setRemovingBrandId(brandId);
    try {
      const res = await fetch(
        `/api/users/${manageBrandsUser.id}/brands?brandId=${encodeURIComponent(brandId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to remove from brand");
      toast.success("User removed from brand");
      fetchUsers();
      setManageBrandsUser((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          userBrands: prev.userBrands.filter((ub) => ub.brand.id !== brandId),
        };
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRemovingBrandId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    setDeleteTargetId(id);
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete user");
      toast.success("User deleted");
      fetchUsers();
      setDeleteTargetId(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setDeleteTargetId(null);
    } finally {
      setDeleting(false);
    }
  };

  const selectedBrand = brandsWithRoles.find((b) => b.id === assignBrandId);
  const rolesForSelectedBrand = selectedBrand?.roles ?? [];

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
        <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
        <p className="text-muted-foreground">Manage users and employees across the system</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Users</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64 h-9"
              />
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={openCreateDialog}>
                  <Plus className="size-4 mr-2" />
                  Create User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create User</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-fullName">Full Name</Label>
                    <Input
                      id="create-fullName"
                      value={formFullName}
                      onChange={(e) => setFormFullName(e.target.value)}
                      placeholder="Full name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-username">Username</Label>
                    <Input
                      id="create-username"
                      type="text"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      placeholder="Enter username"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-password">Password</Label>
                    <Input
                      id="create-password"
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      minLength={8}
                      required
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="create-superAdmin"
                      checked={formIsSuperAdmin}
                      onCheckedChange={(v) => setFormIsSuperAdmin(v === true)}
                    />
                    <Label htmlFor="create-superAdmin" className="font-normal cursor-pointer">
                      Super Admin
                    </Label>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createSubmitting}>
                      {createSubmitting && <Loader2 className="size-4 mr-2 animate-spin" />}
                      Create
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-lg">
              <UserCog className="size-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {search ? "No users match your search." : "No users yet. Create your first user."}
              </p>
              {!search && (
                <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
                  <Plus className="size-4 mr-2" />
                  Create User
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Brands</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Super Admin</TableHead>
                  <TableHead className="w-[180px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarImage src={user.avatarUrl ?? undefined} />
                          <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.fullName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.username}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.userBrands.length === 0 ? (
                          <span className="text-muted-foreground text-sm">—</span>
                        ) : (
                          user.userBrands.map((ub) => (
                            <Badge
                              key={`${ub.brand.id}-${ub.role.id}`}
                              variant="secondary"
                              className="text-xs"
                            >
                              <Building2 className="size-3 mr-1" />
                              {ub.brand.name} ({ub.role.name})
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.isSuperAdmin && (
                        <Badge variant="outline" className="gap-1">
                          <Shield className="size-3" />
                          Super Admin
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => openEditDialog(user)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => openManageBrandsDialog(user)}
                        >
                          <Building2 className="size-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive hover:text-destructive"
                              disabled={deleting && deleteTargetId === user.id}
                            >
                              {deleting && deleteTargetId === user.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &quot;{user.fullName}&quot;? This action
                                cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(user.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-fullName">Full Name</Label>
                <Input
                  id="edit-fullName"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="Full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-username">Username</Label>
                <Input
                  id="edit-username"
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-password">Password (leave blank to keep current)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  minLength={8}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-active" className="font-normal">
                  Active
                </Label>
                <Switch
                  id="edit-active"
                  checked={editIsActive}
                  onCheckedChange={setEditIsActive}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-superAdmin" className="font-normal">
                  Super Admin
                </Label>
                <Switch
                  id="edit-superAdmin"
                  checked={editIsSuperAdmin}
                  onCheckedChange={setEditIsSuperAdmin}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={editSubmitting}>
                  {editSubmitting && <Loader2 className="size-4 mr-2 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Manage Brands Dialog */}
      <Dialog open={manageBrandsDialogOpen} onOpenChange={setManageBrandsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Brands</DialogTitle>
            {manageBrandsUser && (
              <p className="text-sm text-muted-foreground">
                Assign {manageBrandsUser.fullName} to brands and roles.
              </p>
            )}
          </DialogHeader>
          {manageBrandsUser && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-2">Current Assignments</h4>
                {manageBrandsUser.userBrands.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No brand assignments yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {manageBrandsUser.userBrands.map((ub) => (
                      <div
                        key={ub.brand.id}
                        className="flex items-center justify-between rounded-md border px-3 py-2"
                      >
                        <span className="text-sm">
                          {ub.brand.name} <span className="text-muted-foreground">({ub.role.name})</span>
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          disabled={removingBrandId === ub.brand.id}
                          onClick={() => handleRemoveBrand(ub.brand.id)}
                        >
                          {removingBrandId === ub.brand.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <X className="size-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Add to Brand</h4>
                {brandsLoading ? (
                  <div className="flex items-center gap-2 py-4">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Loading brands...</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Select value={assignBrandId} onValueChange={(v) => { setAssignBrandId(v); setAssignRoleId(""); }}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {brandsWithRoles
                          .filter(
                            (b) =>
                              !manageBrandsUser.userBrands.some((ub) => ub.brand.id === b.id)
                          )
                          .map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={assignRoleId}
                      onValueChange={setAssignRoleId}
                      disabled={!assignBrandId}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {rolesForSelectedBrand.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={handleAssignBrand}
                      disabled={!assignBrandId || !assignRoleId || assigning}
                    >
                      {assigning && <Loader2 className="size-4 mr-2 animate-spin" />}
                      Assign
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
