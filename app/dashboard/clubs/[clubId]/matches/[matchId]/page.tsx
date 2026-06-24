"use client";

import { use } from "react";
import { MatchDetailView } from "@/components/matches/match-detail-view";

export default function ClubMatchDetailPage({ params }: { params: Promise<{ clubId: string; matchId: string }> }) {
  const { clubId, matchId } = use(params);
  return (
    <MatchDetailView
      clubId={clubId}
      matchId={matchId}
      backHref={`/dashboard/clubs/${clubId}/matches`}
      backLabel="All matches"
    />
  );
}
