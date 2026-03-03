// POST /api/auth/register
// Creates the Prisma User + profile after Supabase Auth signup.
// Called from the client after supabase.auth.signUp() succeeds.
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma";

const RegisterSchema = z.object({
  supabaseUserId: z.string().min(1, "Supabase user ID is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  role: z.enum(["CANDIDATE", "RECRUITER"]),
  companyName: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { supabaseUserId, name, email, role, companyName } = parsed.data;

    // Check if user already exists in Prisma
    const existing = await db.user.findUnique({ where: { id: supabaseUserId } });
    if (existing) {
      return NextResponse.json(
        { message: "User already exists.", userId: existing.id },
        { status: 200 }
      );
    }

    // Also check by email
    const existingByEmail = await db.user.findUnique({ where: { email } });
    if (existingByEmail) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Create user and associated profile in a transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await db.$transaction(async (tx: any) => {
      const newUser = await tx.user.create({
        data: {
          id: supabaseUserId, // Use Supabase Auth user ID
          name,
          email,
          role,
        },
      });

      if (role === "CANDIDATE") {
        await tx.candidateProfile.create({
          data: {
            userId: newUser.id,
            hardSkills: {},
            softSkills: {},
          },
        });
      } else if (role === "RECRUITER") {
        await tx.recruiterProfile.create({
          data: {
            userId: newUser.id,
            companyName: companyName ?? "My Company",
          },
        });
      }

      return newUser;
    });

    return NextResponse.json(
      {
        message: "Account created successfully.",
        userId: user.id,
        role: user.role,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[REGISTER]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
