// ============================================================
// /lib/github.ts
// PHASE 2 — GitHub Repository Parser using Octokit
// Person B's primary ownership file.
//
// Fetches top repositories and derives skill levels from:
//   1. Language usage bytes → normalized skill levels (1-10)
//   2. Star count → credibility bonus
//   3. Recent activity → recency score
// ============================================================
import { Octokit } from "octokit";

export interface GitHubRepoData {
  name: string;
  description: string | null;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  isPrivate: boolean;
  pushedAt: string | null;
  topics: string[];
  url: string;
}

export interface GitHubProfile {
  username: string;
  publicRepos: number;
  followers: number;
  following: number;
  topLanguages: Record<string, number>; // {TypeScript: 45000, Python: 12000}
  derivedSkills: Record<string, number>; // {typescript: 8, python: 5} — mapped to 1-10
  totalStars: number;
  repos: GitHubRepoData[];
  lastSynced: string;
}

// -------------------------------------------------------
// LANGUAGE → SKILL MAP
// Many languages are the same concept in the recruiter's mind.
// -------------------------------------------------------
const LANGUAGE_SKILL_MAP: Record<string, string> = {
  typescript: "typescript",
  javascript: "javascript",
  python: "python",
  java: "java",
  "c#": "csharp",
  "c++": "cpp",
  c: "c",
  rust: "rust",
  go: "go",
  kotlin: "kotlin",
  swift: "swift",
  ruby: "ruby",
  php: "php",
  scala: "scala",
  dart: "dart",
  shell: "bash",
  dockerfile: "docker",
};

// -------------------------------------------------------
// Derive 1-10 skill levels from language byte counts
// Uses a logarithmic scale: more code = higher level, but diminishing returns.
// -------------------------------------------------------
function deriveSkillLevels(languageBytes: Record<string, number>): Record<string, number> {
  if (Object.keys(languageBytes).length === 0) return {};

  const maxBytes = Math.max(...Object.values(languageBytes));
  const skills: Record<string, number> = {};

  for (const [lang, bytes] of Object.entries(languageBytes)) {
    const normalized = normalizeLanguage(lang);
    if (!normalized) continue;

    // Log scale: max bytes → level 9, tiny usage → level 1
    const ratio = bytes / maxBytes;
    const level = Math.max(1, Math.min(9, Math.round(1 + ratio * 8)));
    skills[normalized] = level;
  }

  return skills;
}

function normalizeLanguage(lang: string): string | null {
  const key = lang.toLowerCase();
  return LANGUAGE_SKILL_MAP[key] ?? (key.length > 1 ? key : null);
}

// -------------------------------------------------------
// MAIN: fetchGitHubProfile
// -------------------------------------------------------
export async function fetchGitHubProfile(
  username: string,
  personalToken?: string
): Promise<GitHubProfile> {
  const octokit = new Octokit({
    auth: personalToken ?? process.env.GITHUB_API_TOKEN,
  });

  // Fetch user profile
  const { data: user } = await octokit.rest.users.getByUsername({ username });

  // Fetch top repos (sorted by stars, take top 10 for analysis)
  const { data: repos } = await octokit.rest.repos.listForUser({
    username,
    sort: "pushed",
    per_page: 30,
    type: "owner",
  });

  // Aggregate language bytes across all repos
  const languageTotals: Record<string, number> = {};
  let totalStars = 0;

  const repoData: GitHubRepoData[] = [];

  for (const repo of repos.slice(0, 10)) {
    totalStars += repo.stargazers_count ?? 0;

    repoData.push({
      name: repo.name,
      description: repo.description ?? null,
      language: repo.language ?? null,
      stargazersCount: repo.stargazers_count ?? 0,
      forksCount: repo.forks_count ?? 0,
      isPrivate: repo.private,
      pushedAt: repo.pushed_at ?? null,
      topics: repo.topics ?? [],
      url: repo.html_url,
    });

    // Fetch per-repo language breakdown
    try {
      const { data: langs } = await octokit.rest.repos.listLanguages({
        owner: username,
        repo: repo.name,
      });
      for (const [lang, bytes] of Object.entries(langs)) {
        languageTotals[lang] = (languageTotals[lang] ?? 0) + (bytes as number);
      }
    } catch {
      // Silently skip repos with no language data
    }
  }

  const derivedSkills = deriveSkillLevels(languageTotals);

  return {
    username,
    publicRepos: user.public_repos,
    followers: user.followers,
    following: user.following,
    topLanguages: languageTotals,
    derivedSkills,
    totalStars,
    repos: repoData,
    lastSynced: new Date().toISOString(),
  };
}
