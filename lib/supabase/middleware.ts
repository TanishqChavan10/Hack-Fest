// ============================================================
// /lib/supabase/middleware.ts
// Supabase client for Next.js middleware (refreshes auth tokens)
// ============================================================
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do NOT run supabase.auth.getSession() without getUser()
  // getUser() sends a request to the Supabase Auth server to revalidate the token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ---- Public routes (no auth required) ----
  const publicRoutes = ["/", "/login", "/register", "/unauthorized"];
  const isPublicRoute =
    publicRoutes.some((r) => pathname === r || pathname.startsWith(r + "/")) ||
    pathname.startsWith("/api/auth") ||
    (pathname.startsWith("/api/jobs") && request.method === "GET");

  // Redirect unauthenticated users trying to access protected routes
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // ---- Role-based access control ----
  if (user) {
    const role = user.user_metadata?.role as string | undefined;

    // RECRUITER-only routes
    if (pathname.startsWith("/recruiter") && role !== "RECRUITER") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    // CANDIDATE-only routes
    if (pathname.startsWith("/candidate") && role !== "CANDIDATE") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  return supabaseResponse;
}
