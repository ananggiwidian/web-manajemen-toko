"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Toaster, toast } from "sonner";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BarChart3,
  LayoutDashboard,
  Package,
  Warehouse,
  Store,
  User,
  LogOut,
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  ShoppingBag,
  CreditCard,
} from "lucide-react";

interface Transaction {
  id: string;
  invoiceNo: string;
  createdAt: string;
  total: number;
  paymentMethod: string;
}

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Auth & role check
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (session?.user?.role !== "ADMIN") router.push("/pos");
  }, [status, session, router]);

  // Fetch data laporan
  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      setIsLoading(true);
      fetch("/api/reports/sales")
        .then((res) => res.json())
        .then((data) => {
          setTransactions(data);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error(err);
          toast.error("Gagal memuat data laporan");
          setIsLoading(false);
        });
    }
  }, [session]);

  // Hitung ringkasan
  const totalOmset = transactions.reduce((sum, t) => sum + t.total, 0);
  const totalTransaksi = transactions.length;
  const metodeCount = transactions.reduce((acc, t) => {
    acc[t.paymentMethod] = (acc[t.paymentMethod] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const exportExcel = async () => {
    if (transactions.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Laporan Penjualan");
      worksheet.columns = [
        { header: "Invoice", key: "invoiceNo", width: 20 },
        { header: "Tanggal", key: "createdAt", width: 15 },
        { header: "Total", key: "total", width: 15 },
        { header: "Metode", key: "paymentMethod", width: 12 },
      ];
      transactions.forEach((t) =>
        worksheet.addRow({
          invoiceNo: t.invoiceNo,
          createdAt: new Date(t.createdAt).toLocaleDateString("id-ID"),
          total: `Rp ${t.total.toLocaleString()}`,
          paymentMethod: t.paymentMethod,
        })
      );
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `laporan_penjualan_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success("File Excel berhasil diunduh");
    } catch (error) {
      toast.error("Gagal mengekspor Excel");
    }
  };

  const exportPDF = () => {
    if (transactions.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Laporan Penjualan", 14, 22);
      doc.setFontSize(11);
      doc.text(`Tanggal cetak: ${new Date().toLocaleDateString("id-ID")}`, 14, 32);
      autoTable(doc, {
        head: [["Invoice", "Tanggal", "Total", "Metode"]],
        body: transactions.map((t) => [
          t.invoiceNo,
          new Date(t.createdAt).toLocaleDateString("id-ID"),
          `Rp ${t.total.toLocaleString()}`,
          t.paymentMethod,
        ]),
        startY: 40,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [99, 102, 241] }, // warna indigo
      });
      doc.save(`laporan_penjualan_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("File PDF berhasil diunduh");
    } catch (error) {
      toast.error("Gagal mengekspor PDF");
    }
  };

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

      {/* ========== NAVBAR PROFESIONAL ========== */}
      <header className="bg-white/80 backdrop-blur-md border-b border-indigo-100 shadow-sm sticky top-0 z-10">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-1.5 rounded-lg shadow-md">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">
                Laporan Penjualan
              </h1>
              <span className="text-xs text-gray-500 hidden sm:inline">
                Analisis & ekspor data
              </span>
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
                className="p-1.5 rounded-full hover:bg-indigo-100 transition-all duration-200"
                title="Stok"
              >
                <Warehouse className="h-4 w-4 text-indigo-600" />
              </Link>
              <Link
                href="/reports"
                className="p-1.5 rounded-full bg-indigo-100 text-indigo-700"
                title="Laporan"
              >
                <BarChart3 className="h-4 w-4" />
              </Link>
            </div>

            {/* Info Admin */}
            <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5">
              <User className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-sm text-gray-700">
                Admin:{" "}
                <span className="font-semibold text-indigo-700">
                  {session?.user?.name}
                </span>
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
        {/* Ringkasan Statistik */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
          <Card className="border-l-4 border-l-emerald-500 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Omset
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold text-gray-800">
                Rp {totalOmset.toLocaleString()}
              </div>
              <p className="text-xs text-gray-400 mt-1">Seluruh penjualan</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Jumlah Transaksi
              </CardTitle>
              <ShoppingBag className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold text-gray-800">
                {totalTransaksi}
              </div>
              <p className="text-xs text-gray-400 mt-1">Total invoice</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Metode Pembayaran
              </CardTitle>
              <CreditCard className="h-5 w-5 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(metodeCount).map(([method, count]) => (
                  <span
                    key={method}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                  >
                    {method}: {count}
                  </span>
                ))}
                {totalTransaksi === 0 && (
                  <span className="text-sm text-gray-400">Belum ada data</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tombol Ekspor & Tabel */}
        <div className="bg-white rounded-xl shadow-sm border border-indigo-100 overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 border-b border-indigo-100 bg-indigo-50/30">
            <h2 className="font-semibold text-gray-800">Daftar Transaksi</h2>
            <div className="flex gap-2">
              <Button
                onClick={exportExcel}
                disabled={transactions.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white rounded-full"
                size="sm"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
              </Button>
              <Button
                onClick={exportPDF}
                disabled={transactions.length === 0}
                className="bg-red-600 hover:bg-red-700 text-white rounded-full"
                size="sm"
              >
                <FileText className="h-4 w-4 mr-1" /> PDF
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>Belum ada data transaksi</p>
            </div>
          ) : (
            <>
              {/* Tampilan Desktop (Table) */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-indigo-50/50">
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Metode</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t) => (
                      <TableRow key={t.id} className="hover:bg-indigo-50/30 transition">
                        <TableCell className="font-mono text-sm">{t.invoiceNo}</TableCell>
                        <TableCell>
                          {new Date(t.createdAt).toLocaleDateString("id-ID")}
                        </TableCell>
                        <TableCell className="text-indigo-600 font-semibold">
                          Rp {t.total.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {t.paymentMethod}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Tampilan Mobile (Card Grid) */}
              <div className="md:hidden p-4 space-y-3">
                {transactions.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white border border-indigo-100 rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-mono text-xs text-gray-400">{t.invoiceNo}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {new Date(t.createdAt).toLocaleDateString("id-ID")}
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100">
                        {t.paymentMethod}
                      </span>
                    </div>
                    <div className="mt-2 text-indigo-600 font-bold text-lg">
                      Rp {t.total.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400 border-t border-gray-200 pt-4">
          &copy; {new Date().getFullYear()} POS Pro - Laporan Penjualan
        </div>
      </div>
    </div>
  );
}