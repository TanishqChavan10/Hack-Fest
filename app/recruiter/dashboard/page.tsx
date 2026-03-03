"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/shared/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Briefcase, Users, Star, Plus, Loader2, Eye } from "lucide-react";
import { timeAgo } from "@/lib/utils";

interface Job {
  id: string;
  title: string;
  status: string;
  experienceLevel: string;
  createdAt: string;
  _count?: { applications: number; matches: number };
}

export default function RecruiterDashboardPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    totalMatches: 0,
  });

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/recruiter/jobs");
        const json = await res.json();
        const jobList: Job[] = json.data ?? [];
        setJobs(jobList);
        setStats({
          total: jobList.length,
          published: jobList.filter((j) => j.status === "PUBLISHED").length,
          totalMatches: jobList.reduce(
            (acc, j) => acc + (j._count?.matches ?? 0),
            0,
          ),
        });
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Recruiter Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {user?.user_metadata?.name ?? "Recruiter"}
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/recruiter/jobs/new">
            <Plus className="h-4 w-4" /> Post New Job
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={<Briefcase className="h-6 w-6 text-primary" />}
          label="Total Jobs"
          value={stats.total}
        />
        <StatCard
          icon={<Eye className="h-6 w-6 text-green-600" />}
          label="Published Jobs"
          value={stats.published}
        />
        <StatCard
          icon={<Star className="h-6 w-6 text-yellow-500" />}
          label="Total Matches Computed"
          value={stats.totalMatches}
        />
      </div>

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Job Postings</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No jobs posted yet.</p>
              <Button asChild variant="link" className="mt-2">
                <Link href="/recruiter/jobs/new">Post your first job →</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium">{job.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {job.experienceLevel} · Posted {timeAgo(job.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        job.status === "PUBLISHED"
                          ? "success"
                          : job.status === "DRAFT"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {job.status}
                    </Badge>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/recruiter/jobs/${job.id}/matches`}>
                        <Users className="h-3.5 w-3.5 mr-1.5" />
                        View Matches
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/recruiter/jobs/${job.id}/edit`}>Edit</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          {icon}
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
