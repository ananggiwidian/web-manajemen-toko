import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Prisma } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  if (transaction.paymentStatus !== "REQUIRES_REVIEW") {
    return NextResponse.json(
      { error: "Transaction is not in REQUIRES_REVIEW status" },
      { status: 400 }
    );
  }

  // Check and decrement stock atomically inside transaction
  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Re-fetch transaction inside tx to ensure status hasn't changed
      const txTransaction = await tx.transaction.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!txTransaction) throw new Error("Transaction not found");
      if (txTransaction.paymentStatus !== "REQUIRES_REVIEW") {
        return { error: "Transaction is not in REQUIRES_REVIEW status", status: 400 };
      }

      // Check stock inside transaction
      const productIds = txTransaction.items.map(item => item.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      const productMap = new Map(products.map(p => [p.id, p]));

      let hasInsufficientStock = false;
      for (const item of txTransaction.items) {
        const product = productMap.get(item.productId);
        if (!product || product.stock < item.quantity) {
          hasInsufficientStock = true;
          break;
        }
      }

      if (hasInsufficientStock) {
        return { insufficient: true };
      }

      // Decrement stock + update status atomically
      for (const item of txTransaction.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
      await tx.transaction.update({
        where: { id },
        data: { paymentStatus: "PAID" },
      });

      return { success: true };
    });

    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status as number });
    }
    if ("insufficient" in result && result.insufficient) {
      return NextResponse.json(
        { error: "Insufficient stock", paymentStatus: "REQUIRES_REVIEW" },
        { status: 200 }
      );
    }

    return NextResponse.json({ message: "Stock retry successful", paymentStatus: "PAID" }, { status: 200 });
  } catch (err) {
    console.error("Stock retry failed:", err);
    return NextResponse.json({ error: "Database update failed" }, { status: 500 });
  }
}
