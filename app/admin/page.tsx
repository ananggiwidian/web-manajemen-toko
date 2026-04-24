"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  BarChart3,
  Store,
  User,
  LogOut,
  TrendingUp,
  ShoppingBag,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";

interface DashboardData {
  summary: { totalSales: number; totalTransactions: number; lowStock: number };
  dailySales: { date: string; total: number }[];
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Auth & role check
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (session?.user?.role !== "ADMIN") router.push("/pos");
  }, [status, session, router]);

  // Fetch dashboard data
  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      setIsLoading(true);
      fetch("/api/admin/dashboard")
        .then((res) => res.json())
        .then((dashboardData) => {
          setData(dashboardData);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setIsLoading(false);
        });
    }
  }, [session]);

  if (status === "loading" || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30">
      {/* ========== NAVBAR PROFESIONAL (SAMA SEPERTI POS) ========== */}
      <header className="bg-white/80 backdrop-blur-md border-b border-indigo-100 shadow-sm sticky top-0 z-10">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-1.5 rounded-lg shadow-md">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">
                Admin Panel
              </h1>
              <span className="text-xs text-gray-500 hidden sm:inline">Dashboard & Monitoring</span>
            </div>
          </div>

          {/* Menu Navigasi Admin */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-indigo-50/50 rounded-full px-3 py-1.5 border border-indigo-100">
              <Link
                href="/admin"
                className="p-1.5 rounded-full bg-indigo-100 text-indigo-700"
                title="Dashboard"
              >
                <LayoutDashboard className="h-4 w-4" />
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

      {/* ========== MAIN CONTENT ========== */}
      <div className="p-4 md:p-6 lg:p-8">
        {/* Welcome Section */}
        <div className="mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
            Selamat datang, <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{session?.user?.name}</span>
          </h2>
          <p className="text-gray-500 mt-1">Berikut ringkasan performa toko Anda hari ini.</p>
        </div>

        {/* Cards Ringkasan - Responsif Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          {/* Card Total Omset */}
          <Card className="border-l-4 border-l-emerald-500 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Omset</CardTitle>
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold text-gray-800">
                Rp {data.summary.totalSales.toLocaleString()}
              </div>
              <p className="text-xs text-gray-400 mt-1">Total penjualan keseluruhan</p>
            </CardContent>
          </Card>

          {/* Card Jumlah Transaksi */}
          <Card className="border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Transaksi</CardTitle>
              <ShoppingBag className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold text-gray-800">
                {data.summary.totalTransactions}
              </div>
              <p className="text-xs text-gray-400 mt-1">Total transaksi selesai</p>
            </CardContent>
          </Card>

          {/* Card Stok Menipis */}
          <Card className="border-l-4 border-l-amber-500 shadow-md hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Stok Menipis</CardTitle>
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold text-gray-800">
                {data.summary.lowStock}
              </div>
              <p className="text-xs text-gray-400 mt-1">Produk dengan stok ≤ 5</p>
            </CardContent>
          </Card>
        </div>

        {/* Grafik Penjualan */}
        <Card className="shadow-md border-t-4 border-t-indigo-500">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl font-semibold text-gray-800">
              📊 Penjualan Harian (7 hari terakhir)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[280px] md:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.dailySales} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickFormatter={(value) => `Rp${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: any) => `Rp ${value?.toLocaleString() ?? '0'}`}
                    labelFormatter={(label: any) => `Tanggal: ${label}`}
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Bar
                    dataKey="total"
                    fill="url(#barGradient)"
                    radius={[6, 6, 0, 0]}
                    barSize={40}
                  />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" /> 
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Footer Dashboard */}
        <div className="mt-6 text-center text-xs text-gray-400 border-t border-gray-200 pt-4">
          &copy; {new Date().getFullYear()} POS Pro - Admin Dashboard
        </div>
      </div>
    </div>
  );
}