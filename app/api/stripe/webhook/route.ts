import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { Prisma } from "@prisma/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "dummy", {
  // @ts-ignore
  apiVersion: "2023-10-16",
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature") as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed.", err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const transaction = await prisma.transaction.findFirst({
      where: { stripeSessionId: session.id },
      include: { items: true },
    });

    if (!transaction) {
      console.error("Transaction not found for session:", session.id);
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Process everything inside a transaction for atomicity
    try {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Re-fetch transaction inside tx for idempotency check (prevents race condition)
        const txTransaction = await tx.transaction.findUnique({
          where: { id: transaction.id },
        });

        if (!txTransaction) throw new Error("Transaction not found in tx");

        // Idempotency check inside transaction (atomic read-then-write)
        if (txTransaction.stripeEventId === event.id) {
          return; // Already processed, no-op
        }

        // Check stock for all items inside transaction
        const productIds = transaction.items.map(item => item.productId);
        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
        });

        const productMap = new Map(products.map(p => [p.id, p]));

        let hasInsufficientStock = false;
        for (const item of transaction.items) {
          const product = productMap.get(item.productId);
          if (!product || product.stock < item.quantity) {
            hasInsufficientStock = true;
            break;
          }
        }

        if (hasInsufficientStock) {
          await tx.transaction.update({
            where: { id: transaction.id },
            data: {
              paymentStatus: "REQUIRES_REVIEW",
              stripeEventId: event.id,
            },
          });
        } else {
          for (const item of transaction.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.quantity } },
            });
          }
          await tx.transaction.update({
            where: { id: transaction.id },
            data: {
              paymentStatus: "PAID",
              stripeEventId: event.id,
            },
          });
        }
      });
    } catch (err) {
      console.error("Database update failed:", err);
      return NextResponse.json({ error: "Database update failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
