import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { BrainCircuit, Search, TrendingUp, Users, CheckCircle2, BarChart3, Zap, Shield } from "lucide-react";

export default async function HomePage() {
  const session = await getSession();

  if (session?.user) {
    const role = session.user.role;
    // Redirect based on role
    switch (role) {
      case "ADMIN":
        redirect("/admin");
      case "RECRUITER":
        redirect("/recruiter/dashboard");
      case "CANDIDATE":
        redirect("/candidate/profile");
      default:
        redirect("/"); // Added a default redirect for safety
    }
  }

  return (
    <div className="flex flex-col">
      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background py-24 px-4">
        <div className="container mx-auto max-w-4xl text-center">
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

      {/* ── STATS ── */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard value="3×" label="Faster Hiring" sub="vs. traditional resume review" />
            <StatCard value="92%" label="Match Accuracy" sub="based on skill-level scoring" />
            <StatCard value="10" label="Proficiency Levels" sub="granular skill measurement" />
            <StatCard value="100%" label="Bias-Free" sub="objective, data-driven ranking" />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-4">Your Hiring Journey</h2>
          <p className="text-center text-muted-foreground mb-14 max-w-xl mx-auto">
            From posting a job to finding your perfect hire — TalentMatch makes every step smarter.
          </p>
          <div className="flex flex-col gap-0">
            <ProcessStep
              step="01"
              icon={<Users className="h-6 w-6" />}
              title="Post a Job with Skill Weights"
              description="Define the skills you need and assign importance weights (0–1). Tell us what matters most — leadership, Python, communication — and we'll rank accordingly."
            />
            <ProcessStep
              step="02"
              icon={<BarChart3 className="h-6 w-6" />}
              title="Candidates Rate Their Proficiency"
              description="Job seekers build structured profiles with honest self-assessed skill levels (1–10). No keyword stuffing — just clear, comparable data points."
            />
            <ProcessStep
              step="03"
              icon={<Zap className="h-6 w-6" />}
              title="Algorithm Scores Every Applicant"
              description="Our weighted scoring engine instantly computes a match percentage for each candidate against your exact requirements — with a bonus for those who exceed them."
            />
            <ProcessStep
              step="04"
              icon={<Shield className="h-6 w-6" />}
              title="Review a Ranked, Bias-Free Shortlist"
              description="Get a clean leaderboard of top candidates ranked by fit. Every score is explainable — see exactly which skills drove the result."
            />
            <ProcessStep
              step="05"
              icon={<CheckCircle2 className="h-6 w-6" />}
              title="Hire with Confidence"
              description="Make data-backed decisions and reduce time-to-hire. Candidates also receive gap analysis so they know exactly how to improve for future applications."
              isLast
            />
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

function StatCard({
  value,
  label,
  sub,
}: {
  value: string;
  label: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6 text-center flex flex-col gap-1 hover:shadow-md transition-shadow">
      <span className="text-4xl font-extrabold text-primary">{value}</span>
      <span className="font-semibold text-base">{label}</span>
      <span className="text-xs text-muted-foreground">{sub}</span>
    </div>
  );
}

function ProcessStep({
  step,
  icon,
  title,
  description,
  isLast = false,
}: {
  step: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  isLast?: boolean;
}) {
  return (
    <div className="flex gap-6">
      {/* Left: number + connector line */}
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
          {step}
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-border mt-2 mb-0 min-h-[2rem]" />
        )}
      </div>
      {/* Right: content */}
      <div className={`pb-10 ${isLast ? "pb-0" : ""}`}>
        <div className="flex items-center gap-2 mb-1 text-primary">
          {icon}
          <h3 className="font-semibold text-lg text-foreground">{title}</h3>
        </div>
        <p className="text-muted-foreground leading-relaxed text-sm max-w-xl">
          {description}
        </p>
      </div>
    </div>
  );
}
