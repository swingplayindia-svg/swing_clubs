"use client";

import { useEffect, useState } from "react";
import { subscribeLineups } from "@/lib/rtdb/lineups";
import type { MatchLineups } from "@/lib/schemas/live-lineup";

export function useLiveLineups(matchId: string | null) {
  const [lineups, setLineups] = useState<MatchLineups | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!matchId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    return subscribeLineups(matchId, (data) => {
      setLineups(data);
      setIsLoading(false);
    });
  }, [matchId]);

  return { lineups, isLoading };
}
