"use client";
import Link from "next/link";
import { useAuth } from "@/components/shared/AuthProvider";
import {
  BrainCircuit,
  Briefcase,
  User,
  LogOut,
  LayoutDashboard,
  Search,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { user, role, loading, signOut } = useAuth();
  const isRecruiter = role === "RECRUITER";
  const isCandidate = role === "CANDIDATE";

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4 gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <BrainCircuit className="h-7 w-7 text-primary" />
          <span>TalentMatch</span>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-4 text-sm font-medium ml-2">
          {isRecruiter && (
            <>
              <NavLink
                href="/recruiter/dashboard"
                icon={<LayoutDashboard className="h-4 w-4" />}
                label="Dashboard"
              />
              <NavLink
                href="/recruiter/jobs/new"
                icon={<Briefcase className="h-4 w-4" />}
                label="Post Job"
              />
              <NavLink
                href="/recruiter/search"
                icon={<Search className="h-4 w-4" />}
                label="Find Talent"
              />
            </>
          )}
          {isCandidate && (
            <>
              <NavLink
                href="/candidate/profile"
                icon={<User className="h-4 w-4" />}
                label="My Profile"
              />
              <NavLink
                href="/candidate/jobs"
                icon={<Briefcase className="h-4 w-4" />}
                label="Browse Jobs"
              />
              <NavLink
                href="/candidate/applications"
                icon={<FileText className="h-4 w-4" />}
                label="My Applications"
              />
            </>
          )}
        </div>

        {/* Auth Actions */}
        <div className="ml-auto flex items-center gap-3">
          {loading && (
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          )}
          {!loading && !user && (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Get Started</Link>
              </Button>
            </>
          )}
          {!loading && user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user.user_metadata?.name ?? user.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => signOut()}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors",
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
