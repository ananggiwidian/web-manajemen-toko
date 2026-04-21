import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const totalSales = await prisma.transaction.aggregate({ _sum: { total: true } });
  const totalTransactions = await prisma.transaction.count();
  const lowStock = await prisma.product.count({ where: { stock: { lt: 5 } } });
  const last7Days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().slice(0,10); }).reverse();
  const dailySales = await Promise.all(last7Days.map(async date => {
    const start = new Date(date); const end = new Date(date); end.setDate(end.getDate() + 1);
    const total = await prisma.transaction.aggregate({ where: { createdAt: { gte: start, lt: end } }, _sum: { total: true } });
    return { date, total: total._sum.total || 0 };
  }));
  return NextResponse.json({ summary: { totalSales: totalSales._sum.total || 0, totalTransactions, lowStock }, dailySales });
}