"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Briefcase, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState<"CANDIDATE" | "RECRUITER">("CANDIDATE");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // If user already has a role, redirect to dashboard
      const metadataRole = user.user_metadata?.role;
      if (metadataRole) {
        router.push(
          metadataRole === "RECRUITER"
            ? "/recruiter/dashboard"
            : "/candidate/profile",
        );
        return;
      }

      setLoading(false);
    }
    checkAuth();
  }, [router, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          companyName: role === "RECRUITER" ? companyName : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save profile");
      }

      // Refresh to update server-side session cookies, then redirect
      router.refresh();
      setTimeout(() => {
        router.push(
          role === "RECRUITER" ? "/recruiter/dashboard" : "/candidate/profile",
        );
      }, 500);
    } catch (err: any) {
      setError(
        err.message || "An unexpected error occurred. Check the console.",
      );
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-background">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Welcome to TalentMatch!
          </CardTitle>
          <CardDescription>
            Tell us how you want to use the platform so we can personalize your
            experience.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive font-medium">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <RoleButton
                active={role === "CANDIDATE"}
                onClick={() => setRole("CANDIDATE")}
                icon={<User className="h-6 w-6" />}
                label="I'm a Candidate"
                sub="Find my next job"
              />
              <RoleButton
                active={role === "RECRUITER"}
                onClick={() => setRole("RECRUITER")}
                icon={<Briefcase className="h-6 w-6" />}
                label="I'm a Recruiter"
                sub="Find great talent"
              />
            </div>

            {role === "RECRUITER" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="Acme Inc."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating profile...
                </>
              ) : (
                "Continue to Dashboard"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function RoleButton({
  active,
  onClick,
  icon,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border-2 p-4 text-sm transition-all text-center",
        active
          ? "border-primary bg-primary/5 text-primary shadow-sm"
          : "border-border hover:border-primary/50 hover:bg-muted",
      )}
    >
      <div
        className={cn(
          "p-2 rounded-full",
          active ? "bg-primary/10" : "bg-muted",
        )}
      >
        {icon}
      </div>
      <div>
        <div className="font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground mt-1">{sub}</div>
      </div>
    </button>
  );
}
