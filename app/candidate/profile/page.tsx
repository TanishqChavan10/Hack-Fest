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
import { Plus, Trash2, CheckCircle2, Loader2, Github, Star, GitFork, Users, Code2, Sparkles } from "lucide-react";

const SkillSchema = z.object({
  name: z.string().min(1, "Skill name required"),
  level: z.preprocess(
    (v) => Number(v),
    z.number().int().min(1).max(10),
  ) as z.ZodType<number>,
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
  repos: { name: string; description: string | null; language: string | null; stars: number; url: string }[];
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
    },
  });

  const hardSkillsArray = useFieldArray({ control, name: "hardSkills" });
  const softSkillsArray = useFieldArray({ control, name: "softSkills" });
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
    try {
      const res = await fetch("/api/profile/github-sync", { method: "POST" });
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
        if (json.data.githubStats) setGithubStats(json.data.githubStats as GitHubStats);
        if (json.data.lastGithubSync) setLastGithubSync(json.data.lastGithubSync);
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

  async function onSubmit(data: ProfileForm) {
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                  <p className="text-2xl font-bold">{githubStats.publicRepos}</p>
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
              {githubStats.topLanguages && Object.keys(githubStats.topLanguages).length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Top Languages</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(githubStats.topLanguages)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 8)
                      .map(([lang]) => (
                        <Badge key={lang} variant="secondary">{lang}</Badge>
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
                          <span className="font-medium text-sm">{repo.name}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {repo.language && <Badge variant="outline" className="text-xs">{repo.language}</Badge>}
                            <span className="flex items-center gap-0.5"><Star className="h-3 w-3" />{repo.stars}</span>
                          </div>
                        </div>
                        {repo.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{repo.description}</p>
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
                const res = await fetch("/api/profile/embedding", { method: "POST" });
                const json = await res.json();
                setEmbeddingMsg(res.ok ? (json.message ?? "AI profile generated!") : (json.error ?? "Failed"));
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
