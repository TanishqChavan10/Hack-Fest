// ============================================================
// /app/api/auth/callback/route.ts
// Supabase OAuth Callback — Exchanges code for session
// Used after Google (or any OAuth) sign-in redirect.
// Also syncs the Supabase user to the Prisma User table.
// ============================================================
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Sync user to Prisma database if not already present
      const existingUser = await db.user.findUnique({
        where: { id: data.user.id },
      });

      const metadataRole = data.user.user_metadata?.role as string | undefined;

      if (!existingUser) {
        if (!metadataRole) {
          // Brand new OAuth user without a role -> Redirect to onboarding
          return NextResponse.redirect(`${origin}/onboarding`);
        }

        // If they somehow already have a role (e.g. from email sign-up flag), create them here
        await db.user.create({
          data: {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.full_name as string ?? data.user.user_metadata?.name as string ?? null,
            image: data.user.user_metadata?.avatar_url as string ?? null,
            role: metadataRole === "RECRUITER" ? "RECRUITER" : "CANDIDATE",
          },
        });

        if (metadataRole === "RECRUITER") {
          await db.recruiterProfile.create({
            data: {
              userId: data.user.id,
              companyName: "My Company",
            },
          });
        } else {
          await db.candidateProfile.create({
            data: {
              userId: data.user.id,
              hardSkills: {},
              softSkills: {},
            },
          });
        }
      }

      // Ensure role is set in Supabase user_metadata for existing users
      const currentRole = existingUser?.role || metadataRole;
      if (currentRole && data.user.user_metadata?.role !== currentRole) {
        await supabase.auth.updateUser({
          data: { role: currentRole },
        });
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth error — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
