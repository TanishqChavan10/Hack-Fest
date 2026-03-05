"use client";
import { useState } from "react";
import { useAuth } from "@/components/shared/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Search, Loader2, Github, MapPin, Briefcase, Info, BrainCircuit, Type, AlertTriangle } from "lucide-react";

interface CandidateResult {
  id: string;
  headline: string | null;
  location: string | null;
  experienceLevel: string;
  yearsOfExp: number;
  hardSkills: Record<string, number>;
  githubUsername: string | null;
  user: { name: string | null; email: string | null; image: string | null };
  semanticScore?: number;
}

export default function RecruiterSearchPage() {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("all");
  const [candidates, setCandidates] = useState<CandidateResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<"keyword" | "semantic">("keyword");
  const [total, setTotal] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);

  async function performSearch(mode: "keyword" | "semantic") {
    if (!query.trim()) return;
    setLoading(true);
    setWarning(null);
    try {
      const params = new URLSearchParams({ q: query, mode });
      if (level && level !== "all") params.set("level", level);
      const res = await fetch(`/api/search?${params}`);
      const json = await res.json();
      setCandidates(json.data ?? []);
      setTotal(json.total ?? 0);
      setSearchMode(json.searchMode);
      setWarning(json.warning);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    performSearch(selectedMode);
  }

  function handleModeToggle(mode: "keyword" | "semantic") {
    setSelectedMode(mode);
    if (query.trim()) {
      performSearch(mode);
    }
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Find Talent</h1>
        <p className="text-muted-foreground mt-1">
          Search candidates by keyword match or AI-powered semantic intent.
        </p>
      </div>

      {/* Search Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <Button
          type="button"
          size="sm"
          variant={selectedMode === "keyword" ? "default" : "outline"}
          className="gap-1.5"
          onClick={() => handleModeToggle("keyword")}
        >
          <Type className="h-3.5 w-3.5" />
          Keyword
        </Button>
        <Button
          type="button"
          size="sm"
          variant={selectedMode === "semantic" ? "default" : "outline"}
          className="gap-1.5"
          onClick={() => handleModeToggle("semantic")}
        >
          <BrainCircuit className="h-3.5 w-3.5" />
          AI Semantic
        </Button>
        {selectedMode === "semantic" && (
          <span className="flex items-center text-xs text-muted-foreground ml-2">
            Powered by pgvector + OpenAI — understands intent like &quot;Cloud Expert&quot;
          </span>
        )}
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 text-base h-12"
            placeholder={
              selectedMode === "semantic"
                ? 'e.g. "Cloud infrastructure expert with DevOps background"'
                : "e.g. React developer, Python, Mumbai..."
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-36 h-12">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="ENTRY">Entry</SelectItem>
            <SelectItem value="MID">Mid</SelectItem>
            <SelectItem value="SENIOR">Senior</SelectItem>
            <SelectItem value="LEAD">Lead</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="submit"
          size="lg"
          className="h-12 px-6"
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
      </form>

      {warning && (
        <div className="flex items-center gap-2 rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800 mb-4">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p>{warning}</p>
        </div>
      )}

      {searchMode && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
          <Info className="h-3.5 w-3.5" />
          Search mode:{" "}
          <Badge
            variant={searchMode === "semantic" ? "success" : "info"}
            className="text-xs"
          >
            {searchMode === "semantic" ? "AI Semantic" : "Keyword"}
          </Badge>
          {total > 0 && <span>· {total} candidates found</span>}
        </div>
      )}

      {/* Results */}
      {candidates.length === 0 && searchMode && !loading && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No candidates found for your query.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {candidates.map((c) => (
          <CandidateCard key={c.id} candidate={c} />
        ))}
      </div>
    </div>
  );
}

function CandidateCard({ candidate: c }: { candidate: CandidateResult }) {
  const topSkills = Object.entries(c.hardSkills ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {c.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.user.image}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {(c.user.name ?? "?")[0].toUpperCase()}
              </div>
            )}
            <div>
              <CardTitle className="text-base">
                {c.user.name ?? "Anonymous"}
              </CardTitle>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {c.headline}
              </p>
            </div>
          </div>
          {c.semanticScore !== undefined && (
            <Badge variant="success" className="text-xs shrink-0">
              {c.semanticScore}% match
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {c.location && (
            <span className="flex items-center gap-0.5">
              <MapPin className="h-3 w-3" />
              {c.location}
            </span>
          )}
          <span className="flex items-center gap-0.5">
            <Briefcase className="h-3 w-3" />
            {c.yearsOfExp}y · {c.experienceLevel}
          </span>
          {c.githubUsername && (
            <span className="flex items-center gap-0.5">
              <Github className="h-3 w-3" />
              {c.githubUsername}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {topSkills.map(([skill, level]) => (
            <Badge
              key={skill}
              variant={level >= 7 ? "success" : "secondary"}
              className="text-xs"
            >
              {skill} · {level}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
