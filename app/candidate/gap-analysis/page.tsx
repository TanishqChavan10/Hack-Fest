"use client";

import { useState, useEffect } from "react";
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
import { SkillGapChart } from "@/components/charts/SkillChart";
import {
  Loader2,
  Target,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
} from "lucide-react";

// -------------------------------------------------------
// Types
// -------------------------------------------------------
interface JobOption {
  id: string;
  title: string;
  recruiterProfile?: { companyName: string } | null;
}

interface SkillGap {
  skill: string;
  candidateLevel: number;
  requiredLevel: number;
  gap: number;
  isMandatory: boolean;
  weight: number;
  suggestion: string;
}

interface GapAnalysisData {
  jobId: string;
  jobTitle: string;
  companyName: string | null;
  matchScore: number;
  breakdown: {
    technical: number;
    softSkills: number;
    experience: number;
    overall: number;
  };
  skills: SkillGap[];
}

// -------------------------------------------------------
// Page Component
// -------------------------------------------------------
export default function SkillGapAnalysisPage() {
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<GapAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(true);

  // Fetch published jobs for the dropdown
  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await fetch("/api/jobs?pageSize=100");
        const json = await res.json();
        setJobs(json.data ?? []);
      } finally {
        setJobsLoading(false);
      }
    }
    loadJobs();
  }, []);

  // Fetch gap analysis when a job is selected
  async function fetchAnalysis(jobId: string) {
    setLoading(true);
    setAnalysis(null);
    try {
      const res = await fetch(`/api/gap-analysis?jobId=${jobId}`);
      const json = await res.json();
      if (res.ok) {
        setAnalysis(json.data);
      }
    } finally {
      setLoading(false);
    }
  }

  function getScoreColor(score: number) {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  }

  function getScoreBg(score: number) {
    if (score >= 80) return "bg-green-100 border-green-200";
    if (score >= 60) return "bg-yellow-100 border-yellow-200";
    return "bg-red-100 border-red-200";
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Skill Gap Analysis</h1>
        <p className="text-muted-foreground mt-1">
          Select a job to see how your skills compare against the requirements.
        </p>
      </div>

      {/* Job Selector */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select a Job</label>
            {jobsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading jobs...
              </div>
            ) : jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No published jobs available for analysis.
              </p>
            ) : (
              <Select
                value={selectedJobId ?? undefined}
                onValueChange={(v) => {
                  setSelectedJobId(v);
                  fetchAnalysis(v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a job to analyze..." />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title}
                      {job.recruiterProfile?.companyName
                        ? ` — ${job.recruiterProfile.companyName}`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty State */}
      {!loading && !analysis && selectedJobId === null && (
        <div className="text-center py-16 space-y-4">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <div>
            <p className="text-lg font-medium">No job selected</p>
            <p className="text-sm text-muted-foreground mt-1">
              Select a job above to see your skill gap analysis.
            </p>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && !loading && (
        <div className="space-y-6">
          {/* Match Score */}
          <Card className={`border-2 ${getScoreBg(analysis.matchScore)}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Your match for
                  </p>
                  <p className="text-xl font-bold">{analysis.jobTitle}</p>
                  {analysis.companyName && (
                    <p className="text-sm text-muted-foreground">
                      {analysis.companyName}
                    </p>
                  )}
                </div>
                <div className="text-center">
                  <Target className={`h-6 w-6 mx-auto mb-1 ${getScoreColor(analysis.matchScore)}`} />
                  <p className={`text-4xl font-bold ${getScoreColor(analysis.matchScore)}`}>
                    {analysis.matchScore}%
                  </p>
                  <p className="text-xs text-muted-foreground">Match Score</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Breakdown */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${getScoreColor(analysis.breakdown.technical)}`}>
                  {analysis.breakdown.technical}%
                </p>
                <p className="text-xs text-muted-foreground">Technical</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${getScoreColor(analysis.breakdown.softSkills)}`}>
                  {analysis.breakdown.softSkills}%
                </p>
                <p className="text-xs text-muted-foreground">Soft Skills</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${getScoreColor(analysis.breakdown.experience)}`}>
                  {analysis.breakdown.experience}%
                </p>
                <p className="text-xs text-muted-foreground">Experience</p>
              </CardContent>
            </Card>
          </div>

          {/* Skill Gap Chart */}
          {analysis.skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Skills Comparison</CardTitle>
                <CardDescription>
                  Your skill levels vs job requirements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SkillGapChart
                  items={analysis.skills.map((s) => ({
                    skill: s.skill,
                    candidate: s.candidateLevel,
                    required: s.requiredLevel,
                  }))}
                  height={Math.max(200, analysis.skills.length * 40)}
                />
              </CardContent>
            </Card>
          )}

          {/* Skill-by-Skill Table */}
          <Card>
            <CardHeader>
              <CardTitle>Skill-by-Skill Breakdown</CardTitle>
              <CardDescription>
                Detailed analysis with actionable suggestions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.skills.map((skill) => (
                  <div
                    key={skill.skill}
                    className="flex flex-col gap-2 p-3 rounded-lg border"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm capitalize">
                          {skill.skill}
                        </span>
                        {skill.isMandatory && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            Required
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">
                          You: <strong>{skill.candidateLevel}</strong>/10
                        </span>
                        <span className="text-muted-foreground">
                          Need: <strong>{skill.requiredLevel}</strong>/10
                        </span>
                        {skill.gap > 0 ? (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        ) : (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5">
                      {skill.gap > 0 ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 mt-0.5 shrink-0" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                      )}
                      <p className="text-xs text-muted-foreground">
                        {skill.suggestion}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
