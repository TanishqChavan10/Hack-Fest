"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { MatchScoreBadge, ScoreBar } from "./ScoreBar";
import { XAIExplanation } from "./XAITooltip";
import { getScoreColor, timeAgo, cn } from "@/lib/utils";
import {
  Star,
  Github,
  MapPin,
  Briefcase,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { MatchBreakdown } from "@/types";

export interface MatchCardProps {
  candidateId: string;
  score: number;
  breakdown: MatchBreakdown;
  isMandatoryPass: boolean;
  isShortlisted: boolean;
  candidate: {
    id: string;
    headline: string | null;
    location: string | null;
    experienceLevel: string;
    yearsOfExp: number;
    hardSkills: Record<string, number>;
    githubUsername: string | null;
    user: {
      name: string | null;
      email: string | null;
      image: string | null;
    };
  };
  jobId: string;
  jobRequirements?: Array<{
    skillName: string;
    minLevel: number;
    weight: number;
    isMandatory: boolean;
  }>;
  onShortlistToggle?: (candidateId: string, isShortlisted: boolean) => void;
}

export function MatchCard({
  candidateId,
  score,
  breakdown,
  isMandatoryPass,
  isShortlisted,
  candidate,
  jobId,
  jobRequirements,
  onShortlistToggle,
}: MatchCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [shortlisted, setShortlisted] = useState(isShortlisted);
  const [toggling, setToggling] = useState(false);

  const topSkills = Object.entries(candidate.hardSkills ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  async function handleShortlist() {
    setToggling(true);
    const next = !shortlisted;
    try {
      await fetch("/api/match/shortlist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, candidateId, isShortlisted: next }),
      });
      setShortlisted(next);
      onShortlistToggle?.(candidateId, next);
    } finally {
      setToggling(false);
    }
  }

  return (
    <Card
      className={cn("transition-all", shortlisted && "ring-2 ring-primary/40")}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Avatar + Name */}
          <div className="flex items-center gap-3">
            {candidate.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={candidate.user.image}
                alt={candidate.user.name ?? ""}
                className="h-11 w-11 rounded-full object-cover"
              />
            ) : (
              <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                {(candidate.user.name ?? "?")[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold leading-none">
                {candidate.user.name ?? "Anonymous"}
              </p>
              {candidate.headline && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                  {candidate.headline}
                </p>
              )}
            </div>
          </div>

          {/* Right: Score + Shortlist */}
          <div className="flex items-center gap-2 shrink-0">
            <MatchScoreBadge score={score} isMandatoryPass={isMandatoryPass} />
            <Button
              size="sm"
              variant={shortlisted ? "default" : "outline"}
              className="gap-1.5"
              disabled={toggling}
              onClick={handleShortlist}
            >
              <Star className={cn("h-4 w-4", shortlisted && "fill-current")} />
              {shortlisted ? "Shortlisted" : "Shortlist"}
            </Button>
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
          {candidate.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {candidate.location}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Briefcase className="h-3 w-3" /> {candidate.yearsOfExp}y exp ·{" "}
            {candidate.experienceLevel}
          </span>
          {candidate.githubUsername && (
            <span className="flex items-center gap-1">
              <Github className="h-3 w-3" /> {candidate.githubUsername}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Top skills pill row */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {topSkills.map(([skill, level]) => (
            <Badge
              key={skill}
              variant={
                level >= 7 ? "success" : level >= 4 ? "info" : "secondary"
              }
              className="text-xs"
            >
              {skill} · {level}/10
            </Badge>
          ))}
        </div>

        {/* Expandable breakdown */}
        <button
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          Match breakdown
        </button>

        {expanded && (
          <div className="mt-3 space-y-3 border-t pt-3">
            <div className="space-y-2">
              <ScoreBar score={breakdown.technical} label="Technical Skills" />
              <ScoreBar score={breakdown.softSkills} label="Soft Skills" />
              <ScoreBar score={breakdown.experience} label="Experience" />
            </div>
            <div className="border-t pt-3">
              <XAIExplanation
                breakdown={breakdown}
                isMandatoryPass={isMandatoryPass}
                score={score}
                candidateSkills={candidate.hardSkills ?? {}}
                jobRequirements={jobRequirements}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
