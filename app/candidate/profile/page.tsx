"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/shared/AuthProvider";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { SkillChart } from "@/components/charts/SkillChart";
import {
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  Github,
  Star,
  GitFork,
  Users,
  Code2,
  Sparkles,
  FileUp,
  Upload,
  GraduationCap,
  Briefcase,
  FolderGit2,
  Award,
  Globe,
} from "lucide-react";
import { useRef } from "react";

const SkillSchema = z.object({
  name: z.string().min(1, "Skill name required"),
  level: z.preprocess(
    (v) => Number(v),
    z.number().int().min(1).max(10),
  ) as z.ZodType<number>,
});

const EducationSchema = z.object({
  degree: z.string().min(1, "Degree required"),
  institution: z.string().min(1, "Institution required"),
  fieldOfStudy: z.string().optional().default(""),
  startYear: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().int().nullable(),
  ),
  endYear: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().int().nullable(),
  ),
  grade: z.string().optional().nullable(),
});

const ExperienceSchema = z.object({
  title: z.string().min(1, "Job title required"),
  company: z.string().min(1, "Company required"),
  location: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  current: z.boolean().optional().default(false),
  description: z.string().optional().default(""),
});

const ProjectSchema = z.object({
  name: z.string().min(1, "Project name required"),
  description: z.string().optional().default(""),
  techStack: z.string().optional().default(""),
  url: z.string().optional().nullable(),
  repoUrl: z.string().optional().nullable(),
});

const CertificationSchema = z.object({
  name: z.string().min(1, "Certification name required"),
  issuer: z.string().optional().default(""),
  date: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
});

const LanguageSchema = z.object({
  language: z.string().min(1, "Language required"),
  proficiency: z.string().optional().default("Intermediate"),
});

const ProfileSchema = z.object({
  headline: z.string().max(200).optional(),
  bio: z.string().max(2000).optional(),
  location: z.string().optional(),
  githubUsername: z.string().optional(),
  portfolioUrl: z.string().optional(),
  yearsOfExp: z.preprocess(
    (v) => Number(v),
    z.number().int().min(0).max(50),
  ) as z.ZodType<number>,
  experienceLevel: z.enum(["ENTRY", "MID", "SENIOR", "LEAD", "EXECUTIVE"]),
  isOpenToWork: z.boolean().optional(),
  hardSkills: z.array(SkillSchema),
  softSkills: z.array(SkillSchema),
  education: z.array(EducationSchema),
  experience: z.array(ExperienceSchema),
  projects: z.array(ProjectSchema),
  certifications: z.array(CertificationSchema),
  languages: z.array(LanguageSchema),
});

type ProfileForm = z.infer<typeof ProfileSchema>;

// Convert flat SkillMap object to array form for react-hook-form
function mapToArray(
  map: Record<string, number>,
): { name: string; level: number }[] {
  return Object.entries(map).map(([name, level]) => ({ name, level }));
}

// GitHub stats shape
interface GitHubStats {
  publicRepos: number;
  followers: number;
  following: number;
  totalStars: number;
  topLanguages: Record<string, number>;
  repos: {
    name: string;
    description: string | null;
    language: string | null;
    stars: number;
    url: string;
  }[];
}

export default function CandidateProfilePage() {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [githubStats, setGithubStats] = useState<GitHubStats | null>(null);
  const [lastGithubSync, setLastGithubSync] = useState<string | null>(null);
  const [embedding, setEmbedding] = useState(false);
  const [embeddingMsg, setEmbeddingMsg] = useState<string | null>(null);
  const [resumeParsing, setResumeParsing] = useState(false);
  const [resumeMsg, setResumeMsg] = useState<string | null>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<ProfileForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(ProfileSchema) as any,
    defaultValues: {
      yearsOfExp: 0,
      experienceLevel: "ENTRY",
      hardSkills: [{ name: "", level: 5 }],
      softSkills: [{ name: "", level: 5 }],
      education: [],
      experience: [],
      projects: [],
      certifications: [],
      languages: [],
    },
  });

  const hardSkillsArray = useFieldArray({ control, name: "hardSkills" });
  const softSkillsArray = useFieldArray({ control, name: "softSkills" });
  const educationArray = useFieldArray({ control, name: "education" });
  const experienceArray = useFieldArray({ control, name: "experience" });
  const projectsArray = useFieldArray({ control, name: "projects" });
  const certificationsArray = useFieldArray({
    control,
    name: "certifications",
  });
  const languagesArray = useFieldArray({ control, name: "languages" });
  const watchedHardSkills = watch("hardSkills");

  // Fetch existing profile on mount
  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) return;
      const { data } = await res.json();
      if (data) {
        setValue("headline", data.headline ?? "");
        setValue("bio", data.bio ?? "");
        setValue("location", data.location ?? "");
        setValue("githubUsername", data.githubUsername ?? "");
        setValue("portfolioUrl", data.portfolioUrl ?? "");
        setValue("yearsOfExp", data.yearsOfExp ?? 0);
        setValue("experienceLevel", data.experienceLevel ?? "ENTRY");
        setValue("isOpenToWork", data.isOpenToWork ?? true);
        const hard = mapToArray(data.hardSkills as Record<string, number>);
        const soft = mapToArray(data.softSkills as Record<string, number>);
        if (hard.length > 0) setValue("hardSkills", hard);
        if (soft.length > 0) setValue("softSkills", soft);
        // New sections
        if (Array.isArray(data.education) && data.education.length > 0)
          setValue("education", data.education);
        if (Array.isArray(data.experience) && data.experience.length > 0)
          setValue("experience", data.experience);
        if (Array.isArray(data.projects) && data.projects.length > 0)
          setValue(
            "projects",
            data.projects.map((p: { techStack?: string[] }) => ({
              ...p,
              techStack: Array.isArray(p.techStack)
                ? p.techStack.join(", ")
                : "",
            })),
          );
        if (
          Array.isArray(data.certifications) &&
          data.certifications.length > 0
        )
          setValue("certifications", data.certifications);
        if (Array.isArray(data.languages) && data.languages.length > 0)
          setValue("languages", data.languages);
        // GitHub data
        if (data.githubStats) setGithubStats(data.githubStats as GitHubStats);
        if (data.lastGithubSync) setLastGithubSync(data.lastGithubSync);
      }
    } finally {
      setFetchLoading(false);
    }
  }, [setValue]);

  // GitHub Sync handler
  async function handleGithubSync() {
    setSyncing(true);
    setSyncMessage(null);
    const githubUsername = watch("githubUsername");
    try {
      const res = await fetch("/api/profile/github-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubUsername }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSyncMessage(json.error ?? "Sync failed");
        return;
      }
      setSyncMessage(json.message ?? "GitHub synced!");
      // Refresh form with updated data
      if (json.data) {
        const hard = mapToArray(json.data.hardSkills as Record<string, number>);
        if (hard.length > 0) setValue("hardSkills", hard);
        if (json.data.githubStats)
          setGithubStats(json.data.githubStats as GitHubStats);
        if (json.data.lastGithubSync)
          setLastGithubSync(json.data.lastGithubSync);
      }
    } catch {
      setSyncMessage("Network error — try again");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Resume upload & parse handler
  async function handleResumeParse(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeParsing(true);
    setResumeMsg(null);
    try {
      const formData = new FormData();
      formData.append("resume", file);
      const res = await fetch("/api/profile/resume-parse", {
        method: "POST",
        body: formData,
      });
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        console.error("Non-JSON response:", text.substring(0, 500));
        setResumeMsg("Server error — please try again");
        return;
      }
      if (!res.ok) {
        setResumeMsg(json.error ?? "Failed to parse resume");
        return;
      }
      // Auto-fill form fields from parsed resume
      const d = json.data;
      if (d.headline) setValue("headline", d.headline);
      if (d.bio) setValue("bio", d.bio);
      if (d.location) setValue("location", d.location);
      if (d.yearsOfExp != null) setValue("yearsOfExp", d.yearsOfExp);
      if (d.experienceLevel) setValue("experienceLevel", d.experienceLevel);
      if (d.githubUsername) setValue("githubUsername", d.githubUsername);
      if (d.portfolioUrl) setValue("portfolioUrl", d.portfolioUrl);
      if (d.hardSkills?.length > 0) setValue("hardSkills", d.hardSkills);
      if (d.softSkills?.length > 0) setValue("softSkills", d.softSkills);
      if (d.education?.length > 0) setValue("education", d.education);
      if (d.experience?.length > 0) setValue("experience", d.experience);
      if (d.projects?.length > 0)
        setValue(
          "projects",
          d.projects.map((p: { techStack?: string[] }) => ({
            ...p,
            techStack: Array.isArray(p.techStack) ? p.techStack.join(", ") : "",
          })),
        );
      if (d.certifications?.length > 0)
        setValue("certifications", d.certifications);
      if (d.languages?.length > 0) setValue("languages", d.languages);
      setResumeMsg(json.message ?? "Resume parsed successfully!");
    } catch (err) {
      console.error("Resume parse error:", err);
      setResumeMsg(
        err instanceof Error ? err.message : "Network error — try again",
      );
    } finally {
      setResumeParsing(false);
      // Reset file input so the same file can be re-uploaded
      if (resumeInputRef.current) resumeInputRef.current.value = "";
    }
  }

  async function onSubmit(data: ProfileForm) {
    setLoading(true);
    setSaved(false);
    try {
      // Convert techStack from comma-separated string to array for API
      const payload = {
        ...data,
        projects: data.projects.map((p) => ({
          ...p,
          techStack:
            typeof p.techStack === "string"
              ? p.techStack
                  .split(",")
                  .map((t: string) => t.trim())
                  .filter(Boolean)
              : [],
        })),
      };
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) setSaved(true);
    } finally {
      setLoading(false);
    }
  }

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Build skillMap for chart
  const skillMapForChart = Object.fromEntries(
    (watchedHardSkills ?? [])
      .filter((s) => s.name)
      .map((s) => [s.name, s.level]),
  );

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground mt-1">
          Keep your skills updated to get better job matches.
        </p>
      </div>
      {/* Resume Import Card */}
      <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" /> Quick Fill with Resume
          </CardTitle>
          <CardDescription>
            Upload your resume (PDF or TXT) and we&apos;ll auto-fill your
            profile using AI.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <input
              ref={resumeInputRef}
              type="file"
              accept=".pdf,.txt,.md,application/pdf,text/plain"
              onChange={handleResumeParse}
              className="hidden"
              id="resume-upload"
              disabled={resumeParsing}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => resumeInputRef.current?.click()}
              disabled={resumeParsing}
              className="gap-2"
            >
              {resumeParsing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Parsing Resume...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" /> Upload Resume
                </>
              )}
            </Button>
            {resumeMsg && (
              <p
                className={`text-sm ${
                  resumeMsg.includes("skill") || resumeMsg.includes("success")
                    ? "text-green-600"
                    : "text-destructive"
                }`}
              >
                {resumeMsg}
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Supports PDF and text files up to 5 MB. Your data is parsed with AI
            and never stored as raw text.
          </p>
        </CardContent>
      </Card>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Your public facing profile details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Professional Headline</Label>
                <Input
                  placeholder="Full Stack Engineer | React | Node.js"
                  {...register("headline")}
                />
                {errors.headline && (
                  <p className="text-xs text-destructive">
                    {errors.headline.message}
                  </p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Bio</Label>
                <Textarea
                  rows={4}
                  placeholder="Tell recruiters about yourself, your projects, and what you're looking for..."
                  {...register("bio")}
                />
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  placeholder="San Francisco, CA"
                  {...register("location")}
                />
              </div>

              <div className="space-y-2">
                <Label>Years of Experience</Label>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  {...register("yearsOfExp")}
                />
              </div>

              <div className="space-y-2">
                <Label>Experience Level</Label>
                <Select
                  defaultValue="ENTRY"
                  onValueChange={(v) =>
                    setValue(
                      "experienceLevel",
                      v as ProfileForm["experienceLevel"],
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ENTRY">Entry (0–2 years)</SelectItem>
                    <SelectItem value="MID">Mid (2–5 years)</SelectItem>
                    <SelectItem value="SENIOR">Senior (5–10 years)</SelectItem>
                    <SelectItem value="LEAD">Lead (10+ years)</SelectItem>
                    <SelectItem value="EXECUTIVE">Executive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>GitHub Username</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="octocat"
                    {...register("githubUsername")}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Sync GitHub"
                    onClick={handleGithubSync}
                    disabled={syncing || !watch("githubUsername")}
                  >
                    {syncing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Github className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {syncMessage && (
                  <p className="text-xs text-muted-foreground">{syncMessage}</p>
                )}
                {lastGithubSync && (
                  <p className="text-xs text-muted-foreground">
                    Last synced: {new Date(lastGithubSync).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GitHub Stats */}
        {githubStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Github className="h-5 w-5" /> GitHub Stats
              </CardTitle>
              <CardDescription>
                Auto-synced from your public GitHub profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <Code2 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-2xl font-bold">
                    {githubStats.publicRepos}
                  </p>
                  <p className="text-xs text-muted-foreground">Repos</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <Star className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
                  <p className="text-2xl font-bold">{githubStats.totalStars}</p>
                  <p className="text-xs text-muted-foreground">Stars</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-2xl font-bold">{githubStats.followers}</p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <GitFork className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-2xl font-bold">{githubStats.following}</p>
                  <p className="text-xs text-muted-foreground">Following</p>
                </div>
              </div>
              {githubStats.topLanguages &&
                Object.keys(githubStats.topLanguages).length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Top Languages</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(githubStats.topLanguages)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 8)
                        .map(([lang]) => (
                          <Badge key={lang} variant="secondary">
                            {lang}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}
              {githubStats.repos && githubStats.repos.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Top Repositories</p>
                  <div className="space-y-2">
                    {githubStats.repos.map((repo) => (
                      <a
                        key={repo.name}
                        href={repo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">
                            {repo.name}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {repo.language && (
                              <Badge variant="outline" className="text-xs">
                                {repo.language}
                              </Badge>
                            )}
                            <span className="flex items-center gap-0.5">
                              <Star className="h-3 w-3" />
                              {repo.stars}
                            </span>
                          </div>
                        </div>
                        {repo.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {repo.description}
                          </p>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Hard Skills */}
        <Card>
          <CardHeader>
            <CardTitle>Technical Skills</CardTitle>
            <CardDescription>
              Rate your proficiency from 1 (beginner) to 10 (expert). Be honest
              — the algorithm rewards accuracy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hardSkillsArray.fields.map((field, i) => (
              <div key={field.id} className="flex gap-3 items-center">
                <Input
                  placeholder="e.g. React, Python, Docker"
                  className="flex-1"
                  {...register(`hardSkills.${i}.name`)}
                />
                <div className="flex items-center gap-2 shrink-0">
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    className="w-16"
                    {...register(`hardSkills.${i}.level`)}
                  />
                  <span className="text-xs text-muted-foreground">/10</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => hardSkillsArray.remove(i)}
                  disabled={hardSkillsArray.fields.length === 1}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => hardSkillsArray.append({ name: "", level: 5 })}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add Skill
            </Button>

            {/* Live chart preview */}
            {Object.keys(skillMapForChart).length > 0 && (
              <div className="mt-4 border rounded-lg p-4">
                <p className="text-sm font-medium mb-3 text-muted-foreground">
                  Skill Preview
                </p>
                <SkillChart skills={skillMapForChart} height={200} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Soft Skills */}
        <Card>
          <CardHeader>
            <CardTitle>Soft Skills</CardTitle>
            <CardDescription>
              Communication, teamwork, leadership, etc.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {softSkillsArray.fields.map((field, i) => (
              <div key={field.id} className="flex gap-3 items-center">
                <Input
                  placeholder="e.g. Communication, Leadership, Problem Solving"
                  className="flex-1"
                  {...register(`softSkills.${i}.name`)}
                />
                <div className="flex items-center gap-2 shrink-0">
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    className="w-16"
                    {...register(`softSkills.${i}.level`)}
                  />
                  <span className="text-xs text-muted-foreground">/10</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => softSkillsArray.remove(i)}
                  disabled={softSkillsArray.fields.length === 1}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => softSkillsArray.append({ name: "", level: 5 })}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add Soft Skill
            </Button>
          </CardContent>
        </Card>

        {/* Education */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" /> Education
            </CardTitle>
            <CardDescription>
              Degrees, diplomas, and academic qualifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {educationArray.fields.map((field, i) => (
              <div
                key={field.id}
                className="border rounded-lg p-4 space-y-3 relative"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => educationArray.remove(i)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Degree</Label>
                    <Input
                      placeholder="B.Tech / M.S. / B.Sc."
                      {...register(`education.${i}.degree`)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Institution</Label>
                    <Input
                      placeholder="University name"
                      {...register(`education.${i}.institution`)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Field of Study</Label>
                    <Input
                      placeholder="Computer Science"
                      {...register(`education.${i}.fieldOfStudy`)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Grade / CGPA</Label>
                    <Input
                      placeholder="8.5 CGPA / 3.8 GPA"
                      {...register(`education.${i}.grade`)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Start Year</Label>
                    <Input
                      type="number"
                      placeholder="2020"
                      {...register(`education.${i}.startYear`)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>End Year</Label>
                    <Input
                      type="number"
                      placeholder="2024"
                      {...register(`education.${i}.endYear`)}
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                educationArray.append({
                  degree: "",
                  institution: "",
                  fieldOfStudy: "",
                  startYear: null,
                  endYear: null,
                  grade: null,
                })
              }
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add Education
            </Button>
          </CardContent>
        </Card>

        {/* Work Experience */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" /> Work Experience
            </CardTitle>
            <CardDescription>
              Professional roles and internships
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {experienceArray.fields.map((field, i) => (
              <div
                key={field.id}
                className="border rounded-lg p-4 space-y-3 relative"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => experienceArray.remove(i)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Job Title</Label>
                    <Input
                      placeholder="Software Engineer"
                      {...register(`experience.${i}.title`)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Company</Label>
                    <Input
                      placeholder="Company name"
                      {...register(`experience.${i}.company`)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Location</Label>
                    <Input
                      placeholder="City, Country"
                      {...register(`experience.${i}.location`)}
                    />
                  </div>
                  <div className="flex items-center gap-4 pt-6">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        {...register(`experience.${i}.current`)}
                        className="rounded"
                      />
                      Currently working here
                    </label>
                  </div>
                  <div className="space-y-1">
                    <Label>Start Date</Label>
                    <Input
                      placeholder="Jan 2023"
                      {...register(`experience.${i}.startDate`)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>End Date</Label>
                    <Input
                      placeholder="Present"
                      {...register(`experience.${i}.endDate`)}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      rows={3}
                      placeholder="Key responsibilities and achievements..."
                      {...register(`experience.${i}.description`)}
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                experienceArray.append({
                  title: "",
                  company: "",
                  location: null,
                  startDate: null,
                  endDate: null,
                  current: false,
                  description: "",
                })
              }
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add Experience
            </Button>
          </CardContent>
        </Card>

        {/* Projects */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderGit2 className="h-5 w-5" /> Projects
            </CardTitle>
            <CardDescription>Notable projects and side work</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {projectsArray.fields.map((field, i) => (
              <div
                key={field.id}
                className="border rounded-lg p-4 space-y-3 relative"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => projectsArray.remove(i)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Project Name</Label>
                    <Input
                      placeholder="My Awesome Project"
                      {...register(`projects.${i}.name`)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Tech Stack</Label>
                    <Input
                      placeholder="React, Node.js, PostgreSQL"
                      {...register(`projects.${i}.techStack`)}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      rows={2}
                      placeholder="What does this project do?"
                      {...register(`projects.${i}.description`)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Live URL</Label>
                    <Input
                      placeholder="https://myproject.com"
                      {...register(`projects.${i}.url`)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Repository URL</Label>
                    <Input
                      placeholder="https://github.com/user/repo"
                      {...register(`projects.${i}.repoUrl`)}
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                projectsArray.append({
                  name: "",
                  description: "",
                  techStack: "",
                  url: null,
                  repoUrl: null,
                })
              }
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add Project
            </Button>
          </CardContent>
        </Card>

        {/* Certifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" /> Certifications
            </CardTitle>
            <CardDescription>
              Professional certifications, courses, and awards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {certificationsArray.fields.map((field, i) => (
              <div
                key={field.id}
                className="flex flex-col sm:flex-row gap-3 items-start border rounded-lg p-4 relative"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => certificationsArray.remove(i)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 w-full">
                  <div className="space-y-1">
                    <Label>Certification Name</Label>
                    <Input
                      placeholder="AWS Certified Developer"
                      {...register(`certifications.${i}.name`)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Issuer</Label>
                    <Input
                      placeholder="Amazon / Coursera / Google"
                      {...register(`certifications.${i}.issuer`)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Date</Label>
                    <Input
                      placeholder="2024"
                      {...register(`certifications.${i}.date`)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Credential URL</Label>
                    <Input
                      placeholder="https://..."
                      {...register(`certifications.${i}.url`)}
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                certificationsArray.append({
                  name: "",
                  issuer: "",
                  date: null,
                  url: null,
                })
              }
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add Certification
            </Button>
          </CardContent>
        </Card>

        {/* Languages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" /> Languages
            </CardTitle>
            <CardDescription>Languages you speak or write</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {languagesArray.fields.map((field, i) => (
              <div key={field.id} className="flex gap-3 items-center">
                <Input
                  placeholder="e.g. English, Hindi, Spanish"
                  className="flex-1"
                  {...register(`languages.${i}.language`)}
                />
                <Select
                  defaultValue="Intermediate"
                  onValueChange={(v) =>
                    setValue(`languages.${i}.proficiency`, v)
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Native">Native</SelectItem>
                    <SelectItem value="Fluent">Fluent</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Basic">Basic</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => languagesArray.remove(i)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                languagesArray.append({
                  language: "",
                  proficiency: "Intermediate",
                })
              }
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add Language
            </Button>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...
              </>
            ) : (
              "Save Profile"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={embedding}
            onClick={async () => {
              setEmbedding(true);
              setEmbeddingMsg(null);
              try {
                const res = await fetch("/api/profile/embedding", {
                  method: "POST",
                });
                const json = await res.json();
                setEmbeddingMsg(
                  res.ok
                    ? (json.message ?? "AI profile generated!")
                    : (json.error ?? "Failed"),
                );
              } catch {
                setEmbeddingMsg("Network error — try again");
              } finally {
                setEmbedding(false);
              }
            }}
            className="gap-1.5"
          >
            {embedding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate AI Profile
          </Button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Profile saved!
            </span>
          )}
          {embeddingMsg && (
            <span className="text-sm text-muted-foreground">
              {embeddingMsg}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
