"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Store,
  User,
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
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      }
    >
      <POSPageContent />
    </Suspense>
  );
}

function POSPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, addItem, updateQuantity, removeItem, clearCart, total } = useCartStore();
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER" | "QRIS">("CASH");
  const [isProcessing, setIsProcessing] = useState(false);

  // Redirect jika tidak login
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Fetch semua produk saat mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoadingProducts(true);
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error("Gagal memuat produk");
        const data = await res.json();
        setAllProducts(data);
        setProducts(data); // tampilkan semua produk di awal
      } catch (error) {
        console.error(error);
        toast.error("Gagal memuat daftar produk");
        setAllProducts([]);
        setProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  // Filter produk berdasarkan input search (client-side)
  useEffect(() => {
    if (search.trim() === "") {
      setProducts(allProducts);
    } else {
      const filtered = allProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.sku.toLowerCase().includes(search.toLowerCase())
      );
      setProducts(filtered);
    }
  }, [search, allProducts]);

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast.error(`Stok ${product.name} habis!`);
      return;
    }
    addItem({
      id: product.id,
      sku: product.sku,
      name: product.name,
      price: product.price,
    });
    setSearch("");
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

  const handleStripeCheckout = async () => {
    if (items.length === 0) {
      toast.error("Keranjang kosong!");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.id,
            quantity: i.quantity,
            priceAtTime: i.price,
          })),
          total: total(),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Gagal membuat sesi Stripe");
      }

      const data = await res.json();
      window.location.href = data.url;
    } catch (error: any) {
      toast.error(error.message);
      setIsProcessing(false);
    }
  };

  // Handle Stripe return (session_id) or cancel
  const pollPaymentStatus = useCallback(async (transactionId: string) => {
    const terminalStates = ["PAID", "FAILED", "EXPIRED", "REQUIRES_REVIEW"];
    const MAX_POLL_ATTEMPTS = 40; // 40 * 3s = 120s max
    let currentStatus = "PENDING";
    let attempts = 0;

    while (!terminalStates.includes(currentStatus) && attempts < MAX_POLL_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, 3000));
      attempts++;
      try {
        const res = await fetch(`/api/transactions/${transactionId}/payment-status`);
        const data = await res.json();
        currentStatus = data.paymentStatus;
      } catch {
        // retry on network error
        continue;
      }
    }

    toast.dismiss("stripe-polling");

    if (attempts >= MAX_POLL_ATTEMPTS && !terminalStates.includes(currentStatus)) {
      toast.warning("Pengecekan pembayaran timeout. Silakan cek laporan untuk status terbaru.");
      router.replace("/pos");
      return;
    }

    switch (currentStatus) {
      case "PAID":
        toast.success("Pembayaran Stripe berhasil!");
        clearCart();
        break;
      case "FAILED":
        toast.error("Pembayaran Stripe gagal");
        break;
      case "EXPIRED":
        toast.warning("Pembayaran Stripe kedaluwarsa");
        break;
      case "REQUIRES_REVIEW":
        toast.info("Pembayaran diterima, stok sedang ditinjau admin");
        break;
    }

    router.replace("/pos");
  }, [clearCart, router]);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const cancelled = searchParams.get("cancel");

    if (cancelled) {
      toast.error("Pembayaran Stripe dibatalkan");
      router.replace("/pos");
      return;
    }

    if (!sessionId) return;

    const handleReturn = async () => {
      try {
        const lookupRes = await fetch(`/api/stripe/checkout/status?session_id=${sessionId}`);
        if (!lookupRes.ok) {
          toast.error("Gagal menemukan transaksi");
          router.replace("/pos");
          return;
        }
        const { transactionId, paymentStatus } = await lookupRes.json();

        if (paymentStatus === "PAID") {
          toast.success("Pembayaran Stripe berhasil!");
          clearCart();
          router.replace("/pos");
          return;
        }

        toast.loading("Memproses pembayaran...", { id: "stripe-polling" });
        pollPaymentStatus(transactionId);
      } catch {
        toast.error("Gagal memeriksa status pembayaran");
        router.replace("/pos");
      }
    };

    handleReturn();
  }, [searchParams, clearCart, router, pollPaymentStatus]);

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
    <div className="flex h-screen flex-col bg-gradient-to-br from-slate-50 to-indigo-50/30">
      <Toaster position="top-right" richColors />

      {/* ========== NAVBAR ========== */}
      <header className="bg-white/80 backdrop-blur-md border-b border-indigo-100 shadow-sm sticky top-0 z-10">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-1.5 rounded-lg shadow-md">
              <Store className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">
                POS Pro
              </h1>
              <span className="text-xs text-gray-500 hidden sm:inline">Point of Sale System</span>
            </div>
          </div>

          {/* Menu & User Area */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Menu Admin - hanya jika role ADMIN */}
            {session?.user?.role === "ADMIN" && (
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
                  className="p-1.5 rounded-full hover:bg-indigo-100 transition-all duration-200"
                  title="Stok"
                >
                  <Warehouse className="h-4 w-4 text-indigo-600" />
                </Link>
                <Link
                  href="/reports"
                  className="p-1.5 rounded-full hover:bg-indigo-100 transition-all duration-200"
                  title="Laporan"
                >
                  <BarChart3 className="h-4 w-4 text-indigo-600" />
                </Link>
              </div>
            )}

            {/* Info Kasir */}
            <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5">
              <User className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-sm text-gray-700">
                Kasir: <span className="font-semibold text-indigo-700">{session?.user?.name}</span>
              </span>
            </div>

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

      {/*  MAIN CONTENT  */}
      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {/* Panel Kiri: Pencarian & Produk */}
        <div className="w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r border-gray-200 bg-white/50 backdrop-blur-sm p-3 md:p-4 overflow-y-auto">
          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
            <Input
              placeholder="Cari berdasarkan SKU atau nama produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 py-5 rounded-xl border-indigo-100 focus:border-indigo-300 focus:ring focus:ring-indigo-200/50 bg-white"
              autoFocus
            />
          </div>

          {/* Grid Produk */}
          {isLoadingProducts ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {products.map((product) => (
                  <Card
                    key={product.id}
                    className="cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-200 border-l-4 border-l-indigo-400 rounded-xl overflow-hidden group"
                    onClick={() => handleAddToCart(product)}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-mono text-xs text-gray-400 bg-gray-100 inline-block px-2 py-0.5 rounded">
                            {product.sku}
                          </div>
                          <div className="font-semibold text-gray-800 mt-2 group-hover:text-indigo-600 transition">
                            {product.name}
                          </div>
                        </div>
                        <div
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            product.stock > 0
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          Stok: {product.stock}
                        </div>
                      </div>
                      <div className="mt-2 flex justify-between items-center">
                        <span className="text-indigo-600 font-bold text-lg">
                          Rp {product.price.toLocaleString()}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-full opacity-0 group-hover:opacity-100 transition"
                          disabled={product.stock <= 0}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {products.length === 0 && !isLoadingProducts && (
                <div className="text-center text-gray-400 py-12 bg-white/60 rounded-xl mt-4">
                  <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>
                    {search ? "Produk tidak ditemukan" : "Belum ada produk tersedia"}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Panel Kanan: Keranjang Belanja */}
        <div className="w-full lg:w-1/2 flex flex-col bg-white shadow-lg lg:shadow-none">
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center gap-2 mb-4 sticky top-0 bg-white py-2">
              <div className="bg-indigo-100 p-1.5 rounded-lg">
                <ShoppingCart className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="font-bold text-lg text-gray-800">Keranjang Belanja</h2>
              {items.length > 0 && (
                <span className="ml-auto text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                  {items.length} item
                </span>
              )}
            </div>

            {items.length === 0 && (
              <div className="text-center text-gray-400 py-12">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Keranjang kosong</p>
                <p className="text-xs mt-1">Pilih produk di sebelah kiri</p>
              </div>
            )}

            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b border-gray-100 py-3 hover:bg-gray-50/50 px-2 rounded-lg transition"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{item.name}</div>
                    <div className="text-sm text-indigo-600 font-semibold">
                      Rp {item.price.toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-full border-indigo-200"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-full border-indigo-200"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Keranjang (Total & Checkout) */}
          <div className="border-t border-gray-200 p-4 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex justify-between text-xl font-bold mb-4">
              <span className="text-gray-600">Total:</span>
              <span className="text-indigo-700 text-2xl">Rp {total().toLocaleString()}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {(["CASH", "TRANSFER", "QRIS"] as const).map((method) => (
                <Button
                  key={method}
                  variant={paymentMethod === method ? "default" : "outline"}
                  onClick={() => setPaymentMethod(method)}
                  className={`rounded-full transition-all duration-200 ${
                    paymentMethod === method
                      ? method === "CASH"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : method === "TRANSFER"
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-purple-600 hover:bg-purple-700"
                      : "border-gray-300 text-gray-600 hover:border-indigo-300"
                  }`}
                >
                  {method === "CASH" && "Tunai"}
                  {method === "TRANSFER" && "Transfer"}
                  {method === "QRIS" && "QRIS"}
                </Button>
              ))}
            </div>

            <Button
              onClick={paymentMethod === "TRANSFER" ? handleStripeCheckout : handleCheckout}
              disabled={isProcessing || items.length === 0}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-6 transition-all duration-300 shadow-md hover:shadow-lg"
              size="lg"
            >
              <CreditCard className="mr-2 h-5 w-5" />
              {isProcessing ? "Memproses..." : "Bayar & Simpan Transaksi"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}