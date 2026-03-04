"use client";
import type { MatchBreakdown } from "@/types";
import {
    CheckCircle2,
    XCircle,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Minus,
} from "lucide-react";

// -------------------------------------------------------
// Generate human-readable explanation from match breakdown
// This is the core XAI (Explainable AI) logic.
// -------------------------------------------------------

interface SkillExplanation {
    skill: string;
    candidateLevel: number;
    requiredLevel: number;
    status: "exceeds" | "meets" | "below" | "missing";
    isMandatory: boolean;
}

function getStatusIcon(status: SkillExplanation["status"]) {
    switch (status) {
        case "exceeds":
            return <TrendingUp className="h-3.5 w-3.5 text-green-600 shrink-0" />;
        case "meets":
            return <Minus className="h-3.5 w-3.5 text-blue-500 shrink-0" />;
        case "below":
            return <TrendingDown className="h-3.5 w-3.5 text-yellow-600 shrink-0" />;
        case "missing":
            return <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />;
    }
}

function getStatusText(exp: SkillExplanation): string {
    const name = exp.skill.charAt(0).toUpperCase() + exp.skill.slice(1);
    switch (exp.status) {
        case "exceeds":
            return `${name}: ${exp.candidateLevel}/10 exceeds required ${exp.requiredLevel}/10 (+${exp.candidateLevel - exp.requiredLevel} bonus)`;
        case "meets":
            return `${name}: ${exp.candidateLevel}/10 meets required ${exp.requiredLevel}/10`;
        case "below":
            return `${name}: ${exp.candidateLevel}/10 below required ${exp.requiredLevel}/10 (gap: ${exp.requiredLevel - exp.candidateLevel})`;
        case "missing":
            return `${name}: Not found in profile${exp.isMandatory ? " ⚠️ MANDATORY" : ""}`;
    }
}

export function generateSkillExplanations(
    candidateSkills: Record<string, number>,
    jobRequirements: Array<{ skillName: string; minLevel: number; weight: number; isMandatory: boolean }>
): SkillExplanation[] {
    const normalized: Record<string, number> = {};
    for (const [k, v] of Object.entries(candidateSkills)) {
        normalized[k.toLowerCase().trim()] = v;
    }

    return jobRequirements.map((req) => {
        const key = req.skillName.toLowerCase().trim();
        const candidateLevel = normalized[key] ?? 0;
        const requiredLevel = req.minLevel;

        let status: SkillExplanation["status"];
        if (candidateLevel === 0) {
            status = "missing";
        } else if (candidateLevel > requiredLevel) {
            status = "exceeds";
        } else if (candidateLevel >= requiredLevel) {
            status = "meets";
        } else {
            status = "below";
        }

        return {
            skill: req.skillName,
            candidateLevel,
            requiredLevel,
            status,
            isMandatory: req.isMandatory,
        };
    });
}

export function generateOverallExplanation(
    breakdown: MatchBreakdown,
    isMandatoryPass: boolean,
    score: number
): string[] {
    const reasons: string[] = [];

    // Overall assessment
    if (score >= 80) {
        reasons.push("Strong overall match — candidate closely fits this role.");
    } else if (score >= 60) {
        reasons.push("Good match — candidate fits most requirements with some gaps.");
    } else if (score >= 40) {
        reasons.push("Fair match — significant skill gaps exist.");
    } else {
        reasons.push("Weak match — candidate does not closely match this role.");
    }

    // Mandatory fail
    if (!isMandatoryPass) {
        reasons.push("Missing one or more mandatory skills — hard disqualifier.");
    }

    // Dimension-specific insights
    if (breakdown.technical >= 80) {
        reasons.push(`Technical fit: ${breakdown.technical}% — strong technical alignment.`);
    } else if (breakdown.technical < 50) {
        reasons.push(`Technical fit: ${breakdown.technical}% — significant technical gaps.`);
    }

    if (breakdown.softSkills >= 80) {
        reasons.push(`Soft skills: ${breakdown.softSkills}% — excellent interpersonal match.`);
    }

    if (breakdown.experience >= 80) {
        reasons.push(`Experience: ${breakdown.experience}% — meets experience requirements.`);
    } else if (breakdown.experience < 50) {
        reasons.push(`Experience: ${breakdown.experience}% — may need more experience for this role.`);
    }

    return reasons;
}

// -------------------------------------------------------
// XAI Explanation Panel — renders inside the expanded MatchCard
// -------------------------------------------------------

interface XAIExplanationProps {
    breakdown: MatchBreakdown;
    isMandatoryPass: boolean;
    score: number;
    candidateSkills: Record<string, number>;
    jobRequirements?: Array<{ skillName: string; minLevel: number; weight: number; isMandatory: boolean }>;
}

export function XAIExplanation({
    breakdown,
    isMandatoryPass,
    score,
    candidateSkills,
    jobRequirements,
}: XAIExplanationProps) {
    const overallReasons = generateOverallExplanation(breakdown, isMandatoryPass, score);
    const skillExplanations = jobRequirements
        ? generateSkillExplanations(candidateSkills, jobRequirements)
        : [];

    return (
        <div className="space-y-3">
            {/* Overall assessment */}
            <div className="space-y-1.5">
                <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    {isMandatoryPass ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                    )}
                    Why this score?
                </p>
                <ul className="list-disc list-inside">
                    {overallReasons.map((reason, i) => (
                        <li key={i} className="text-xs text-muted-foreground ml-1">
                            {reason}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Per-skill breakdown */}
            {skillExplanations.length > 0 && (
                <div className="space-y-1">
                    <p className="text-xs font-medium text-foreground">Skill-by-skill:</p>
                    {skillExplanations.map((exp) => (
                        <div
                            key={exp.skill}
                            className="flex items-center gap-2 text-xs text-muted-foreground pl-2"
                        >
                            {getStatusIcon(exp.status)}
                            <span>{getStatusText(exp)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
