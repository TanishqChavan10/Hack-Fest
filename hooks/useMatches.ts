"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { RankedCandidateResult } from "@/types";

interface UseMatchesOptions {
  jobId: string;
  enabled?: boolean;
}

interface UseMatchesReturn {
  matches: RankedCandidateResult[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  shortlist: (candidateId: string, jobId: string, isShortlisted: boolean) => Promise<void>;
  shortlisting: string | null; // candidateId currently being toggled
}

export function useMatches({ jobId, enabled = true }: UseMatchesOptions): UseMatchesReturn {
  const { data: session } = useSession();
  const [matches, setMatches] = useState<RankedCandidateResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shortlisting, setShortlisting] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    if (!jobId || !session?.user || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/match?jobId=${jobId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch matches");
      }
      const data = await res.json();
      setMatches(data.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [jobId, session, enabled]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const shortlist = async (candidateId: string, currentJobId: string, isShortlisted: boolean) => {
    setShortlisting(candidateId);
    try {
      const res = await fetch("/api/match/shortlist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, jobId: currentJobId, isShortlisted }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update shortlist");
      }
      // Optimistic update
      setMatches((prev) =>
        prev.map((m) =>
          m.candidateId === candidateId ? { ...m, isShortlisted } : m
        )
      );
    } finally {
      setShortlisting(null);
    }
  };

  return { matches, loading, error, refetch: fetchMatches, shortlist, shortlisting };
}
