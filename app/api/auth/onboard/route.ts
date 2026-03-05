import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/prisma";
import { z } from "zod";

const OnboardSchema = z.object({
    role: z.enum(["CANDIDATE", "RECRUITER"]),
    companyName: z.string().optional(),
});

export async function POST(request: Request) {
    // Step 1: Create Supabase client
    let supabase;
    try {
        supabase = await createClient();
    } catch (e: any) {
        return NextResponse.json(
            { error: "Failed to create Supabase client: " + e.message },
            { status: 500 }
        );
    }

    // Step 2: Get authenticated user
    let authUser;
    try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
            return NextResponse.json(
                { error: "Supabase getUser error: " + error.message },
                { status: 401 }
            );
        }
        authUser = data.user;
    } catch (e: any) {
        return NextResponse.json(
            { error: "getUser exception: " + e.message },
            { status: 500 }
        );
    }

    if (!authUser) {
        return NextResponse.json(
            { error: "No authenticated user found. Please sign in again." },
            { status: 401 }
        );
    }

    // Step 3: Parse body
    let role: "CANDIDATE" | "RECRUITER";
    let companyName: string | undefined;
    try {
        const body = await request.json();
        const parsed = OnboardSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid data: " + JSON.stringify(parsed.error.flatten()) },
                { status: 400 }
            );
        }
        role = parsed.data.role;
        companyName = parsed.data.companyName;
    } catch (e: any) {
        return NextResponse.json(
            { error: "Body parse error: " + e.message },
            { status: 400 }
        );
    }

    // Step 4: Check if user already exists in Prisma
    try {
        const existingUser = await db.user.findUnique({
            where: { id: authUser.id },
        });

        if (existingUser) {
            // Already onboarded, just sync metadata
            if (authUser.user_metadata?.role !== existingUser.role) {
                await supabase.auth.updateUser({
                    data: { role: existingUser.role },
                });
            }
            return NextResponse.json({ success: true, role: existingUser.role });
        }
    } catch (e: any) {
        return NextResponse.json(
            { error: "DB lookup failed: " + e.message },
            { status: 500 }
        );
    }

    // Step 5: Create user + profile
    try {
        await db.user.create({
            data: {
                id: authUser.id,
                email: authUser.email,
                name:
                    (authUser.user_metadata?.full_name as string) ??
                    (authUser.user_metadata?.name as string) ??
                    null,
                image: (authUser.user_metadata?.avatar_url as string) ?? null,
                role,
            },
        });
    } catch (e: any) {
        return NextResponse.json(
            { error: "User create failed: " + e.message },
            { status: 500 }
        );
    }

    // Step 6: Create profile
    try {
        if (role === "RECRUITER") {
            await db.recruiterProfile.create({
                data: {
                    userId: authUser.id,
                    companyName: companyName || "My Company",
                },
            });
        } else {
            await db.candidateProfile.create({
                data: {
                    userId: authUser.id,
                    hardSkills: {},
                    softSkills: {},
                },
            });
        }
    } catch (e: any) {
        return NextResponse.json(
            { error: "Profile create failed: " + e.message },
            { status: 500 }
        );
    }

    // Step 7: Update Supabase metadata
    try {
        await supabase.auth.updateUser({
            data: { role },
        });
    } catch (e: any) {
        // Non-fatal — user was created, metadata just didn't sync
        console.error("[ONBOARD] metadata update failed:", e.message);
    }

    return NextResponse.json({ success: true, role });
}
