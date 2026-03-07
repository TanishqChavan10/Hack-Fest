// ============================================================
// Resume Parser — Extract structured profile data from resume text
// Uses Google Gemini to intelligently parse resume content
// ============================================================
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_GENERATIVE_AI_API_KEY || ""
);

export interface ParsedResume {
  headline: string | null;
  bio: string | null;
  location: string | null;
  yearsOfExp: number;
  experienceLevel: "ENTRY" | "MID" | "SENIOR" | "LEAD" | "EXECUTIVE";
  githubUsername: string | null;
  portfolioUrl: string | null;
  linkedinUrl: string | null;
  hardSkills: { name: string; level: number }[];
  softSkills: { name: string; level: number }[];
  education: { degree: string; institution: string; fieldOfStudy: string; startYear: number | null; endYear: number | null; grade: string | null }[];
  experience: { title: string; company: string; location: string | null; startDate: string | null; endDate: string | null; current: boolean; description: string }[];
  projects: { name: string; description: string; techStack: string[]; url: string | null; repoUrl: string | null }[];
  certifications: { name: string; issuer: string; date: string | null; url: string | null }[];
  languages: { language: string; proficiency: string }[];
}

const SYSTEM_PROMPT = `You are a resume parser. Given resume text, extract structured profile information.
Return ONLY valid JSON matching this exact schema (no markdown, no explanation):

{
  "headline": "A short professional headline (e.g. 'Full Stack Developer | React | Node.js')",
  "bio": "A 2-3 sentence professional summary",
  "location": "City, State/Country or null",
  "yearsOfExp": <number 0-50>,
  "experienceLevel": "ENTRY" | "MID" | "SENIOR" | "LEAD" | "EXECUTIVE",
  "githubUsername": "extracted github username or null",
  "portfolioUrl": "portfolio/website URL or null",
  "linkedinUrl": "linkedin URL or null",
  "hardSkills": [{"name": "skill name", "level": <1-10>}],
  "softSkills": [{"name": "skill name", "level": <1-10>}],
  "education": [{"degree": "B.Tech / M.S. / etc", "institution": "University name", "fieldOfStudy": "Computer Science", "startYear": 2020, "endYear": 2024, "grade": "8.5 CGPA or null"}],
  "experience": [{"title": "Software Engineer", "company": "Company Name", "location": "City or null", "startDate": "Jan 2023", "endDate": "Present or Dec 2024", "current": true/false, "description": "Brief description of role and achievements"}],
  "projects": [{"name": "Project Name", "description": "What the project does", "techStack": ["React", "Node.js"], "url": "live URL or null", "repoUrl": "github repo URL or null"}],
  "certifications": [{"name": "AWS Certified Developer", "issuer": "Amazon", "date": "2024 or null", "url": "credential URL or null"}],
  "languages": [{"language": "English", "proficiency": "Native/Fluent/Intermediate/Basic"}]
}

Rules:
- For yearsOfExp, calculate from work experience dates. If unclear, estimate conservatively.
- For experienceLevel: 0-2 years = ENTRY, 2-5 = MID, 5-10 = SENIOR, 10+ = LEAD, 15+ with leadership = EXECUTIVE
- For hardSkills level (1-10): estimate based on how prominently the skill appears, years used, and project complexity.
  - Mentioned once or listed = 3-4
  - Used in multiple projects = 5-6
  - Primary/expert skill with deep experience = 7-9
  - Level 10 is reserved for extraordinary mastery
- For softSkills: extract leadership, communication, teamwork etc. Default level 5-7.
- Extract at most 15 hard skills and 5 soft skills, focusing on the most prominent ones.
- For education: extract ALL degrees/certifications with institution, field, years. Order by most recent first.
- For experience: extract ALL work positions with company, dates, description. Order by most recent first. Mark current=true for ongoing roles.
- For projects: extract notable projects mentioned. Include tech stack as an array. Extract URLs if present.
- For certifications: extract professional certifications, courses, awards.
- For languages: extract spoken/written languages with proficiency level.
- For GitHub username, look for github.com/username patterns.
- For portfolio, look for personal website URLs.
- For LinkedIn, look for linkedin.com/in/ patterns.
- If a field cannot be determined, use null (for strings) or reasonable defaults. Use empty arrays [] if no data found for array fields.`;

export async function parseResumeText(
  resumeText: string
): Promise<ParsedResume> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent([
    { text: SYSTEM_PROMPT },
    {
      text: `Parse this resume:\n\n${resumeText.slice(0, 15000)}`,
    },
  ]);

  const responseText = result.response.text();

  // Extract JSON from the response (handle potential markdown wrapping)
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Gemini did not return valid JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Validate and sanitize the response
  return {
    headline: typeof parsed.headline === "string" ? parsed.headline.slice(0, 200) : null,
    bio: typeof parsed.bio === "string" ? parsed.bio.slice(0, 2000) : null,
    location: typeof parsed.location === "string" ? parsed.location.slice(0, 100) : null,
    yearsOfExp: clampInt(parsed.yearsOfExp, 0, 50),
    experienceLevel: validateExpLevel(parsed.experienceLevel),
    githubUsername:
      typeof parsed.githubUsername === "string"
        ? parsed.githubUsername.replace(/^@/, "").slice(0, 39)
        : null,
    portfolioUrl: sanitizeUrl(parsed.portfolioUrl),
    linkedinUrl: sanitizeUrl(parsed.linkedinUrl),
    hardSkills: sanitizeSkills(parsed.hardSkills, 15),
    softSkills: sanitizeSkills(parsed.softSkills, 5),
    education: sanitizeEducation(parsed.education),
    experience: sanitizeExperience(parsed.experience),
    projects: sanitizeProjects(parsed.projects),
    certifications: sanitizeCertifications(parsed.certifications),
    languages: sanitizeLanguages(parsed.languages),
  };
}

function clampInt(val: unknown, min: number, max: number): number {
  const n = typeof val === "number" ? Math.round(val) : 0;
  return Math.max(min, Math.min(max, n));
}

function validateExpLevel(
  val: unknown
): "ENTRY" | "MID" | "SENIOR" | "LEAD" | "EXECUTIVE" {
  const valid = ["ENTRY", "MID", "SENIOR", "LEAD", "EXECUTIVE"];
  return valid.includes(val as string)
    ? (val as "ENTRY" | "MID" | "SENIOR" | "LEAD" | "EXECUTIVE")
    : "ENTRY";
}

function sanitizeUrl(val: unknown): string | null {
  if (typeof val !== "string" || !val) return null;
  try {
    const url = new URL(val);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.href;
    }
  } catch {
    // not a valid URL
  }
  return null;
}

function sanitizeSkills(
  val: unknown,
  max: number
): { name: string; level: number }[] {
  if (!Array.isArray(val)) return [];
  return val
    .filter(
      (s) =>
        s &&
        typeof s.name === "string" &&
        s.name.trim().length > 0 &&
        typeof s.level === "number"
    )
    .slice(0, max)
    .map((s) => ({
      name: s.name.trim().slice(0, 50),
      level: clampInt(s.level, 1, 10),
    }));
}

function sanitizeEducation(val: unknown): ParsedResume["education"] {
  if (!Array.isArray(val)) return [];
  return val
    .filter((e) => e && typeof e.degree === "string" && typeof e.institution === "string")
    .slice(0, 10)
    .map((e) => ({
      degree: String(e.degree).slice(0, 100),
      institution: String(e.institution).slice(0, 200),
      fieldOfStudy: typeof e.fieldOfStudy === "string" ? e.fieldOfStudy.slice(0, 100) : "",
      startYear: typeof e.startYear === "number" ? e.startYear : null,
      endYear: typeof e.endYear === "number" ? e.endYear : null,
      grade: typeof e.grade === "string" ? e.grade.slice(0, 50) : null,
    }));
}

function sanitizeExperience(val: unknown): ParsedResume["experience"] {
  if (!Array.isArray(val)) return [];
  return val
    .filter((e) => e && typeof e.title === "string" && typeof e.company === "string")
    .slice(0, 20)
    .map((e) => ({
      title: String(e.title).slice(0, 100),
      company: String(e.company).slice(0, 200),
      location: typeof e.location === "string" ? e.location.slice(0, 100) : null,
      startDate: typeof e.startDate === "string" ? e.startDate.slice(0, 30) : null,
      endDate: typeof e.endDate === "string" ? e.endDate.slice(0, 30) : null,
      current: e.current === true,
      description: typeof e.description === "string" ? e.description.slice(0, 2000) : "",
    }));
}

function sanitizeProjects(val: unknown): ParsedResume["projects"] {
  if (!Array.isArray(val)) return [];
  return val
    .filter((p) => p && typeof p.name === "string")
    .slice(0, 15)
    .map((p) => ({
      name: String(p.name).slice(0, 100),
      description: typeof p.description === "string" ? p.description.slice(0, 1000) : "",
      techStack: Array.isArray(p.techStack) ? p.techStack.filter((t: unknown) => typeof t === "string").slice(0, 10).map((t: string) => t.slice(0, 50)) : [],
      url: sanitizeUrl(p.url),
      repoUrl: sanitizeUrl(p.repoUrl),
    }));
}

function sanitizeCertifications(val: unknown): ParsedResume["certifications"] {
  if (!Array.isArray(val)) return [];
  return val
    .filter((c) => c && typeof c.name === "string")
    .slice(0, 20)
    .map((c) => ({
      name: String(c.name).slice(0, 200),
      issuer: typeof c.issuer === "string" ? c.issuer.slice(0, 200) : "",
      date: typeof c.date === "string" ? c.date.slice(0, 30) : null,
      url: sanitizeUrl(c.url),
    }));
}

function sanitizeLanguages(val: unknown): ParsedResume["languages"] {
  if (!Array.isArray(val)) return [];
  return val
    .filter((l) => l && typeof l.language === "string")
    .slice(0, 20)
    .map((l) => ({
      language: String(l.language).slice(0, 50),
      proficiency: typeof l.proficiency === "string" ? l.proficiency.slice(0, 30) : "Intermediate",
    }));
}
