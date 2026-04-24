"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Toaster, toast } from "sonner";
import {
  Warehouse,
  LayoutDashboard,
  Package,
  BarChart3,
  Store,
  User,
  LogOut,
  ArrowLeft,
  PlusCircle,
  MinusCircle,
  RefreshCw,
  Search,
} from "lucide-react";

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
}

interface StockMutation {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  type: "IN" | "OUT";
  reference: string;
  createdAt: string;
}

export default function StockPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [mutations, setMutations] = useState<StockMutation[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [type, setType] = useState<"IN" | "OUT">("IN");
  const [reference, setReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Auth & role check
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (session?.user?.role !== "ADMIN") router.push("/pos");
  }, [status, session, router]);

  const fetchProducts = async () => {
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts(data);
  };

  const fetchMutations = async () => {
    try {
      const res = await fetch("/api/stock/mutations");
      if (res.ok) {
        const data = await res.json();
        setMutations(data);
      }
    } catch (error) {
      console.error("Gagal memuat riwayat stok");
    }
  };

  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      fetchProducts();
      fetchMutations();
    }
  }, [session]);

  const handleSubmit = async () => {
    if (!productId) {
      toast.error("Pilih produk terlebih dahulu");
      return;
    }
    if (quantity <= 0) {
      toast.error("Jumlah harus lebih dari 0");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity, type, reference }),
      });
      if (res.ok) {
        toast.success(
          type === "IN"
            ? `Stok masuk ${quantity} unit berhasil ditambahkan`
            : `Stok keluar ${quantity} unit berhasil dikurangi`
        );
        setProductId("");
        setQuantity(1);
        setReference("");
        // Refresh data produk dan riwayat
        await fetchProducts();
        await fetchMutations();
      } else {
        const error = await res.json();
        toast.error(error.error || "Gagal update stok");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter produk untuk dropdown
  const selectedProduct = products.find((p) => p.id === productId);

  // Filter riwayat stok untuk search (berdasarkan nama produk atau referensi)
  const filteredMutations = mutations.filter(
    (m) =>
      m.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.reference?.toLowerCase().includes(searchTerm.toLowerCase())
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

      {/* NAVBAR PROFESIONAL */}
      <header className="bg-white/80 backdrop-blur-md border-b border-indigo-100 shadow-sm sticky top-0 z-10">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-1.5 rounded-lg shadow-md">
              <Warehouse className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">
                Manajemen Stok
              </h1>
              <span className="text-xs text-gray-500 hidden sm:inline">Kelola mutasi stok</span>
            </div>
          </div>

          {/* Menu Navigasi Admin */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-indigo-50/50 rounded-full px-3 py-1.5 border border-indigo-100">
              <Link
                href="/admin"
                className="p-1.5 rounded-full hover:bg-indigo-100 transition-all duration-200"
                title="Dashboard"
              >
                <LayoutDashboard className="h-4 w-4 text-indigo-600" />
              </Link>
              <Link
                href="/products"
                className="p-1.5 rounded-full hover:bg-indigo-100 transition-all duration-200"
                title="Produk"
              >
                <Package className="h-4 w-4 text-indigo-600" />
              </Link>
              <Link
                href="/stock"
                className="p-1.5 rounded-full bg-indigo-100 text-indigo-700"
                title="Stok"
              >
                <Warehouse className="h-4 w-4" />
              </Link>
              <Link
                href="/reports"
                className="p-1.5 rounded-full hover:bg-indigo-100 transition-all duration-200"
                title="Laporan"
              >
                <BarChart3 className="h-4 w-4 text-indigo-600" />
              </Link>
            </div>

            {/* Info Admin */}
            <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5">
              <User className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-sm text-gray-700">
                Admin: <span className="font-semibold text-indigo-700">{session?.user?.name}</span>
              </span>
            </div>

            {/* Tombol Kembali ke POS */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/pos")}
              className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 rounded-full"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> POS
            </Button>

            {/* Tombol Logout */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/api/auth/signout")}
              className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-full"
            >
              <LogOut className="h-4 w-4 mr-1" />{" "}
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/*  MAIN CONTENT */}
      <div className="p-4 md:p-6 lg:p-8">
        {/* Form Mutasi Stok */}
        <Card className="mb-8 border-t-4 border-t-indigo-500 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800">
              {type === "IN" ? "📥 Tambah Stok Masuk" : "📤 Kurangi Stok Keluar"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pilih Produk */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Produk</label>
                <Select onValueChange={setProductId} value={productId}>
                  <SelectTrigger className="rounded-lg border-gray-300 focus:border-indigo-300">
                    <SelectValue placeholder="Pilih produk..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} (SKU: {p.sku}) - Stok: {p.stock}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProduct && selectedProduct.stock < 10 && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ Stok menipis: {selectedProduct.stock} unit tersisa
                  </p>
                )}
              </div>

              {/* Tipe Mutasi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Mutasi</label>
                <Select onValueChange={(v) => setType(v as any)} value={type}>
                  <SelectTrigger className="rounded-lg border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">
                      <div className="flex items-center gap-2">
                        <PlusCircle className="h-4 w-4 text-green-600" /> Stok Masuk (Pembelian)
                      </div>
                    </SelectItem>
                    <SelectItem value="OUT">
                      <div className="flex items-center gap-2">
                        <MinusCircle className="h-4 w-4 text-red-600" /> Stok Keluar (Rusak/Kadaluarsa)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Jumlah */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah</label>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="rounded-lg border-gray-300 focus:border-indigo-300"
                />
              </div>

              {/* Referensi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Referensi (Supplier / Invoice / Keterangan)
                </label>
                <Input
                  placeholder="Contoh: PT Maju Jaya / INV-001"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="rounded-lg border-gray-300 focus:border-indigo-300"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !productId}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-full px-6"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Memproses...
                  </>
                ) : type === "IN" ? (
                  <>
                    <PlusCircle className="h-4 w-4 mr-2" /> Tambah Stok
                  </>
                ) : (
                  <>
                    <MinusCircle className="h-4 w-4 mr-2" /> Kurangi Stok
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Daftar Produk dengan Stok */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Package className="h-5 w-5 text-indigo-600" /> Stok Produk Terkini
          </h2>
          <div className="bg-white rounded-xl shadow-sm border border-indigo-100 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-indigo-50/50">
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Harga</TableHead>
                    <TableHead>Stok</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.slice(0, 5).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-sm">{p.sku}</TableCell>
                      <TableCell>{p.name}</TableCell>
                      <TableCell>Rp {p.price.toLocaleString()}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            p.stock <= 5
                              ? "bg-red-100 text-red-800"
                              : p.stock <= 10
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {p.stock}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {products.length > 5 && (
              <div className="p-3 text-center border-t">
                <Link href="/products" className="text-indigo-600 text-sm hover:underline">
                  Lihat semua produk →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Riwayat Mutasi Stok */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-indigo-600" /> Riwayat Mutasi Stok
          </h2>

          {/* Search riwayat */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
            <Input
              placeholder="Cari berdasarkan nama produk atau referensi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 py-5 rounded-xl border-indigo-100 bg-white"
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-indigo-100 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-indigo-50/50">
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Produk</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Referensi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMutations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                        Belum ada riwayat mutasi stok
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMutations.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {new Date(m.createdAt).toLocaleDateString("id-ID")}
                        </TableCell>
                        <TableCell>{m.productName}</TableCell>
                        <TableCell>
                          {m.type === "IN" ? (
                            <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium">
                              <PlusCircle className="h-3 w-3" /> Masuk
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-xs font-medium">
                              <MinusCircle className="h-3 w-3" /> Keluar
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{m.quantity}</TableCell>
                        <TableCell className="text-sm text-gray-500">{m.reference || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400 border-t border-gray-200 pt-4">
          &copy; {new Date().getFullYear()} POS Pro - Manajemen Stok
        </div>
      </div>
    </div>
  );
}