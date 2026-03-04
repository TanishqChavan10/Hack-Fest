// GET /api/search?q=...&mode=keyword|semantic
// Hybrid search: keyword (ILIKE) or semantic (pgvector + OpenAI embeddings).
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { generateEmbedding } from "@/services/gemini";
import { semanticSearchCandidates } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "RECRUITER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = parseInt(searchParams.get("pageSize") ?? "10");
    const level = searchParams.get("level");
    const mode = searchParams.get("mode") ?? "keyword";

    // -------------------------------------------------------
    // SEMANTIC SEARCH: pgvector + Gemini embeddings
    // -------------------------------------------------------
    if (mode === "semantic" && query.trim().length > 0) {
      try {
        // 1. Generate embedding for the recruiter's natural-language query
        // Use RETRIEVAL_QUERY for optimized search performance
        const queryEmbedding = await generateEmbedding(query, "RETRIEVAL_QUERY");

        // 2. Find top-50 closest candidate IDs via pgvector cosine distance
        const semanticResults = await semanticSearchCandidates(queryEmbedding, 50);

        console.log(`[SEARCH] Semantic results found: ${semanticResults.length}`);
        if (semanticResults.length > 0) {
          console.log(`[SEARCH] Raw top scores:`, semanticResults.slice(0, 5).map(r => r.score));
        }

        // Filter by threshold (e.g. 0.65) to avoid "too lenient" results
        const SIMILARITY_THRESHOLD = 0.65;
        const filteredResults = semanticResults.filter(r => r.score >= SIMILARITY_THRESHOLD);

        console.log(`[SEARCH] Filtered results (>= ${SIMILARITY_THRESHOLD}): ${filteredResults.length}`);

        if (filteredResults.length === 0) {
          return NextResponse.json({
            data: [],
            total: 0,
            page: 1,
            pageSize,
            hasMore: false,
            searchMode: "semantic",
            warning: semanticResults.length > 0 ? "No highly relevant matches found. Try broadening your search." : null
          });
        }

        const candidateIds = filteredResults.map((r) => r.id);
        const scoreMap = new Map(filteredResults.map((r) => [r.id, r.score]));

        // 3. Hydrate full profiles from Prisma
        const whereClause = {
          id: { in: candidateIds },
          isOpenToWork: true,
          ...(level && { experienceLevel: level as never }),
        };

        const candidates = await db.candidateProfile.findMany({
          where: whereClause,
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        });

        // 4. Sort by semantic similarity score (descending) & paginate
        const sorted = candidates
          .map((c: any) => ({
            ...c,
            semanticScore: Math.round((scoreMap.get(c.id) ?? 0) * 100),
          }))
          .sort((a: { semanticScore: number }, b: { semanticScore: number }) => b.semanticScore - a.semanticScore);

        const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

        return NextResponse.json({
          data: paginated,
          total: sorted.length,
          page,
          pageSize,
          hasMore: page * pageSize < sorted.length,
          searchMode: "semantic",
        });
      } catch (semanticError) {
        // Fallback to keyword search if semantic fails (e.g., no OpenAI key)
        console.error("[SEARCH] Semantic search failed, falling back to keyword:", semanticError);
        // We continue to the keyword search below, but we'll flag it in the final response
        return performKeywordSearch(query, level, page, pageSize, "Semantic search is currently unavailable. Falling back to keyword mode.");
      }
    }

    return performKeywordSearch(query, level, page, pageSize);
  } catch (error) {
    console.error("[SEARCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function performKeywordSearch(query: string, level: string | null, page: number, pageSize: number, warning?: string) {
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
    searchMode: "keyword",
    warning: warning || null,
  });
}
