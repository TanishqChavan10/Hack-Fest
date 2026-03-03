"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Slider } from "@/components/ui/Slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Plus, Trash2, Loader2, CheckCircle2 } from "lucide-react";

const RequirementSchema = z.object({
  skillName: z.string().min(1, "Skill name required"),
  minLevel: z.preprocess(
    (v) => Number(v),
    z.number().int().min(1).max(10),
  ) as z.ZodType<number>,
  weight: z.number().min(0.1).max(1),
  isMandatory: z.boolean(),
});

const JobPostSchema = z.object({
  title: z.string().min(3, "Title too short"),
  description: z.string().min(20, "Description too short"),
  location: z.string().optional(),
  isRemote: z.boolean().default(false),
  salaryMin: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().optional(),
  ) as z.ZodType<number | undefined>,
  salaryMax: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().optional(),
  ) as z.ZodType<number | undefined>,
  experienceLevel: z.enum(["ENTRY", "MID", "SENIOR", "LEAD", "EXECUTIVE"]),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  requirements: z
    .array(RequirementSchema)
    .min(1, "Add at least one skill requirement"),
  categoryWeights: z.object({
    technicalSkills: z.number().min(0).max(1),
    softSkills: z.number().min(0).max(1),
    experience: z.number().min(0).max(1),
  }),
});

type JobPostForm = z.infer<typeof JobPostSchema>;

const DEFAULT_WEIGHTS = {
  technicalSkills: 0.6,
  softSkills: 0.2,
  experience: 0.2,
};

export default function NewJobPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<JobPostForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(JobPostSchema) as any,
    defaultValues: {
      status: "DRAFT",
      experienceLevel: "MID",
      isRemote: false,
      requirements: [
        { skillName: "", minLevel: 7, weight: 0.5, isMandatory: false },
      ],
      categoryWeights: DEFAULT_WEIGHTS,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "requirements",
  });
  const categoryWeights = watch("categoryWeights");

  async function onSubmit(data: JobPostForm) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(JSON.stringify(json.error));
        return;
      }
      router.push(`/recruiter/jobs/${json.data.id}/matches`);
    } finally {
      setLoading(false);
    }
  }

  const totalWeight =
    categoryWeights.technicalSkills +
    categoryWeights.softSkills +
    categoryWeights.experience;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Post a New Job</h1>
        <p className="text-muted-foreground mt-1">
          Define skill requirements and importance weights for precise candidate
          matching.
        </p>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Basic Details */}
        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Job Title *</Label>
              <Input
                placeholder="Senior React Engineer"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-xs text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Job Description *</Label>
              <Textarea
                rows={5}
                placeholder="Describe the role, responsibilities, and what you're looking for..."
                {...register("description")}
              />
              {errors.description && (
                <p className="text-xs text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Experience Level</Label>
                <Select
                  defaultValue="MID"
                  onValueChange={(v) =>
                    setValue(
                      "experienceLevel",
                      v as JobPostForm["experienceLevel"],
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ENTRY">Entry</SelectItem>
                    <SelectItem value="MID">Mid</SelectItem>
                    <SelectItem value="SENIOR">Senior</SelectItem>
                    <SelectItem value="LEAD">Lead</SelectItem>
                    <SelectItem value="EXECUTIVE">Executive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  defaultValue="DRAFT"
                  onValueChange={(v) =>
                    setValue("status", v as "DRAFT" | "PUBLISHED")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Save as Draft</SelectItem>
                    <SelectItem value="PUBLISHED">Publish Now</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  placeholder="San Francisco, CA"
                  {...register("location")}
                />
              </div>

              <div className="space-y-2">
                <Label>Salary Min (USD)</Label>
                <Input
                  type="number"
                  placeholder="80000"
                  {...register("salaryMin")}
                />
              </div>

              <div className="space-y-2">
                <Label>Salary Max (USD)</Label>
                <Input
                  type="number"
                  placeholder="120000"
                  {...register("salaryMax")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Weights */}
        <Card>
          <CardHeader>
            <CardTitle>Scoring Category Weights</CardTitle>
            <CardDescription>
              Set how much each category contributes to the final match score.
              Total:{" "}
              <span
                className={
                  totalWeight !== 1
                    ? "text-destructive font-bold"
                    : "text-green-600 font-bold"
                }
              >
                {Math.round(totalWeight * 100)}%
              </span>{" "}
              (must be 100%)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <WeightSlider
              label="Technical Skills"
              value={categoryWeights.technicalSkills}
              onChange={(v) => setValue("categoryWeights.technicalSkills", v)}
            />
            <WeightSlider
              label="Soft Skills"
              value={categoryWeights.softSkills}
              onChange={(v) => setValue("categoryWeights.softSkills", v)}
            />
            <WeightSlider
              label="Experience"
              value={categoryWeights.experience}
              onChange={(v) => setValue("categoryWeights.experience", v)}
            />
          </CardContent>
        </Card>

        {/* Skills Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Skill Requirements</CardTitle>
            <CardDescription>
              Each skill has a minimum level (1-10) and a weight (relative
              importance). Mark mandatory skills — candidates with 0 on these
              won't appear.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {errors.requirements?.root && (
              <p className="text-xs text-destructive">
                {errors.requirements.root.message}
              </p>
            )}
            {fields.map((field, i) => (
              <div key={field.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex gap-3 items-center">
                  <Input
                    className="flex-1"
                    placeholder="Skill name (e.g. react, python, docker)"
                    {...register(`requirements.${i}.skillName`)}
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <Label className="text-xs whitespace-nowrap">
                      Min Level
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      className="w-16"
                      {...register(`requirements.${i}.minLevel`)}
                    />
                    <span className="text-xs text-muted-foreground">/10</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(i)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">
                      Weight:{" "}
                      <span className="font-bold">
                        {Math.round(watch(`requirements.${i}.weight`) * 100)}%
                      </span>
                    </Label>
                    <Controller
                      control={control}
                      name={`requirements.${i}.weight`}
                      render={({ field }) => (
                        <Slider
                          min={0.1}
                          max={1.0}
                          step={0.05}
                          value={[field.value]}
                          onValueChange={([v]) => field.onChange(v)}
                        />
                      )}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      className="rounded border-input"
                      {...register(`requirements.${i}.isMandatory`)}
                    />
                    Mandatory
                  </label>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() =>
                append({
                  skillName: "",
                  minLevel: 5,
                  weight: 0.5,
                  isMandatory: false,
                })
              }
            >
              <Plus className="h-4 w-4" /> Add Skill Requirement
            </Button>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-3">
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...
              </>
            ) : (
              "Save Job"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => {
              setValue("status", "PUBLISHED"); // eslint-disable-next-line @typescript-eslint/no-explicit-any
              handleSubmit(onSubmit as any)();
            }}
            disabled={loading}
          >
            Publish &amp; Match
          </Button>
        </div>
      </form>
    </div>
  );
}

function WeightSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <Label>{label}</Label>
        <Badge variant="secondary">{Math.round(value * 100)}%</Badge>
      </div>
      <Slider
        min={0}
        max={1}
        step={0.05}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}
