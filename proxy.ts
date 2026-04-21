import { withAuth, NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(request: NextRequestWithAuth) {
    const token = request.nextauth.token;
    const path = request.nextUrl.pathname;

    console.log("Path:", path, "Role:", token?.role); // Untuk debugging

    // Admin only routes
    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/pos", request.url));
    }
    if (path.startsWith("/products") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/pos", request.url));
    }
    if (path.startsWith("/stock") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/pos", request.url));
    }
    if (path.startsWith("/reports") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/pos", request.url));
    }
    
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/pos/:path*",
    "/products/:path*",
    "/stock/:path*",
    "/reports/:path*",
  ],
};