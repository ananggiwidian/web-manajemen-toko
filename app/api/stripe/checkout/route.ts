import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "dummy", {
  // @ts-ignore
  apiVersion: "2023-10-16",
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

    // Validate minimum amount (Stripe minimum for IDR is Rp 10,000)
    const calculatedTotal = items.reduce((sum: number, item: any) => sum + item.priceAtTime * item.quantity, 0);
    if (calculatedTotal < 10000) {
      return NextResponse.json(
        { error: "Total minimum untuk pembayaran Stripe adalah Rp 10.000" },
        { status: 400 }
      );
    }

    // Fetch products to get names for Stripe line items
    const productIds = items.map((i: any) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });
    const productMap = new Map(products.map(p => [p.id, p.name]));

    // Prepare line items for Stripe Checkout
    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: "idr",
        product_data: {
          name: productMap.get(item.productId) || "Product",
        },
        unit_amount: item.priceAtTime * 100, // IDR uses minor units (sen) in Stripe, multiply by 100
      },
      quantity: item.quantity,
    }));

    // Validate each line item meets Stripe minimum (Rp 10,000 for IDR)
    for (const item of lineItems) {
      if (item.price_data.unit_amount < 10000) {
        return NextResponse.json(
          { error: `Harga minimum per item untuk Stripe adalah Rp 10.000. Product "${item.price_data.product_data.name}" harga Rp ${item.price_data.unit_amount.toLocaleString()}` },
          { status: 400 }
        );
      }
    }

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
        paymentMethod: "STRIPE_TRANSFER",
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
