// ============================================================
// /services/openai.ts
// Embedding Generator — powered by Google Gemini
// Converts text (job descriptions / candidate profiles) into
// 768-dimensional vectors for pgvector semantic search.
// ============================================================
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const EMBEDDING_MODEL = "text-embedding-004";
const EMBEDDING_DIMENSIONS = 768;

// -------------------------------------------------------
// Generate a single text embedding
// -------------------------------------------------------
export async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });

  const result = await model.embedContent(text.trim().replace(/\n/g, " "));

  return result.embedding.values;
}

// -------------------------------------------------------
// Build a rich text representation of a candidate profile
// for embedding (Phase 2 integration point)
// -------------------------------------------------------
export function buildCandidateProfileText(profile: {
  headline?: string | null;
  bio?: string | null;
  hardSkills: Record<string, number>;
  softSkills: Record<string, number>;
  yearsOfExp: number;
}): string {
  const hardSkillsList = Object.entries(profile.hardSkills)
    .sort(([, a], [, b]) => b - a)
    .map(([skill, level]) => `${skill} (level ${level})`)
    .join(", ");

  const softSkillsList = Object.keys(profile.softSkills).join(", ");

  return [
    profile.headline ?? "",
    profile.bio ?? "",
    `Technical skills: ${hardSkillsList}`,
    softSkillsList ? `Soft skills: ${softSkillsList}` : "",
    `${profile.yearsOfExp} years of experience`,
  ]
    .filter(Boolean)
    .join(". ");
}

// -------------------------------------------------------
// Build a rich text representation of a job description
// -------------------------------------------------------
export function buildJobText(job: {
  title: string;
  description: string;
  requirements: Array<{ skillName: string; minLevel: number }>;
}): string {
  const reqList = job.requirements
    .map((r) => `${r.skillName} (min level ${r.minLevel})`)
    .join(", ");

  return [
    job.title,
    job.description,
    reqList ? `Required skills: ${reqList}` : "",
  ]
    .filter(Boolean)
    .join(". ");
}

export { EMBEDDING_DIMENSIONS };
