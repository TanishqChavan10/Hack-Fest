// Run once to set up pgvector table and functions in Supabase
// Usage: npx tsx scripts/setup-pgvector.ts

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function setup() {
  console.log("🔧 Setting up pgvector for semantic search...\n");

  // 1. Enable pgvector extension
  console.log("1️⃣  Enabling pgvector extension...");
  await prisma.$executeRawUnsafe(`
    CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
  `);

  // 2. Create candidate_embeddings table
  console.log("2️⃣  Creating candidate_embeddings table...");
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS candidate_embeddings (
      id TEXT PRIMARY KEY,
      embedding extensions.vector(768),
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 3. Create IVFFlat index for fast approximate search
  console.log("3️⃣  Creating vector index...");
  try {
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS candidate_embeddings_embedding_idx
      ON candidate_embeddings
      USING ivfflat (embedding extensions.vector_cosine_ops)
      WITH (lists = 100);
    `);
  } catch (e: any) {
    // IVFFlat index requires at least some rows; skip if it fails
    console.log("   ⚠️  Index creation skipped (may need data first):", e.message);
  }

  // 4. Create upsert function
  console.log("4️⃣  Creating upsert_candidate_embedding function...");
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION upsert_candidate_embedding(
      p_id TEXT, p_embedding TEXT, p_metadata JSONB
    ) RETURNS void AS $$
    BEGIN
      INSERT INTO candidate_embeddings(id, embedding, metadata)
      VALUES (p_id, p_embedding::extensions.vector, p_metadata)
      ON CONFLICT (id) DO UPDATE
      SET embedding = EXCLUDED.embedding,
          metadata  = EXCLUDED.metadata;
    END; $$ LANGUAGE plpgsql SECURITY DEFINER;
  `);

  // 5. Create match function
  console.log("5️⃣  Creating match_candidates function...");
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION match_candidates(
      query_embedding TEXT, match_count INT DEFAULT 50
    ) RETURNS TABLE(id TEXT, similarity FLOAT, metadata JSONB) AS $$
    BEGIN
      RETURN QUERY
      SELECT ce.id,
             1 - (ce.embedding <=> query_embedding::extensions.vector) AS similarity,
             ce.metadata
      FROM candidate_embeddings ce
      ORDER BY ce.embedding <=> query_embedding::extensions.vector
      LIMIT match_count;
    END; $$ LANGUAGE plpgsql SECURITY DEFINER;
  `);

  console.log("\n✅ pgvector setup complete!");
  console.log("   Next step: run 'npx tsx scripts/sync-embeddings.ts' to generate embeddings for existing candidates.");
}

setup()
  .catch((e) => {
    console.error("❌ Setup failed:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
