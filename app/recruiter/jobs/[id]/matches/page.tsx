"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { MatchCard } from "@/components/matching/MatchCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Loader2, RefreshCw, Star } from "lucide-react";
import type { MatchBreakdown } from "@/types";

interface MatchResult {
  candidateId: string;
  score: number;
  breakdown: MatchBreakdown;
  isMandatoryPass: boolean;
  isShortlisted: boolean;
  jobRequirements: Array<{
    skillName: string;
    minLevel: number;
    weight: number;
    isMandatory: boolean;
  }>;
  candidate: {
    id: string;
    headline: string | null;
    location: string | null;
    experienceLevel: string;
    yearsOfExp: number;
    hardSkills: Record<string, number>;
    githubUsername: string | null;
    user: { name: string | null; email: string | null; image: string | null };
  };
}

export default function JobMatchesPage() {
  const { id: jobId } = useParams<{ id: string }>();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "shortlisted">("all");
  const [minScore, setMinScore] = useState(0);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/match?jobId=${jobId}`);
      const json = await res.json();
      setMatches(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const displayed = matches.filter((m) => {
    if (filter === "shortlisted" && !m.isShortlisted) return false;
    if (m.score < minScore) return false;
    return true;
  });

  const shortlistedCount = matches.filter((m) => m.isShortlisted).length;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Candidate Matches</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {matches.length} candidates ranked by match score
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={fetchMatches}
        >
          <RefreshCw className="h-4 w-4" /> Recalculate
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <Select
          value={filter}
          onValueChange={(v) => setFilter(v as "all" | "shortlisted")}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Candidates</SelectItem>
            <SelectItem value="shortlisted">
              <span className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 fill-current" />
                Shortlisted ({shortlistedCount})
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-muted-foreground">Min score:</span>
          <Input
            type="number"
            min={0}
            max={100}
            className="w-20"
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 mb-4 text-xs">
        <Badge variant="success">80-100% Strong</Badge>
        <Badge variant="warning">60-79% Good</Badge>
        <Badge variant="info">40-59% Fair</Badge>
        <Badge variant="outline">0-39% Low</Badge>
        <Badge variant="destructive">Missing mandatory skills</Badge>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>No candidates match your current filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayed.map((m) => (
            <MatchCard
              key={m.candidateId}
              {...m}
              jobId={jobId}
              jobRequirements={m.jobRequirements}
              onShortlistToggle={(cId, val) => {
                setMatches((prev) =>
                  prev.map((x) =>
                    x.candidateId === cId ? { ...x, isShortlisted: val } : x,
                  ),
                );
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
