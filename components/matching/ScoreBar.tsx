import { cn, getScoreColor, getScoreBgColor } from "@/lib/utils";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";

interface ScoreBarProps {
  score: number;
  label?: string;
  showLabel?: boolean;
  className?: string;
}

export function ScoreBar({
  score,
  label,
  showLabel = true,
  className,
}: ScoreBarProps) {
  const color = getScoreColor(score);
  const bg = getScoreBgColor(score);

  return (
    <div className={cn("space-y-1", className)}>
      {showLabel && (
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className={cn("font-semibold", color)}>{score}%</span>
        </div>
      )}
      <div className="relative">
        <Progress value={score} className={cn("h-2", bg)} />
      </div>
    </div>
  );
}

interface MatchScoreBadgeProps {
  score: number;
  isMandatoryPass: boolean;
  size?: "sm" | "lg";
}

export function MatchScoreBadge({
  score,
  isMandatoryPass,
  size = "sm",
}: MatchScoreBadgeProps) {
  if (!isMandatoryPass) {
    return (
      <Badge
        variant="destructive"
        className={size === "lg" ? "text-base px-3 py-1" : ""}
      >
        Missing Required Skills
      </Badge>
    );
  }

  const variant =
    score >= 80
      ? "success"
      : score >= 60
        ? "warning"
        : score >= 40
          ? "info"
          : "outline";

  return (
    <Badge
      variant={variant}
      className={cn(
        "font-bold",
        size === "lg" ? "text-xl px-4 py-2" : "text-sm",
      )}
    >
      {score}% Match
    </Badge>
  );
}
