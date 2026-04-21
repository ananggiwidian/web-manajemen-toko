"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  CreditCard,
  LogOut,
  LayoutDashboard,
  Package,
  Warehouse,
  BarChart3,
} from "lucide-react";
import { toast, Toaster } from "sonner";

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
}

export default function POSPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { items, addItem, updateQuantity, removeItem, clearCart, total } = useCartStore();
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER" | "QRIS">("CASH");
  const [isProcessing, setIsProcessing] = useState(false);

  // Redirect jika tidak login
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Debounce search
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (search.trim().length > 0) {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(search)}`);
        const data = await res.json();
        setProducts(data);
      } else {
        setProducts([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [search]);

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast.error("Stok habis!");
      return;
    }
    addItem({
      id: product.id,
      sku: product.sku,
      name: product.name,
      price: product.price,
    });
    setSearch("");
    setProducts([]);
    toast.success(`${product.name} ditambahkan ke keranjang`);
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error("Keranjang kosong!");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.id,
            quantity: i.quantity,
            priceAtTime: i.price,
          })),
          total: total(),
          paymentMethod,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Transaksi gagal");
      }

      toast.success("Transaksi berhasil!");
      clearCart();
      setSearch("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (status === "loading") {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex h-screen flex-col">
      <Toaster position="top-right" />
      {/* Header */}
      <header className="border-b p-4 flex justify-between items-center bg-white shadow-sm">
        <h1 className="text-2xl font-bold text-blue-600">Point of Sale</h1>
        <div className="flex items-center gap-4">
          {/* Menu Admin - hanya muncul jika role ADMIN */}
          {session?.user?.role === "ADMIN" && (
            <div className="flex items-center gap-3 border-r pr-4 mr-2">
              <Link
                href="/admin"
                className="text-gray-600 hover:text-blue-600 transition"
                title="Dashboard"
              >
                <LayoutDashboard className="h-5 w-5" />
              </Link>
              <Link
                href="/products"
                className="text-gray-600 hover:text-blue-600 transition"
                title="Produk"
              >
                <Package className="h-5 w-5" />
              </Link>
              <Link
                href="/stock"
                className="text-gray-600 hover:text-blue-600 transition"
                title="Stok"
              >
                <Warehouse className="h-5 w-5" />
              </Link>
              <Link
                href="/reports"
                className="text-gray-600 hover:text-blue-600 transition"
                title="Laporan"
              >
                <BarChart3 className="h-5 w-5" />
              </Link>
            </div>
          )}
          <div className="text-sm text-gray-600">
            Kasir: <span className="font-semibold">{session?.user?.name}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push("/api/auth/signout")}>
            <LogOut className="h-4 w-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Panel Kiri: Pencarian & Produk */}
        <div className="w-1/2 border-r p-4 overflow-y-auto bg-gray-50">
          <div className="relative mb-4">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Cari berdasarkan SKU atau nama produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {products.map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleAddToCart(product)}
              >
                <CardContent className="p-3">
                  <div className="font-mono text-xs text-gray-500">{product.sku}</div>
                  <div className="font-semibold text-sm mt-1">{product.name}</div>
                  <div className="text-green-600 font-bold mt-1">
                    Rp {product.price.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Stok: {product.stock}</div>
                </CardContent>
              </Card>
            ))}
            {search && products.length === 0 && (
              <div className="col-span-2 text-center text-gray-500 py-8">
                Produk tidak ditemukan
              </div>
            )}
          </div>
        </div>

        {/* Panel Kanan: Keranjang */}
        <div className="w-1/2 flex flex-col bg-white">
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="h-5 w-5" />
              <h2 className="font-bold text-lg">Keranjang Belanja</h2>
            </div>
            {items.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                Belum ada item. Silakan cari produk di sebelah kiri.
              </div>
            )}
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b py-3">
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-gray-500">Rp {item.price.toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t p-4 space-y-3 bg-gray-50">
            <div className="flex justify-between text-xl font-bold">
              <span>Total:</span>
              <span className="text-blue-600">Rp {total().toLocaleString()}</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant={paymentMethod === "CASH" ? "default" : "outline"}
                onClick={() => setPaymentMethod("CASH")}
                className="flex-1"
              >
                Tunai
              </Button>
              <Button
                variant={paymentMethod === "TRANSFER" ? "default" : "outline"}
                onClick={() => setPaymentMethod("TRANSFER")}
                className="flex-1"
              >
                Transfer
              </Button>
              <Button
                variant={paymentMethod === "QRIS" ? "default" : "outline"}
                onClick={() => setPaymentMethod("QRIS")}
                className="flex-1"
              >
                QRIS
              </Button>
            </div>
            <Button
              onClick={handleCheckout}
              disabled={isProcessing || items.length === 0}
              className="w-full"
              size="lg"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {isProcessing ? "Memproses..." : "Bayar & Simpan"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}