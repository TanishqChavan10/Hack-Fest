// POST /api/auth/register
// Creates a new user with CANDIDATE or RECRUITER role.
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/prisma";

const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["CANDIDATE", "RECRUITER"]),
  // Recruiter-specific
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

    const { name, email, password, role, companyName } = parsed.data;

    // Check if user already exists
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user and associated profile in a transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await db.$transaction(async (tx: any) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          hashedPassword,
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
