"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { BrainCircuit, Briefcase, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { GoogleIcon } from "@/components/icons/GoogleIcon";

const RegisterSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Minimum 8 characters"),
    confirmPassword: z.string(),
    role: z.enum(["CANDIDATE", "RECRUITER"]),
    companyName: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof RegisterSchema>;

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole =
    searchParams.get("role") === "recruiter" ? "RECRUITER" : "CANDIDATE";

  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { role: defaultRole },
  });

  const role = watch("role");

  async function onSubmit(data: RegisterForm) {
    setLoading(true);
    setServerError(null);

    try {
      // Step 1: Create Supabase Auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp(
        {
          email: data.email,
          password: data.password,
          options: {
            data: {
              name: data.name,
              role: data.role,
            },
          },
        },
      );

      if (signUpError) {
        setServerError(signUpError.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setServerError("Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      // Step 2: Create Prisma user + profile via API
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supabaseUserId: authData.user.id,
          name: data.name,
          email: data.email,
          role: data.role,
          companyName: data.companyName,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(json.error ?? "Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      router.push(
        role === "RECRUITER" ? "/recruiter/dashboard" : "/candidate/profile",
      );
      router.refresh();
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    if (error) {
      setServerError("Failed to initiate Google sign-in.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-primary/5 to-background py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <BrainCircuit className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>
            Join TalentMatch today — free forever
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Role Selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <RoleButton
              active={role === "CANDIDATE"}
              onClick={() => setValue("role", "CANDIDATE")}
              icon={<User className="h-5 w-5" />}
              label="I'm a Candidate"
              sub="Looking for jobs"
            />
            <RoleButton
              active={role === "RECRUITER"}
              onClick={() => setValue("role", "RECRUITER")}
              icon={<Briefcase className="h-5 w-5" />}
              label="I'm a Recruiter"
              sub="Hiring talent"
            />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                {serverError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="John Doe" {...register("name")} />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            {role === "RECRUITER" && (
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="Acme Inc."
                  {...register("companyName")}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min. 8 characters"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repeat password"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <input type="hidden" {...register("role")} />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs text-muted-foreground bg-background px-2">
                OR
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
            >
              <GoogleIcon />
              Continue with Google
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="ml-1 text-primary underline underline-offset-2"
          >
            Sign in
          </Link>
        </CardFooter>
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
        "flex flex-col items-center gap-2 rounded-lg border p-4 text-sm transition-all",
        active
          ? "border-primary bg-primary/10 text-primary font-semibold"
          : "border-border hover:border-primary/50 hover:bg-muted",
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
      <span className="text-xs text-muted-foreground">{sub}</span>
    </button>
  );
}
