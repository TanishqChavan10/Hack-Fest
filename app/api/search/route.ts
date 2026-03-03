// GET /api/search?q=...
// Phase 1: Keyword search via PostgreSQL ILIKE
// Phase 2: Semantic search via pgvector (Supabase)
// The API signature stays the same — only the internal logic changes in Phase 2.
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "RECRUITER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = parseInt(searchParams.get("pageSize") ?? "10");
    const level = searchParams.get("level");

    // -------------------------------------------------------
    // PHASE 1: Structured keyword/level filter search
    // PHASE 2: Replace this block with pgvector semantic search
    // -------------------------------------------------------
    const whereClause = {
      isOpenToWork: true,
      ...(level && { experienceLevel: level as never }),
      ...(query && {
        OR: [
          { headline: { contains: query, mode: "insensitive" as const } },
          { bio: { contains: query, mode: "insensitive" as const } },
          { location: { contains: query, mode: "insensitive" as const } },
        ],
      }),
    };

    const [candidates, total] = await Promise.all([
      db.candidateProfile.findMany({
        where: whereClause,
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.candidateProfile.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      data: candidates,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
      // Flag tells the frontend which search mode is active
      searchMode: "keyword", // Phase 2: change to "semantic"
    });
  } catch (error) {
    console.error("[SEARCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
