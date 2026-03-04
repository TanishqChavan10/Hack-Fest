// ============================================================
// /lib/auth.ts
// Supabase Auth — Server-side session helper
// Replaces NextAuth's getServerSession for all API routes
// ============================================================
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export interface AuthSession {
  user: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role: Role;
  };
}

/**
 * Get the current authenticated session from Supabase Auth.
 * Returns null if the user is not authenticated.
 * Role is read from user_metadata (set during registration).
 */
export async function getSession(): Promise<AuthSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Role is stored in user_metadata for quick access
  const role = (user.user_metadata?.role as Role) ?? "CANDIDATE";

  return {
    user: {
      id: user.id,
      email: user.email!,
      name: (user.user_metadata?.name as string | null) ?? null,
      image: (user.user_metadata?.avatar_url as string | null) ?? null,
      role,
    },
  };
}

/**
 * Get session with a full Prisma user lookup (for cases where you need
 * the latest DB state, not just JWT metadata).
 */
export async function getSessionWithDbUser(): Promise<AuthSession | null> {
  const supabase = await createClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  if (!supabaseUser) return null;

  const dbUser = await db.user.findUnique({
    where: { id: supabaseUser.id },
  });

  if (!dbUser) return null;

  return {
    user: {
      id: dbUser.id,
      email: dbUser.email!,
      name: dbUser.name,
      image: dbUser.image,
      role: dbUser.role,
    },
  };
}
