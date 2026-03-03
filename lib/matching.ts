// ============================================================
// /lib/matching.ts
// PHASE 1 — Weighted Multi-Dimensional Scoring Algorithm
// Person D's primary ownership file.
//
// Formula:
//   Score = Σ(clamp(candidateLevel / minLevel, 0, 1.2) × weight)
//           ────────────────────────────────────────────────────── × 100
//                           Σ(weight)
// ============================================================

export interface SkillMap {
  [skillName: string]: number; // Proficiency level 1-10
}

export interface JobRequirement {
  skillName: string;
  minLevel: number; // Minimum required proficiency (1-10)
  weight: number;   // Relative importance: 0.0 – 1.0
  isMandatory: boolean;
}

export interface CategoryWeights {
  technicalSkills: number; // e.g. 0.6
  softSkills: number;      // e.g. 0.2
  experience: number;      // e.g. 0.2
}

export interface MatchBreakdown {
  technical: number;
  softSkills: number;
  experience: number;
  overall: number;
}

// -------------------------------------------------------
// NORMALIZER: ensures "React" == "react" == "REACT"
// -------------------------------------------------------
function normalizeSkillName(name: string): string {
  return name.trim().toLowerCase();
}

function normalizeSkillMap(skills: SkillMap): SkillMap {
  return Object.fromEntries(
    Object.entries(skills).map(([k, v]) => [normalizeSkillName(k), v])
  );
}

// -------------------------------------------------------
// CORE: Calculate a single dimension score
// Returns { score: 0-100, mandatoryPass: boolean }
// -------------------------------------------------------
function scoreDimension(
  candidateSkills: SkillMap,
  requirements: JobRequirement[]
): { score: number; mandatoryPass: boolean } {
  if (requirements.length === 0) return { score: 100, mandatoryPass: true };

  const normalized = normalizeSkillMap(candidateSkills);
  let weightedScore = 0;
  let totalWeight = 0;
  let mandatoryPass = true;

  for (const req of requirements) {
    const key = normalizeSkillName(req.skillName);
    const candidateLevel = normalized[key] ?? 0;

    // Mandatory skill with 0 proficiency → hard fail
    if (req.isMandatory && candidateLevel === 0) {
      mandatoryPass = false;
    }

    // Allow up to 20% bonus for exceeding requirement (capped at 1.2)
    const rawRatio = candidateLevel / Math.max(req.minLevel, 1);
    const skillScore = Math.min(rawRatio, 1.2);

    weightedScore += skillScore * req.weight;
    totalWeight += req.weight;
  }

  if (totalWeight === 0) return { score: 100, mandatoryPass };

  const percentage = Math.round((weightedScore / totalWeight) * 100);
  // Cap final score at 100
  return { score: Math.min(percentage, 100), mandatoryPass };
}

// -------------------------------------------------------
// MAIN: calculateMatchScore
// Combines technical, soft-skill, and experience scores
// using the recruiter's configured category weights.
// -------------------------------------------------------
export function calculateMatchScore(
  candidateHardSkills: SkillMap,
  candidateSoftSkills: SkillMap,
  yearsOfExperience: number,
  requirements: JobRequirement[],
  categoryWeights: CategoryWeights,
  requiredYearsOfExp: number = 0
): { score: number; breakdown: MatchBreakdown; isMandatoryPass: boolean } {
  // Split requirements by implied category
  const hardReqs = requirements.filter((r) => !r.skillName.startsWith("soft:"));
  const softReqs = requirements
    .filter((r) => r.skillName.startsWith("soft:"))
    .map((r) => ({ ...r, skillName: r.skillName.replace("soft:", "") }));

  // Technical dimension
  const { score: technicalScore, mandatoryPass: techPass } = scoreDimension(
    candidateHardSkills,
    hardReqs
  );

  // Soft-skills dimension
  const { score: softScore, mandatoryPass: softPass } = scoreDimension(
    candidateSoftSkills,
    softReqs
  );

  // Experience dimension (simple ratio, capped at 1.0)
  const expScore =
    requiredYearsOfExp === 0
      ? 100
      : Math.min((yearsOfExperience / requiredYearsOfExp) * 100, 100);

  // Weighted combination
  const totalCategoryWeight =
    categoryWeights.technicalSkills +
    categoryWeights.softSkills +
    categoryWeights.experience;

  const combinedScore =
    (technicalScore * categoryWeights.technicalSkills +
      softScore * categoryWeights.softSkills +
      expScore * categoryWeights.experience) /
    Math.max(totalCategoryWeight, 1);

  const finalScore = Math.round(Math.min(combinedScore, 100));

  return {
    score: finalScore,
    breakdown: {
      technical: technicalScore,
      softSkills: softScore,
      experience: Math.round(expScore),
      overall: finalScore,
    },
    isMandatoryPass: techPass && softPass,
  };
}

// -------------------------------------------------------
// BULK RANK: rank candidates for a job
// Used by /api/match
// -------------------------------------------------------
export interface CandidateForRanking {
  id: string;
  hardSkills: unknown;
  softSkills: unknown;
  yearsOfExp: number;
}

export interface RankedCandidate extends CandidateForRanking {
  matchScore: number;
  breakdown: MatchBreakdown;
  isMandatoryPass: boolean;
}

export function rankCandidates(
  candidates: CandidateForRanking[],
  requirements: JobRequirement[],
  categoryWeights: CategoryWeights,
  requiredYearsOfExp: number = 0
): RankedCandidate[] {
  return candidates
    .map((candidate) => {
      const { score, breakdown, isMandatoryPass } = calculateMatchScore(
        (candidate.hardSkills as SkillMap) ?? {},
        (candidate.softSkills as SkillMap) ?? {},
        candidate.yearsOfExp,
        requirements,
        categoryWeights,
        requiredYearsOfExp
      );
      return { ...candidate, matchScore: score, breakdown, isMandatoryPass };
    })
    .sort((a, b) => {
      // Mandatory-pass candidates come first, then sort by score descending
      if (a.isMandatoryPass !== b.isMandatoryPass) {
        return a.isMandatoryPass ? -1 : 1;
      }
      return b.matchScore - a.matchScore;
    });
}
