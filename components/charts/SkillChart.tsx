"use client";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";

interface SkillChartProps {
  skills: Record<string, number>;
  type?: "radar" | "bar";
  maxItems?: number;
  height?: number;
}

export function SkillChart({
  skills,
  type = "bar",
  maxItems = 8,
  height = 280,
}: SkillChartProps) {
  const data = Object.entries(skills)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxItems)
    .map(([name, level]) => ({
      subject: name.charAt(0).toUpperCase() + name.slice(1),
      level,
      fullMark: 10,
    }));

  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
        No skills added yet
      </div>
    );
  }

  if (type === "radar") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
          <Radar
            name="Skills"
            dataKey="level"
            stroke="hsl(221.2, 83.2%, 53.3%)"
            fill="hsl(221.2, 83.2%, 53.3%)"
            fillOpacity={0.25}
          />
          <Tooltip formatter={(v) => [`${v}/10`, "Level"]} />
        </RadarChart>
      </ResponsiveContainer>
    );
  }

  // Bar chart (default)
  const colors = data.map((d) =>
    d.level >= 8
      ? "#16a34a"
      : d.level >= 6
        ? "#2563eb"
        : d.level >= 4
          ? "#d97706"
          : "#dc2626",
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 10]} tickCount={6} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => [`${v}/10`, "Proficiency"]} />
        <Bar dataKey="level" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Skill Gap visualizer: compares candidate vs job ──
interface SkillGapItem {
  skill: string;
  candidate: number;
  required: number;
}

interface SkillGapChartProps {
  items: SkillGapItem[];
  height?: number;
}

export function SkillGapChart({ items, height = 280 }: SkillGapChartProps) {
  const data = items.map((i) => ({
    skill: i.skill.charAt(0).toUpperCase() + i.skill.slice(1),
    "Your Level": i.candidate,
    Required: i.required,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="skill" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 10]} tickCount={6} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="Your Level" fill="#2563eb" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Required" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
