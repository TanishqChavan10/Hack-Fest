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
  DollarSign,
  Clock,
  Loader2,
  Briefcase,
  FileSearch,
} from "lucide-react";
import { formatSalary, timeAgo } from "@/lib/utils";

// -------------------------------------------------------
// Types
// -------------------------------------------------------
interface ApplicationJob {
  id: string;
  title: string;
  location: string | null;
  isRemote: boolean;
  experienceLevel: string;
  salaryMin: number | null;
  salaryMax: number | null;
  status: string;
  createdAt: string;
  recruiterProfile?: {
    companyName: string;
    logoUrl: string | null;
  } | null;
}

interface ApplicationItem {
  id: string;
  jobId: string;
  status: "PENDING" | "SHORTLISTED" | "REJECTED" | "HIRED";
  coverLetter: string | null;
  appliedAt: string;
  job: ApplicationJob;
}

// -------------------------------------------------------
// Status badge config
// -------------------------------------------------------
const statusConfig: Record<
  ApplicationItem["status"],
  {
    label: string;
    variant: "warning" | "info" | "destructive" | "success";
  }
> = {
  PENDING: { label: "Pending", variant: "warning" },
  SHORTLISTED: { label: "Shortlisted", variant: "info" },
  REJECTED: { label: "Rejected", variant: "destructive" },
  HIRED: { label: "Hired", variant: "success" },
};

// -------------------------------------------------------
// Page Component
// -------------------------------------------------------
export default function CandidateApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  async function fetchApplications(status = statusFilter) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status && status !== "all") params.set("status", status);
      const res = await fetch(`/api/applications?${params}`);
      const json = await res.json();
      setApplications(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stats
  const counts = applications.reduce(
    (acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Applications</h1>
        <p className="text-muted-foreground mt-1">
          Track the status of all jobs you&apos;ve applied to.
        </p>
      </div>

      {/* Stats Row */}
      {!loading && applications.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total" value={applications.length} />
          <StatCard label="Pending" value={counts.PENDING ?? 0} color="text-yellow-600" />
          <StatCard label="Shortlisted" value={counts.SHORTLISTED ?? 0} color="text-blue-600" />
          <StatCard label="Hired" value={counts.HIRED ?? 0} color="text-green-600" />
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3 mb-6">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            fetchApplications(v);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="SHORTLISTED">Shortlisted</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="HIRED">Hired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : applications.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <ApplicationCard key={app.id} application={app} />
          ))}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------
// Application Card
// -------------------------------------------------------
function ApplicationCard({ application }: { application: ApplicationItem }) {
  const { job, status, appliedAt } = application;
  const config = statusConfig[status];

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
          <Badge variant={config.variant}>{config.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {(job.location || job.isRemote) && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {job.isRemote ? "Remote" : job.location}
            </span>
          )}
          {(job.salaryMin || job.salaryMax) && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {formatSalary(job.salaryMin, job.salaryMax)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Briefcase className="h-3 w-3" />
            {job.experienceLevel}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Applied {timeAgo(appliedAt)}
          </span>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button asChild size="sm" variant="outline" className="ml-auto">
          <Link href={`/candidate/jobs/${job.id}`}>View Job</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

// -------------------------------------------------------
// Stat Card
// -------------------------------------------------------
function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <p className={`text-2xl font-bold ${color ?? ""}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

// -------------------------------------------------------
// Empty State
// -------------------------------------------------------
function EmptyState() {
  return (
    <div className="text-center py-16 space-y-4">
      <FileSearch className="h-12 w-12 mx-auto text-muted-foreground/50" />
      <div>
        <p className="text-lg font-medium">No applications yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Start exploring jobs and apply to positions that match your skills.
        </p>
      </div>
      <Button asChild>
        <Link href="/candidate/jobs">Browse Jobs</Link>
      </Button>
    </div>
  );
}
