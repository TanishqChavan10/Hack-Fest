// ============================================================
// /types/index.d.ts
// Global TypeScript Interfaces for the Talent Matching Platform
// ============================================================

import { Role, JobStatus, ApplicationStatus, ExperienceLevel } from "@prisma/client";

// -------------------------------------------------------
// AUTH & USER
// -------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: Role;
}

// Supabase user_metadata typing helper
export interface SupabaseUserMetadata {
  name?: string;
  role?: Role;
  avatar_url?: string;
  full_name?: string;
}

// -------------------------------------------------------
// SKILL TYPES
// -------------------------------------------------------

export type SkillLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface SkillEntry {
  name: string;
  level: SkillLevel;
}

/** Used for JSON columns in DB */
export type SkillMap = Record<string, number>;

// -------------------------------------------------------
// CANDIDATE
// -------------------------------------------------------

export interface CandidateProfileData {
  id: string;
  userId: string;
  headline: string | null;
  bio: string | null;
  location: string | null;
  githubUsername: string | null;
  portfolioUrl: string | null;
  resumeUrl: string | null;
  experienceLevel: ExperienceLevel;
  yearsOfExp: number;
  isOpenToWork: boolean;
  hardSkills: SkillMap;
  softSkills: SkillMap;
  githubStats: GitHubStats | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GitHubStats {
  stars: number;
  topLanguages: Record<string, number>;
  recentActivity: string;
  publicRepos: number;
  followers: number;
}

// -------------------------------------------------------
// RECRUITER & JOB
// -------------------------------------------------------

export interface RecruiterProfileData {
  id: string;
  userId: string;
  companyName: string;
  companySize: string | null;
  industry: string | null;
  website: string | null;
  logoUrl: string | null;
  description: string | null;
  location: string | null;
  isVerified: boolean;
}

export interface JobData {
  id: string;
  recruiterId: string;
  title: string;
  description: string;
  location: string | null;
  isRemote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  experienceLevel: ExperienceLevel;
  status: JobStatus;
  categoryWeights: CategoryWeights;
  requirements: JobRequirementData[];
  createdAt: Date;
  updatedAt: Date;
  recruiterProfile?: RecruiterProfileData | null;
}

export interface JobRequirementData {
  id: string;
  jobId: string;
  skillName: string;
  minLevel: number;
  weight: number;
  isMandatory: boolean;
}

export interface CategoryWeights {
  technicalSkills: number;
  softSkills: number;
  experience: number;
}

// -------------------------------------------------------
// MATCHING
// -------------------------------------------------------

export interface MatchBreakdown {
  technical: number;
  softSkills: number;
  experience: number;
  overall: number;
}

export interface MatchData {
  id: string;
  jobId: string;
  candidateId: string;
  score: number;
  breakdown: MatchBreakdown;
  isShortlisted: boolean;
  isMandatoryPass: boolean;
  calculatedAt: Date;
}

export interface RankedCandidateResult {
  candidateId: string;
  score: number;
  breakdown: MatchBreakdown;
  isMandatoryPass: boolean;
  isShortlisted: boolean;
  candidate: CandidateProfileData & { user: { name: string | null; email: string | null; image: string | null } };
}

// -------------------------------------------------------
// FORMS (Zod-inferred, but typed here for reuse)
// -------------------------------------------------------

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: Role;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface CandidateProfileFormData {
  headline: string;
  bio: string;
  location: string;
  githubUsername: string;
  portfolioUrl: string;
  yearsOfExp: number;
  experienceLevel: ExperienceLevel;
  hardSkills: SkillEntry[];
  softSkills: SkillEntry[];
}

export interface JobPostFormData {
  title: string;
  description: string;
  location: string;
  isRemote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  experienceLevel: ExperienceLevel;
  requirements: Array<{
    skillName: string;
    minLevel: number;
    weight: number;
    isMandatory: boolean;
  }>;
  categoryWeights: CategoryWeights;
}

// -------------------------------------------------------
// API RESPONSE TYPES
// -------------------------------------------------------

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
