// ============================================================
// /lib/supabase.ts
// Supabase Client — Used for pgvector semantic search (Phase 2)
// Replaces Pinecone with native PostgreSQL vector extension.
// ============================================================
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Public client (safe to use on client-side)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service client (server-only: bypasses RLS for admin operations)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// -------------------------------------------------------
// VECTOR OPERATIONS (Phase 2 — pgvector)
// -------------------------------------------------------

/**
 * Upsert a candidate embedding into the pgvector table.
 * The `candidate_embeddings` table must be created with:
 *   CREATE TABLE candidate_embeddings (
 *     id TEXT PRIMARY KEY,
 *     embedding vector(768),
 *     metadata JSONB
 *   );
 */
export async function upsertCandidateEmbedding(
  candidateId: string,
  embedding: number[],
  metadata: Record<string, unknown>
) {
  const { error } = await supabaseAdmin.rpc("upsert_candidate_embedding", {
    p_id: candidateId,
    p_embedding: JSON.stringify(embedding),
    p_metadata: metadata,
  });

  if (error) throw new Error(`Supabase upsert error: ${error.message}`);
}

/**
 * Semantic search: Find top-K candidate IDs closest to a query embedding.
 * Uses cosine distance via pgvector operator <->.
 */
export async function semanticSearchCandidates(
  queryEmbedding: number[],
  topK: number = 50
): Promise<Array<{ id: string; score: number; metadata: Record<string, unknown> }>> {
  const { data, error } = await supabaseAdmin.rpc("match_candidates", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: topK,
  });

  if (error) throw new Error(`Supabase search error: ${error.message}`);

  return (data ?? []).map((row: { id: string; similarity: number; metadata: Record<string, unknown> }) => ({
    id: row.id,
    score: row.similarity,
    metadata: row.metadata,
  }));
}

// -------------------------------------------------------
// SQL to paste in Supabase SQL editor (run once to set up):
// -------------------------------------------------------
//
// -- Enable pgvector extension
// CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
//
// -- Candidate embeddings table
// CREATE TABLE IF NOT EXISTS candidate_embeddings (
//   id TEXT PRIMARY KEY,
//   embedding extensions.vector(768),
//   metadata JSONB DEFAULT '{}'::jsonb,
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
//
// -- IVFFlat index for fast approximate search
// CREATE INDEX ON candidate_embeddings
//   USING ivfflat (embedding extensions.vector_cosine_ops)
//   WITH (lists = 100);
//
// -- Upsert function
// CREATE OR REPLACE FUNCTION upsert_candidate_embedding(
//   p_id TEXT, p_embedding TEXT, p_metadata JSONB
// ) RETURNS void AS $$
// BEGIN
//   INSERT INTO candidate_embeddings(id, embedding, metadata)
//   VALUES (p_id, p_embedding::extensions.vector, p_metadata)
//   ON CONFLICT (id) DO UPDATE
//   SET embedding = EXCLUDED.embedding,
//       metadata  = EXCLUDED.metadata;
// END; $$ LANGUAGE plpgsql SECURITY DEFINER;
//
// -- Match function
// CREATE OR REPLACE FUNCTION match_candidates(
//   query_embedding TEXT, match_count INT DEFAULT 50
// ) RETURNS TABLE(id TEXT, similarity FLOAT, metadata JSONB) AS $$
// BEGIN
//   RETURN QUERY
//   SELECT ce.id,
//          1 - (ce.embedding <=> query_embedding::extensions.vector) AS similarity,
//          ce.metadata
//   FROM candidate_embeddings ce
//   ORDER BY ce.embedding <=> query_embedding::extensions.vector
//   LIMIT match_count;
// END; $$ LANGUAGE plpgsql SECURITY DEFINER;
