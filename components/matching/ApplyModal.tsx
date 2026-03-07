"use client";

import { useState } from "react";
import { CheckCircle, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";

interface ApplyModalProps {
  jobId: string;
  jobTitle: string;
  companyName: string;
  open: boolean;
  onClose: () => void;
  onSuccess: (jobId: string) => void;
}

export default function ApplyModal({
  jobId,
  jobTitle,
  companyName,
  open,
  onClose,
  onSuccess,
}: ApplyModalProps) {
  const [coverLetter, setCoverLetter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/jobs/${jobId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverLetter: coverLetter.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit application.");
        return;
      }
      setSubmitted(true);
      onSuccess(jobId);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    if (submitting) return;
    setCoverLetter("");
    setSubmitted(false);
    setError("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative z-10 bg-background border rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {submitted ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <h2 className="text-xl font-semibold">Application Submitted!</h2>
            <p className="text-muted-foreground text-sm">
              You&apos;ve successfully applied for <strong>{jobTitle}</strong>{" "}
              at <strong>{companyName}</strong>.
            </p>
            <Button onClick={handleClose} className="mt-2">
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold">Apply for this Role</h2>
              <p className="text-sm text-muted-foreground mt-1">
                <span className="font-medium text-foreground">{jobTitle}</span>{" "}
                &middot; {companyName}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cover-letter">
                Cover Letter{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="cover-letter"
                placeholder="Tell the recruiter why you're a great fit for this role..."
                rows={6}
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                disabled={submitting}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {coverLetter.length}/2000
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Application"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
