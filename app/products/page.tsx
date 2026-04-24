"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Toaster, toast } from "sonner";

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
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: { sku: "", name: "", price: 0, stock: 0 },
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (session?.user?.role !== "ADMIN") router.push("/pos");
  }, [status, session, router]);

  const fetchProducts = async () => {
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts(data);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const onSubmit = async (data: ProductForm) => {
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
  };

  const handleDelete = async (id: string) => {
    if (confirm("Hapus produk?")) {
      await fetch(`/api/products?id=${id}`, { method: "DELETE" });
      fetchProducts();
      toast.success("Produk dihapus");
    }
  };

  return (
    <div className="p-6">
      <Toaster />
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-bold">Manajemen Produk</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Tambah Produk</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Produk Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div>
                <Input placeholder="SKU (contoh: BRG001)" {...register("sku")} />
                {errors.sku && <p className="text-red-500 text-sm">{errors.sku.message}</p>}
              </div>
              <div>
                <Input placeholder="Nama Produk" {...register("name")} />
                {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
              </div>
              <div>
                <Input type="number" placeholder="Harga" {...register("price")} />
                {errors.price && <p className="text-red-500 text-sm">{errors.price.message}</p>}
              </div>
              <div>
                <Input type="number" placeholder="Stok Awal" {...register("stock")} />
                {errors.stock && <p className="text-red-500 text-sm">{errors.stock.message}</p>}
              </div>
              <Button type="submit">Simpan</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Nama</TableHead>
            <TableHead>Harga</TableHead>
            <TableHead>Stok</TableHead>
            <TableHead>Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.sku}</TableCell>
              <TableCell>{p.name}</TableCell>
              <TableCell>Rp {p.price.toLocaleString()}</TableCell>
              <TableCell>{p.stock}</TableCell>
              <TableCell>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(p.id)}>
                  Hapus
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}