import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");
const EMBEDDING_MODEL = "models/gemini-embedding-001";

/**
 * Generate a single text embedding using Gemini
 * Task types help Gemini optimize for retrieval (Query vs Document).
 */
export async function generateEmbedding(
    text: string,
    taskType: "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT" | "SEMANTIC_SIMILARITY" = "SEMANTIC_SIMILARITY"
): Promise<number[]> {
    const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
    const result = await model.embedContent({
        content: { parts: [{ text: text.trim().replace(/\n/g, " ") }], role: "user" },
        taskType,
        outputDimensionality: 768,
    } as any);
    return result.embedding.values;
}

/**
 * Build a rich text representation of a candidate profile
 * for embedding (Gemini-compatible)
 */
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

/**
 * Build a rich text representation of a job description
 */
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
