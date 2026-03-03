// middleware.ts
// Protects routes based on authentication and role (RBAC).
// Runs on the Edge before the page renders.
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // ---- RECRUITER-only routes ----
    if (pathname.startsWith("/recruiter") && token?.role !== "RECRUITER") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    // ---- CANDIDATE-only routes ----
    if (pathname.startsWith("/candidate") && token?.role !== "CANDIDATE") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Require a token for all protected routes
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        // Public routes that don't need auth
        const publicRoutes = ["/", "/login", "/register", "/unauthorized"];
        if (publicRoutes.some((r) => pathname.startsWith(r))) return true;
        if (pathname.startsWith("/api/auth")) return true;
        if (pathname.startsWith("/api/jobs") && req.method === "GET") return true;
        // All other routes require a session
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
