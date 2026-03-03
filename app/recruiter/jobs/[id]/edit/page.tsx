"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Slider } from "@/components/ui/Slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

const requirementSchema = z.object({
  skillName: z.string().min(1, "Skill name is required"),
  minLevel: z.number().min(1).max(10),
  weight: z.number().min(0).max(1),
  isMandatory: z.boolean(),
  category: z.enum(["hard_skill", "soft_skill"]),
});

const jobEditSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  location: z.string().optional(),
  jobType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"]),
  experienceLevel: z.enum(["JUNIOR", "MID", "SENIOR", "LEAD"]),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  requiredYears: z.number().min(0).max(30),
  categoryWeights: z.object({
    hardSkill: z.number().min(0).max(1),
    softSkill: z.number().min(0).max(1),
    experience: z.number().min(0).max(1),
  }),
  requirements: z.array(requirementSchema),
});

type JobEditFormData = z.infer<typeof jobEditSchema>;

export default function EditJobPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<JobEditFormData>({
    resolver: zodResolver(jobEditSchema),
    defaultValues: {
      jobType: "FULL_TIME",
      experienceLevel: "MID",
      requiredYears: 2,
      categoryWeights: { hardSkill: 0.5, softSkill: 0.3, experience: 0.2 },
      requirements: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "requirements",
  });
  const weights = watch("categoryWeights");

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await fetch(`/api/jobs/${params.id}`);
        if (!res.ok) throw new Error("Failed to fetch job");
        const data = await res.json();
        const job = data.data;

        // Reconstruct categoryWeights from stored values or use defaults
        reset({
          title: job.title,
          description: job.description,
          location: job.location || "",
          jobType: job.jobType,
          experienceLevel: job.experienceLevel,
          salaryMin: job.salaryMin || undefined,
          salaryMax: job.salaryMax || undefined,
          requiredYears: job.requiredYears || 0,
          categoryWeights: job.categoryWeights || {
            hardSkill: 0.5,
            softSkill: 0.3,
            experience: 0.2,
          },
          requirements: (job.requirements || []).map(
            (r: {
              skillName: string;
              minLevel: number;
              weight: number;
              isMandatory: boolean;
              category: string;
            }) => ({
              skillName: r.skillName,
              minLevel: r.minLevel,
              weight: r.weight,
              isMandatory: r.isMandatory,
              category: r.category,
            }),
          ),
        });
      } catch {
        setError("Failed to load job data.");
      } finally {
        setLoading(false);
      }
    };
    if (params.id) fetchJob();
  }, [params.id, reset]);

  const onSubmit = async (data: JobEditFormData) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/jobs/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update job");
      router.push(`/recruiter/jobs/${params.id}/matches`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const addRequirement = (category: "hard_skill" | "soft_skill") => {
    append({
      skillName: "",
      minLevel: 5,
      weight: 0.5,
      isMandatory: false,
      category,
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-3xl py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4 space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/recruiter/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold">Edit Job Posting</h1>
        <p className="text-muted-foreground">
          Update the details for this position.
        </p>
      </div>

      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Job Title</Label>
              <Input id="title" {...register("title")} className="mt-1" />
              {errors.title && (
                <p className="text-xs text-destructive mt-1">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={5}
                {...register("description")}
                className="mt-1"
              />
              {errors.description && (
                <p className="text-xs text-destructive mt-1">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  {...register("location")}
                  placeholder="Remote / City"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="requiredYears">Years of Experience</Label>
                <Input
                  id="requiredYears"
                  type="number"
                  min={0}
                  max={30}
                  {...register("requiredYears", { valueAsNumber: true })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Job Type</Label>
                <Select
                  defaultValue={watch("jobType")}
                  onValueChange={(v) =>
                    setValue("jobType", v as JobEditFormData["jobType"])
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FULL_TIME">Full Time</SelectItem>
                    <SelectItem value="PART_TIME">Part Time</SelectItem>
                    <SelectItem value="CONTRACT">Contract</SelectItem>
                    <SelectItem value="INTERNSHIP">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Experience Level</Label>
                <Select
                  defaultValue={watch("experienceLevel")}
                  onValueChange={(v) =>
                    setValue(
                      "experienceLevel",
                      v as JobEditFormData["experienceLevel"],
                    )
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JUNIOR">Junior</SelectItem>
                    <SelectItem value="MID">Mid</SelectItem>
                    <SelectItem value="SENIOR">Senior</SelectItem>
                    <SelectItem value="LEAD">Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="salaryMin">Salary Min ($)</Label>
                <Input
                  id="salaryMin"
                  type="number"
                  {...register("salaryMin", { valueAsNumber: true })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="salaryMax">Salary Max ($)</Label>
                <Input
                  id="salaryMax"
                  type="number"
                  {...register("salaryMax", { valueAsNumber: true })}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Weights */}
        <Card>
          <CardHeader>
            <CardTitle>Scoring Weights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {(["hardSkill", "softSkill", "experience"] as const).map((key) => (
              <div key={key}>
                <div className="flex justify-between mb-2">
                  <Label>
                    {key === "hardSkill"
                      ? "Technical Skills"
                      : key === "softSkill"
                        ? "Soft Skills"
                        : "Experience"}
                  </Label>
                  <span className="text-sm font-medium">
                    {Math.round(weights[key] * 100)}%
                  </span>
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.05}
                  value={[weights[key]]}
                  onValueChange={([v]) => setValue(`categoryWeights.${key}`, v)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Skill Requirements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Skill Requirements</CardTitle>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => addRequirement("hard_skill")}
              >
                <Plus className="mr-1 h-4 w-4" />
                Technical Skill
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => addRequirement("soft_skill")}
              >
                <Plus className="mr-1 h-4 w-4" />
                Soft Skill
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No requirements added yet. Add skills above.
              </p>
            )}
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase">
                    {watch(`requirements.${index}.category`) === "hard_skill"
                      ? "Technical Skill"
                      : "Soft Skill"}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    className="h-7 w-7"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Skill Name</Label>
                    <Input
                      {...register(`requirements.${index}.skillName`)}
                      placeholder="e.g. React"
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">
                      Min Level: {watch(`requirements.${index}.minLevel`)}
                    </Label>
                    <Slider
                      min={1}
                      max={10}
                      step={1}
                      value={[watch(`requirements.${index}.minLevel`)]}
                      onValueChange={([v]) =>
                        setValue(`requirements.${index}.minLevel`, v)
                      }
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      {...register(`requirements.${index}.isMandatory`)}
                      className="rounded border-input"
                    />
                    Mandatory (hard fail if not met)
                  </label>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
