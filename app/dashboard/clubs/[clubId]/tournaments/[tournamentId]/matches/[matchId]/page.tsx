"use client";

import { use } from "react";
import { MatchDetailView } from "@/components/matches/match-detail-view";

export default function TournamentMatchDetailPage({
  params,
}: {
  params: Promise<{ clubId: string; tournamentId: string; matchId: string }>;
}) {
  const { clubId, tournamentId, matchId } = use(params);
  return (
    <MatchDetailView
      clubId={clubId}
      matchId={matchId}
      tournamentId={tournamentId}
      backHref={`/dashboard/clubs/${clubId}/tournaments/${tournamentId}/matches`}
      backLabel="Tournament matches"
    />
  );
}
