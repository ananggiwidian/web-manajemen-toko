import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ONE_HOUR_MS = 60 * 60 * 1000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    if (
      transaction.paymentStatus === "PENDING" &&
      Date.now() - transaction.createdAt.getTime() > ONE_HOUR_MS
    ) {
      await prisma.transaction.update({
        where: { id },
        data: { paymentStatus: "EXPIRED" },
      });

      return NextResponse.json({ paymentStatus: "EXPIRED" });
    }

    return NextResponse.json({ paymentStatus: transaction.paymentStatus });
  } catch (error) {
    console.error("Error checking payment status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
