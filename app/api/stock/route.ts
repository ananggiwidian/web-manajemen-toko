import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { productId, quantity, type, reference } = await req.json();

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.stockMovement.create({
      data: {
        productId,
        quantity,
        type,
        reference,
        userId: session.user.id,
      },
    });
    await tx.product.update({
      where: { id: productId },
      data: {
        stock: {
          increment: type === "IN" ? quantity : -quantity,
        },
      },
    });
  });

  return NextResponse.json({ success: true });
}