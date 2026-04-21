"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface DashboardData {
  summary: { totalSales: number; totalTransactions: number; lowStock: number };
  dailySales: { date: string; total: number }[];
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (session?.user?.role !== "ADMIN") router.push("/pos");
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      fetch("/api/admin/dashboard")
        .then(res => res.json())
        .then(setData);
    }
  }, [session]);

  if (status === "loading" || !data) return <div className="p-6">Loading dashboard...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard Admin</h1>
        <Button variant="outline" onClick={() => router.push("/pos")}>Kembali ke POS</Button>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><CardHeader><CardTitle>Total Omset</CardTitle></CardHeader><CardContent>Rp {data.summary.totalSales.toLocaleString()}</CardContent></Card>
        <Card><CardHeader><CardTitle>Jumlah Transaksi</CardTitle></CardHeader><CardContent>{data.summary.totalTransactions}</CardContent></Card>
        <Card><CardHeader><CardTitle>Stok Menipis</CardTitle></CardHeader><CardContent>{data.summary.lowStock} produk</CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle>Penjualan Harian (7 hari terakhir)</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><BarChart data={data.dailySales}><XAxis dataKey="date" /><YAxis /><Tooltip /><Bar dataKey="total" fill="#3b82f6" /></BarChart></ResponsiveContainer></CardContent></Card>
    </div>
  );
}