"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/shared/AuthProvider";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  DollarSign,
  Clock,
  Briefcase,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { formatSalary, timeAgo, getScoreColor } from "@/lib/utils";

interface JobRequirement {
  id: string;
  skillName: string;
  minLevel: number;
  weight: number;
  isMandatory: boolean;
  category: string;
}

interface JobDetail {
  id: string;
  title: string;
  description: string;
  location: string | null;
  jobType?: string;
  salaryMin: number | null;
  salaryMax: number | null;
  experienceLevel: string;
  requiredYears?: number;
  status: string;
  requirements: JobRequirement[];
  createdAt: string;
  recruiterProfile?: {
    companyName: string;
    location: string | null;
    logoUrl?: string | null;
    website?: string | null;
  } | null;
  _count: { applications: number };
}

interface UserMatch {
  score: number;
  breakdown: Record<string, number>;
}

export default function JobDetailPage() {
  const params = useParams();
  const { user, role } = useAuth();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [match, setMatch] = useState<UserMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await fetch(`/api/jobs/${params.id}`);
        if (!res.ok) throw new Error("Job not found");
        const data = await res.json();
        setJob(data.data);
      } catch {
        setError("Failed to load job details.");
      } finally {
        setLoading(false);
      }
    };
    if (params.id) fetchJob();
  }, [params.id]);

  const handleApply = async () => {
    setApplying(true);
    try {
      const res = await fetch(`/api/jobs/${params.id}/apply`, {
        method: "POST",
      });
      if (res.ok) {
        setApplied(true);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to apply.");
      }
    } catch {
      setError("Failed to submit application.");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4 text-center">
        <p className="text-destructive mb-4">{error || "Job not found."}</p>
        <Button asChild variant="outline">
          <Link href="/candidate/jobs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
          </Link>
        </Button>
      </div>
    );
  }

  const hardSkillReqs = job.requirements.filter(
    (r) => r.category === "hard_skill",
  );
  const softSkillReqs = job.requirements.filter(
    (r) => r.category === "soft_skill",
  );
  const companyName =
    job.recruiterProfile?.companyName || "Company not specified";
  const applicantCount = job._count?.applications ?? 0;

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 space-y-6">
      {/* Back navigation */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/candidate/jobs">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Jobs
        </Link>
      </Button>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{job.title}</h1>
            <p className="text-lg text-muted-foreground mt-1">{companyName}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Badge
              variant={
                job.experienceLevel === "SENIOR"
                  ? "default"
                  : job.experienceLevel === "MID"
                    ? "secondary"
                    : "outline"
              }
            >
              {job.experienceLevel}
            </Badge>
            <Badge variant="outline">{job.jobType?.replace("_", " ")}</Badge>
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {job.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {job.location}
            </span>
          )}
          {(job.salaryMin || job.salaryMax) && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              {formatSalary(job.salaryMin ?? 0, job.salaryMax ?? 0)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Posted {timeAgo(job.createdAt)}
          </span>
          <span className="flex items-center gap-1">
            <Briefcase className="h-4 w-4" />
            {applicantCount} applicants
          </span>
        </div>

        {/* Match score if available */}
        {match && (
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Your Match Score</span>
              <span
                className={`text-2xl font-bold ${getScoreColor(match.score)}`}
              >
                {Math.round(match.score)}%
              </span>
            </div>
            <Progress value={match.score} className="h-2" />
          </div>
        )}

        {/* Apply button */}
        {role === "CANDIDATE" && (
          <div className="flex gap-3">
            {applied ? (
              <div className="flex items-center gap-2 text-success font-medium">
                <CheckCircle className="h-5 w-5" />
                Application submitted!
              </div>
            ) : (
              <Button onClick={handleApply} disabled={applying} size="lg">
                {applying ? "Submitting..." : "Apply Now"}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle>Job Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground whitespace-pre-line">
            {job.description}
          </p>
        </CardContent>
      </Card>

      {/* Requirements */}
      {hardSkillReqs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Technical Skills Required</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {hardSkillReqs.map((req) => (
                <div key={req.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">
                      {req.skillName}
                    </span>
                    {req.isMandatory && (
                      <Badge variant="destructive" className="text-xs">
                        Required
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>Min. Level {req.minLevel}/10</span>
                    <div className="w-24">
                      <Progress
                        value={(req.minLevel / 10) * 100}
                        className="h-1.5"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {softSkillReqs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Soft Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {softSkillReqs.map((req) => (
                <Badge key={req.id} variant="secondary">
                  {req.skillName} (Level {req.minLevel}+)
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
