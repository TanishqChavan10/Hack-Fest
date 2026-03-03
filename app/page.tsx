import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { BrainCircuit, Search, TrendingUp, Users } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background py-24 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <Badge variant="secondary" className="mb-4 text-sm font-medium">
            🚀 Phase 1 — Core Infrastructure Live
          </Badge>
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
            Discover Talent
            <span className="text-primary"> Intelligently</span>
          </h1>
          <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            TalentMatch uses <strong>Weighted Multi-Dimensional Scoring</strong>{" "}
            and <strong>Semantic Vector Search</strong> to rank candidates with
            mathematical precision — far beyond keyword filters.
          </p>
          <div className="mt-8 flex gap-4 justify-center flex-wrap">
            <Button asChild size="lg" className="text-base px-8">
              <Link href="/register?role=recruiter">I'm a Recruiter</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="text-base px-8"
            >
              <Link href="/register?role=candidate">I'm a Candidate</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── FEATURE CARDS ── */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            How TalentMatch Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Users className="h-8 w-8 text-primary" />}
              title="Structured Profiles"
              description="Candidates define proficiency levels (1–10) per skill. No more vague resumes."
            />
            <FeatureCard
              icon={<BrainCircuit className="h-8 w-8 text-primary" />}
              title="Weighted Scoring"
              description="Recruiters set skill importance weights. Algorithm computes exact match %."
            />
            <FeatureCard
              icon={<Search className="h-8 w-8 text-primary" />}
              title="Semantic Search"
              description="Phase 2: pgvector + OpenAI embeddings find candidates by intent, not keywords."
            />
            <FeatureCard
              icon={<TrendingUp className="h-8 w-8 text-primary" />}
              title="Gap Analysis"
              description="Phase 3: Candidates see exactly which skills to improve to hit 100% on any job."
            />
          </div>
        </div>
      </section>

      {/* ── ALGORITHM SECTION ── */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold mb-4">The Algorithm</h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            We don't match on keywords. We compute a{" "}
            <strong>Weighted Multi-Dimensional Score</strong> that compares
            candidate proficiency against job requirements with configurable
            importance weights.
          </p>
          <div className="rounded-xl border bg-muted/50 p-6 font-mono text-sm text-left overflow-x-auto">
            <pre>{`Score = Σ( clamp(candidateLevel / minLevel, 0, 1.2) × weight )
        ────────────────────────────────────────────────────────── × 100
                             Σ( weight )

Where:
  candidateLevel  = candidate's proficiency (1-10)
  minLevel        = job's minimum required level (1-10)
  weight          = recruiter-defined skill importance (0.0-1.0)
  clamp(x, 0, 1.2) allows up to 20% bonus for exceeding requirements`}</pre>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="mb-8 opacity-90">
            Create your free account and discover better matches today.
          </p>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="text-base px-8"
          >
            <Link href="/register">Create Free Account</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {icon}
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}
