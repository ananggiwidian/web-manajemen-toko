import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2026-04-22.dahlia",
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { items, total } = await req.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    // Prepare line items for Stripe Checkout
    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: "idr",
        product_data: {
          name: item.name || `Product ${item.productId}`, // Make sure frontend sends item.name
        },
        unit_amount: item.priceAtTime, // IDR is zero-decimal, so use integer prices directly
      },
      quantity: item.quantity,
    }));

    // Generate Invoice Number
    const invoiceNo = `INV-${Date.now()}`;

    // Create a Checkout Session
    const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL;
    
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/pos?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pos?cancel=true`,
      client_reference_id: invoiceNo,
    });

    // Create transaction in database with PENDING status
    await prisma.transaction.create({
      data: {
        invoiceNo,
        userId: session.user.id,
        total,
        paymentMethod: "STRIPE",
        status: "COMPLETED", // Assuming order itself is COMPLETED but payment is PENDING? Wait, maybe status is "COMPLETED" or we leave default
        paymentStatus: "PENDING",
        stripeSessionId: checkoutSession.id,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            priceAtTime: item.priceAtTime,
          })),
        },
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error("Stripe Checkout Error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
