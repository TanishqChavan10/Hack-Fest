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
import { Tabs } from "@radix-ui/react-tabs";
import { Plus, Trash2, CheckCircle2, Loader2, Github } from "lucide-react";

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

export default function CandidateProfilePage() {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

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
      }
    } finally {
      setFetchLoading(false);
    }
  }, [setValue]);

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
                    title="Sync GitHub (Phase 2)"
                  >
                    <Github className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
        <div className="flex items-center gap-4">
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...
              </>
            ) : (
              "Save Profile"
            )}
          </Button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Profile saved!
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
