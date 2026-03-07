"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  MapPin,
  Building2,
  Clock,
  Search,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { formatSalary, timeAgo } from "@/lib/utils";
import ApplyModal from "@/components/matching/ApplyModal";

interface Job {
  id: string;
  title: string;
  description: string;
  location: string | null;
  isRemote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  experienceLevel: string;
  status: string;
  createdAt: string;
  requirements: Array<{
    skillName: string;
    minLevel: number;
    weight: number;
    isMandatory: boolean;
  }>;
  recruiterProfile?: { companyName: string; location: string | null } | null;
}

export default function CandidateJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("all");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [applyModal, setApplyModal] = useState<{
    jobId: string;
    jobTitle: string;
    companyName: string;
  } | null>(null);

  async function fetchJobs(q = search, lvl = level, p = page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: "10" });
      if (q) params.set("search", q);
      if (lvl && lvl !== "all") params.set("level", lvl);
      const res = await fetch(`/api/jobs?${params}`);
      const json = await res.json();
      setJobs(json.data ?? []);
      setTotal(json.total ?? 0);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAppliedJobs() {
    try {
      const res = await fetch("/api/applications");
      const json = await res.json();
      if (json.data) {
        setAppliedJobIds(
          new Set(json.data.map((a: { jobId: string }) => a.jobId)),
        );
      }
    } catch {
      // non-blocking
    }
  }

  useEffect(() => {
    fetchJobs();
    fetchAppliedJobs();
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchJobs(search, level, 1);
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Browse Jobs</h1>
        <p className="text-muted-foreground mt-1">
          {total} published positions available
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by title or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={level}
          onValueChange={(v) => {
            setLevel(v);
            setPage(1);
            fetchJobs(search, v, 1);
          }}
        >
          <SelectTrigger className="w-40">
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
        <Button type="submit">Search</Button>
      </form>

      {/* Job List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No jobs found.</p>
          <p className="text-sm mt-1">Try adjusting your search filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              alreadyApplied={appliedJobIds.has(job.id)}
              onApply={() =>
                setApplyModal({
                  jobId: job.id,
                  jobTitle: job.title,
                  companyName:
                    job.recruiterProfile?.companyName ?? "Unknown Company",
                })
              }
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {applyModal && (
        <ApplyModal
          jobId={applyModal.jobId}
          jobTitle={applyModal.jobTitle}
          companyName={applyModal.companyName}
          open={true}
          onClose={() => setApplyModal(null)}
          onSuccess={(jobId) => {
            setAppliedJobIds((prev) => new Set([...prev, jobId]));
            setApplyModal(null);
          }}
        />
      )}

      {total > 10 && (
        <div className="mt-8 flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => {
              setPage((p) => p - 1);
              fetchJobs(search, level, page - 1);
            }}
          >
            Previous
          </Button>
          <span className="flex items-center px-3 text-sm text-muted-foreground">
            Page {page} of {Math.ceil(total / 10)}
          </span>
          <Button
            variant="outline"
            disabled={page * 10 >= total}
            onClick={() => {
              setPage((p) => p + 1);
              fetchJobs(search, level, page + 1);
            }}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function JobCard({
  job,
  alreadyApplied,
  onApply,
}: {
  job: Job;
  alreadyApplied: boolean;
  onApply: () => void;
}) {
  const levelColors: Record<
    string,
    "info" | "success" | "warning" | "secondary"
  > = {
    ENTRY: "info",
    MID: "success",
    SENIOR: "warning",
    LEAD: "secondary",
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg">{job.title}</CardTitle>
            {job.recruiterProfile && (
              <CardDescription className="flex items-center gap-1 mt-0.5">
                <Building2 className="h-3 w-3" />
                {job.recruiterProfile.companyName}
              </CardDescription>
            )}
          </div>
          <Badge variant={levelColors[job.experienceLevel] ?? "secondary"}>
            {job.experienceLevel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {job.description}
        </p>
        <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
          {(job.location || job.isRemote) && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {job.isRemote ? "Remote" : job.location}
            </span>
          )}
          {(job.salaryMin || job.salaryMax) && (
            <span className="flex items-center gap-1">
              {formatSalary(job.salaryMin, job.salaryMax)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo(job.createdAt)}
          </span>
        </div>
        {/* Required skills */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {job.requirements.slice(0, 6).map((req) => (
            <Badge
              key={req.skillName}
              variant={req.isMandatory ? "default" : "secondary"}
              className="text-xs"
            >
              {req.skillName} {req.isMandatory && "•"}
            </Badge>
          ))}
          {job.requirements.length > 6 && (
            <Badge variant="outline" className="text-xs">
              +{job.requirements.length - 6} more
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-0 flex items-center justify-between">
        <Button asChild size="sm" variant="ghost">
          <Link href={`/candidate/jobs/${job.id}`}>View Details</Link>
        </Button>
        {alreadyApplied ? (
          <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
            <CheckCircle className="h-4 w-4" />
            Applied
          </span>
        ) : (
          <Button size="sm" onClick={onApply}>
            Apply Now
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
