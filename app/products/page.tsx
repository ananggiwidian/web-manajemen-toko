"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Toaster, toast } from "sonner";
import {
  Package,
  LayoutDashboard,
  Warehouse,
  BarChart3,
  Store,
  User,
  LogOut,
  Plus,
  Trash2,
  Edit,
  ArrowLeft,
  Search,
} from "lucide-react";

// Schema dengan transformasi tipe yang eksplisit
const productSchema = z.object({
  sku: z.string().min(1, "SKU wajib diisi"),
  name: z.string().min(1, "Nama wajib diisi"),
  price: z.coerce.number().positive("Harga harus positif"),
  stock: z.coerce.number().int().min(0, "Stok tidak boleh negatif"),
});

type ProductForm = z.infer<typeof productSchema>;

export default function ProductsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: { sku: "", name: "", price: 0, stock: 0 },
  });

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    setValue: setEditValue,
    formState: { errors: editErrors, isSubmitting: isEditSubmitting },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: { sku: "", name: "", price: 0, stock: 0 },
  });

  // Auth & role check
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (session?.user?.role !== "ADMIN") router.push("/pos");
  }, [status, session, router]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      toast.error("Gagal memuat produk");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const onSubmit = async (data: ProductForm) => {
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        toast.success("Produk berhasil ditambahkan");
        setOpen(false);
        reset();
        fetchProducts();
      } else {
        const error = await res.json();
        toast.error(error.error || "Gagal menambahkan produk");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus produk ini?")) {
      const res = await fetch(`/api/products?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchProducts();
        toast.success("Produk berhasil dihapus");
      } else {
        toast.error("Gagal menghapus produk");
      }
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setEditValue("sku", product.sku);
    setEditValue("name", product.name);
    setEditValue("price", product.price);
    setEditValue("stock", product.stock);
    setEditOpen(true);
  };

  const handleUpdate = async (data: ProductForm) => {
    if (!editingProduct) return;
    try {
      const res = await fetch(`/api/products?id=${editingProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        toast.success("Produk berhasil diperbarui");
        setEditOpen(false);
        resetEdit();
        setEditingProduct(null);
        fetchProducts();
      } else {
        const error = await res.json();
        toast.error(error.error || "Gagal memperbarui produk");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan");
    }
  };

  // Filter produk berdasarkan search
  const filteredProducts = products.filter(
    (p) =>
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30">
      <Toaster position="top-right" richColors />

      {/* NAVBAR (sama seperti semula) */}
      <header className="bg-white/80 backdrop-blur-md border-b border-indigo-100 shadow-sm sticky top-0 z-10">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-1.5 rounded-lg shadow-md">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">
                Manajemen Produk
              </h1>
              <span className="text-xs text-gray-500 hidden sm:inline">Kelola data produk</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-indigo-50/50 rounded-full px-3 py-1.5 border border-indigo-100">
              <Link href="/admin" className="p-1.5 rounded-full hover:bg-indigo-100 transition-all duration-200" title="Dashboard">
                <LayoutDashboard className="h-4 w-4 text-indigo-600" />
              </Link>
              <Link href="/products" className="p-1.5 rounded-full bg-indigo-100 text-indigo-700" title="Produk">
                <Package className="h-4 w-4" />
              </Link>
              <Link href="/stock" className="p-1.5 rounded-full hover:bg-indigo-100 transition-all duration-200" title="Stok">
                <Warehouse className="h-4 w-4 text-indigo-600" />
              </Link>
              <Link href="/reports" className="p-1.5 rounded-full hover:bg-indigo-100 transition-all duration-200" title="Laporan">
                <BarChart3 className="h-4 w-4 text-indigo-600" />
              </Link>
            </div>

            <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5">
              <User className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-sm text-gray-700">
                Admin: <span className="font-semibold text-indigo-700">{session?.user?.name}</span>
              </span>
            </div>

            <Button variant="outline" size="sm" onClick={() => router.push("/pos")} className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 rounded-full">
              <ArrowLeft className="h-4 w-4 mr-1" /> POS
            </Button>

            <Button variant="outline" size="sm" onClick={() => router.push("/api/auth/signout")} className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-full">
              <LogOut className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="p-4 md:p-6 lg:p-8">
        {/* Header dengan Tombol Tambah Produk */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Daftar Produk</h2>
            <p className="text-gray-500 mt-1">Kelola, tambah, edit, atau hapus produk toko Anda.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-full shadow-md">
                <Plus className="h-4 w-4 mr-2" /> Tambah Produk
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-gray-800">✨ Tambah Produk Baru</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                {/* form fields sama */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <Input placeholder="Contoh: BRG001" {...register("sku")} className="rounded-lg border-gray-300 focus:border-indigo-300 focus:ring focus:ring-indigo-200/50" />
                  {errors.sku && <p className="text-red-500 text-sm mt-1">{errors.sku.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Produk</label>
                  <Input placeholder="Nama produk" {...register("name")} className="rounded-lg border-gray-300 focus:border-indigo-300 focus:ring focus:ring-indigo-200/50" />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Harga (Rp)</label>
                  <Input type="number" placeholder="Harga" {...register("price")} className="rounded-lg border-gray-300 focus:border-indigo-300 focus:ring focus:ring-indigo-200/50" />
                  {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stok Awal</label>
                  <Input type="number" placeholder="Stok" {...register("stock")} className="rounded-lg border-gray-300 focus:border-indigo-300 focus:ring focus:ring-indigo-200/50" />
                  {errors.stock && <p className="text-red-500 text-sm mt-1">{errors.stock.message}</p>}
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1 rounded-full">Batal</Button>
                  <Button type="submit" disabled={isSubmitting} className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-full">
                    {isSubmitting ? "Menyimpan..." : "Simpan Produk"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
          <Input
            placeholder="Cari berdasarkan SKU atau nama produk..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 py-5 rounded-xl border-indigo-100 focus:border-indigo-300 focus:ring focus:ring-indigo-200/50 bg-white"
          />
        </div>

        {/* Tabel Produk */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-indigo-100 overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader className="bg-indigo-50/50">
                  <TableRow>
                    <TableHead className="font-semibold text-gray-700">SKU</TableHead>
                    <TableHead className="font-semibold text-gray-700">Nama Produk</TableHead>
                    <TableHead className="font-semibold text-gray-700">Harga</TableHead>
                    <TableHead className="font-semibold text-gray-700">Stok</TableHead>
                    <TableHead className="font-semibold text-gray-700">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-gray-400">
                        <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        Tidak ada produk ditemukan
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((p) => (
                      <TableRow key={p.id} className="hover:bg-indigo-50/30 transition">
                        <TableCell className="font-mono text-sm">{p.sku}</TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-indigo-600 font-semibold">Rp {p.price.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${p.stock <= 5 ? "bg-red-100 text-red-800" : p.stock <= 10 ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>
                            {p.stock}
                          </span>
                        </TableCell>
                        <TableCell className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(p)} className="rounded-full border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                            <Edit className="h-3 w-3 mr-1" /> Edit
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(p.id)} className="rounded-full bg-red-500 hover:bg-red-600 text-white">
                            <Trash2 className="h-3 w-3 mr-1" /> Hapus
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden p-4 space-y-3">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  Tidak ada produk
                </div>
              ) : (
                filteredProducts.map((p) => (
                  <div key={p.id} className="bg-white border border-indigo-100 rounded-xl p-4 shadow-sm hover:shadow-md transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-mono text-xs text-gray-400 bg-gray-100 inline-block px-2 py-0.5 rounded">{p.sku}</div>
                        <h3 className="font-semibold text-gray-800 mt-2">{p.name}</h3>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(p)} className="rounded-full border-indigo-200 text-indigo-600 h-8 w-8 p-0">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(p.id)} className="rounded-full bg-red-500 hover:bg-red-600 h-8 w-8 p-0">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-between items-center">
                      <span className="text-indigo-600 font-bold text-lg">Rp {p.price.toLocaleString()}</span>
                      <span className={`text-sm font-medium px-2 py-1 rounded-full ${p.stock <= 5 ? "bg-red-100 text-red-700" : p.stock <= 10 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                        Stok: {p.stock}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Dialog Edit Produk */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800">✏️ Edit Produk</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit(handleUpdate)} className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                <Input placeholder="SKU" {...registerEdit("sku")} className="rounded-lg border-gray-300 focus:border-indigo-300" />
                {editErrors.sku && <p className="text-red-500 text-sm mt-1">{editErrors.sku.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Produk</label>
                <Input placeholder="Nama produk" {...registerEdit("name")} className="rounded-lg border-gray-300 focus:border-indigo-300" />
                {editErrors.name && <p className="text-red-500 text-sm mt-1">{editErrors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Harga (Rp)</label>
                <Input type="number" placeholder="Harga" {...registerEdit("price")} className="rounded-lg border-gray-300 focus:border-indigo-300" />
                {editErrors.price && <p className="text-red-500 text-sm mt-1">{editErrors.price.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stok</label>
                <Input type="number" placeholder="Stok" {...registerEdit("stock")} className="rounded-lg border-gray-300 focus:border-indigo-300" />
                {editErrors.stock && <p className="text-red-500 text-sm mt-1">{editErrors.stock.message}</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)} className="flex-1 rounded-full">Batal</Button>
                <Button type="submit" disabled={isEditSubmitting} className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-full">
                  {isEditSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-400 border-t border-gray-200 pt-4">
          &copy; {new Date().getFullYear()} POS Pro - Manajemen Produk
        </div>
      </div>
    </div>
  );
}