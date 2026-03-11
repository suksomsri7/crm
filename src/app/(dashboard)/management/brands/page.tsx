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
import { Plus, Pencil, Trash2, Building2, Users, Target, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { useBrand } from "@/components/providers/brand-provider";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Brand = {
  id: string;
  name: string;
  domain: string | null;
  isActive: boolean;
  _count: { userBrands: number; customers: number; leads: number };
};

export default function BrandsPage() {
  const { data: session, status } = useSession();
  const { isSuperAdmin } = useBrand();
  const router = useRouter();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [formName, setFormName] = useState("");
  const [formDomain, setFormDomain] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchBrands = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/crm/api/brands");
      if (!res.ok) {
        if (res.status === 403) {
          router.push("/dashboard");
          return;
        }
        throw new Error("Failed to fetch brands");
      }
      const data = await res.json();
      setBrands(data);
    } catch (err) {
      toast.error("Failed to load brands");
      setBrands([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

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
      fetchBrands();
    }
  }, [status, isSuperAdmin, router, fetchBrands]);

  const filteredBrands = brands.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  const openCreateDialog = () => {
    setEditingBrand(null);
    setFormName("");
    setFormDomain("");
    setDialogOpen(true);
  };

  const openEditDialog = (brand: Brand) => {
    setEditingBrand(brand);
    setFormName(brand.name);
    setFormDomain(brand.domain ?? "");
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Name is required");
      return;
    }
    setSubmitting(true);
    try {
      if (editingBrand) {
        const res = await fetch(`/crm/api/brands/${editingBrand.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            domain: formDomain.trim() || null,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message || "Failed to update brand");
        }
        toast.success("Brand updated");
      } else {
        const res = await fetch("/crm/api/brands", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            domain: formDomain.trim() || null,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message || "Failed to create brand");
        }
        toast.success("Brand created");
      }
      setDialogOpen(false);
      fetchBrands();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    setDeleteTargetId(id);
    try {
      const res = await fetch(`/crm/api/brands/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete brand");
      toast.success("Brand deleted");
      fetchBrands();
      setDeleteTargetId(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete brand");
      setDeleteTargetId(null);
    } finally {
      setDeleting(false);
    }
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
        <h2 className="text-2xl font-bold tracking-tight">Brand Management</h2>
        <p className="text-muted-foreground">Create and manage brands across the system</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Brands</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search brands..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64 h-9"
              />
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={openCreateDialog}>
                  <Plus className="size-4 mr-2" />
                  Create Brand
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingBrand ? "Edit Brand" : "Create Brand"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Brand name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="domain">Domain (optional)</Label>
                    <Input
                      id="domain"
                      value={formDomain}
                      onChange={(e) => setFormDomain(e.target.value)}
                      placeholder="example.com"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
                      {editingBrand ? "Save" : "Create"}
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
          ) : filteredBrands.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-lg">
              <Building2 className="size-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {search ? "No brands match your search." : "No brands yet. Create your first brand."}
              </p>
              {!search && (
                <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
                  <Plus className="size-4 mr-2" />
                  Create Brand
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">
                    <Users className="size-4 inline mr-1" />
                    Users
                  </TableHead>
                  <TableHead className="text-center">
                    <Target className="size-4 inline mr-1" />
                    Customers
                  </TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBrands.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell className="font-medium">{brand.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {brand.domain || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={brand.isActive ? "default" : "secondary"}>
                        {brand.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {brand._count.userBrands}
                    </TableCell>
                    <TableCell className="text-center">
                      {brand._count.customers}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => openEditDialog(brand)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive hover:text-destructive"
                              disabled={deleting && deleteTargetId === brand.id}
                            >
                              {deleting && deleteTargetId === brand.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Brand</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &quot;{brand.name}&quot;? This action cannot be undone.
                                All data for this brand will be permanently removed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(brand.id)}
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
    </div>
  );
}
