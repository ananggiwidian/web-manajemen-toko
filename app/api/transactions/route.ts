import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { items, total, paymentMethod } = await req.json();
  const invoiceNo = `INV-${Date.now()}`;
  try {
    const result = await prisma.$transaction(async (tx : Prisma.TransactionClient) => {
      const transaction = await tx.transaction.create({ data: { invoiceNo, userId: session.user.id, total, paymentMethod, status: "COMPLETED" } });
      for (const item of items) {
        await tx.transactionItem.create({ data: { transactionId: transaction.id, productId: item.productId, quantity: item.quantity, priceAtTime: item.priceAtTime } });
        await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } });
      }
      return transaction;
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Transaction failed" }, { status: 500 });
  }
}