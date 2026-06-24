"use client";

import { useEffect, useState } from "react";
import { getClubsForUser, getAdminClubsForUser } from "@/lib/firestore/clubs";
import type { Club } from "@/lib/schemas/club";
import type { AuthUser } from "@/hooks/use-auth";

export function useClubs(user: AuthUser | null) {
  const [clubs,     setClubs]     = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setClubs([]); setIsLoading(false); return; }
    setIsLoading(true);
    Promise.all([getClubsForUser(user.uid), getAdminClubsForUser(user.uid)])
      .then(([owned, managed]) => {
        const seen = new Set<string>();
        const all = [...owned, ...managed].filter((c) => !seen.has(c.id) && seen.add(c.id));
        setClubs(all);
      })
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [user?.uid]);

  return { clubs, isLoading, error };
}
