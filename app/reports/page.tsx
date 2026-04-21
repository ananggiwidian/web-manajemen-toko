"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Toaster, toast } from "sonner";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (session?.user?.role !== "ADMIN") router.push("/pos");
    fetch("/api/reports/sales").then(res => res.json()).then(setTransactions);
  }, [status, session, router]);

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Laporan Penjualan");
    worksheet.columns = [
      { header: "Invoice", key: "invoiceNo", width: 20 },
      { header: "Tanggal", key: "createdAt", width: 15 },
      { header: "Total", key: "total", width: 15 },
      { header: "Metode", key: "paymentMethod", width: 12 },
    ];
    transactions.forEach(t => worksheet.addRow({ invoiceNo: t.invoiceNo, createdAt: new Date(t.createdAt).toLocaleDateString(), total: `Rp ${t.total.toLocaleString()}`, paymentMethod: t.paymentMethod }));
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "laporan_penjualan.xlsx"; link.click(); URL.revokeObjectURL(link.href);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    autoTable(doc, { head: [["Invoice", "Tanggal", "Total", "Metode"]], body: transactions.map(t => [t.invoiceNo, new Date(t.createdAt).toLocaleDateString(), `Rp ${t.total.toLocaleString()}`, t.paymentMethod]) });
    doc.save("laporan.pdf");
  };

  return (
    <div className="p-6">
      <Toaster />
      <h1 className="text-2xl font-bold mb-4">Laporan Penjualan</h1>
      <div className="flex gap-2 mb-4"><Button onClick={exportExcel}>Export Excel</Button><Button onClick={exportPDF}>Export PDF</Button></div>
      <Table>
        <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Tanggal</TableHead><TableHead>Total</TableHead><TableHead>Metode</TableHead></TableRow></TableHeader>
        <TableBody>{transactions.map(t => <TableRow key={t.id}><TableCell>{t.invoiceNo}</TableCell><TableCell>{new Date(t.createdAt).toLocaleDateString()}</TableCell><TableCell>Rp {t.total.toLocaleString()}</TableCell><TableCell>{t.paymentMethod}</TableCell></TableRow>)}</TableBody>
      </Table>
    </div>
  );
}