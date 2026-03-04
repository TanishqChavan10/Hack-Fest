"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
    Users,
    Briefcase,
    FileText,
    TrendingUp,
    Star,
    Loader2,
    BarChart3,
    UserPlus,
} from "lucide-react";

interface AdminStats {
    users: { total: number; candidates: number; recruiters: number };
    jobs: { total: number; published: number };
    applications: number;
    matches: { total: number; avgScore: number; maxScore: number; minScore: number };
    topSkills: Array<{ skill: string; avgLevel: number; candidateCount: number }>;
    recentUsers: Array<{
        id: string;
        name: string | null;
        email: string | null;
        role: string;
        createdAt: string;
        image: string | null;
    }>;
}

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await fetch("/api/admin/stats");
                if (!res.ok) {
                    setError(res.status === 401 ? "Unauthorized — Admin access required." : "Failed to load stats.");
                    return;
                }
                const json = await res.json();
                setStats(json.data);
            } catch {
                setError("Failed to connect to server.");
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto max-w-4xl px-4 py-16 text-center">
                <p className="text-destructive text-lg">{error}</p>
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="container mx-auto max-w-6xl px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                    Platform-wide analytics and system overview.
                </p>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                    icon={<Users className="h-5 w-5 text-blue-600" />}
                    label="Total Users"
                    value={stats.users.total}
                    sub={`${stats.users.candidates} candidates · ${stats.users.recruiters} recruiters`}
                />
                <StatCard
                    icon={<Briefcase className="h-5 w-5 text-green-600" />}
                    label="Job Postings"
                    value={stats.jobs.total}
                    sub={`${stats.jobs.published} published`}
                />
                <StatCard
                    icon={<FileText className="h-5 w-5 text-purple-600" />}
                    label="Applications"
                    value={stats.applications}
                    sub="total submitted"
                />
                <StatCard
                    icon={<TrendingUp className="h-5 w-5 text-yellow-600" />}
                    label="Matches Computed"
                    value={stats.matches.total}
                    sub={`avg score: ${stats.matches.avgScore}%`}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ── Top Skills ── */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <BarChart3 className="h-5 w-5 text-primary" />
                            Top Skills Across Platform
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {stats.topSkills.map((skill) => (
                                <div key={skill.skill} className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <span className="font-medium text-sm capitalize truncate">
                                            {skill.skill}
                                        </span>
                                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-primary h-full rounded-full transition-all"
                                                style={{ width: `${(skill.avgLevel / 10) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Badge variant="secondary" className="text-xs">
                                            avg {skill.avgLevel}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {skill.candidateCount} candidates
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {stats.topSkills.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No skill data yet.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* ── Recent Sign-ups ── */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <UserPlus className="h-5 w-5 text-primary" />
                            Recent Sign-ups
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {stats.recentUsers.map((user) => (
                                <div
                                    key={user.id}
                                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                                >
                                    <div className="flex items-center gap-3">
                                        {user.image ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={user.image}
                                                alt=""
                                                className="h-8 w-8 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                                {(user.name ?? "?")[0].toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium">
                                                {user.name ?? "Anonymous"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {user.email}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant={
                                                user.role === "ADMIN"
                                                    ? "destructive"
                                                    : user.role === "RECRUITER"
                                                        ? "warning"
                                                        : "info"
                                            }
                                            className="text-xs"
                                        >
                                            {user.role}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {stats.recentUsers.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No users yet.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Match Score Stats ── */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Star className="h-5 w-5 text-yellow-500" />
                        Match Score Distribution
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                        <div>
                            <p className="text-3xl font-bold text-primary">{stats.matches.avgScore}%</p>
                            <p className="text-sm text-muted-foreground">Average Score</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-green-600">{stats.matches.maxScore}%</p>
                            <p className="text-sm text-muted-foreground">Highest Score</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-orange-500">{stats.matches.minScore}%</p>
                            <p className="text-sm text-muted-foreground">Lowest Score</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function StatCard({
    icon,
    label,
    value,
    sub,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    sub: string;
}) {
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                    {icon}
                    <div>
                        <p className="text-2xl font-bold">{value.toLocaleString()}</p>
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">{sub}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
