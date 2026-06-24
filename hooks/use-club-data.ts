"use client";

import { useEffect, useState } from "react";
import { subscribeClub, subscribeMembers, subscribeJoinRequests } from "@/lib/firestore/clubs";
import { subscribeTeams } from "@/lib/firestore/teams";
import { subscribeMatches, subscribeLiveMatches } from "@/lib/firestore/matches";
import { subscribeTournaments } from "@/lib/firestore/tournaments";
import { subscribeStandings } from "@/lib/firestore/standings";
import { subscribeNews } from "@/lib/firestore/news";
import type { Club, ClubMember, JoinRequest } from "@/lib/schemas/club";
import type { Team } from "@/lib/schemas/team";
import type { Match } from "@/lib/schemas/match";
import type { Tournament } from "@/lib/schemas/tournament";
import type { Standing } from "@/lib/schemas/standing";
import type { NewsPost } from "@/lib/schemas/news";

export function useClub(clubId: string | null) {
  const [club, setClub] = useState<Club | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!clubId) { setIsLoading(false); return; }
    setIsLoading(true);
    const unsub = subscribeClub(clubId, (c) => { setClub(c); setIsLoading(false); });
    return unsub;
  }, [clubId]);

  return { club, isLoading };
}

export function useMembers(clubId: string | null) {
  const [members, setMembers] = useState<ClubMember[]>([]);
  useEffect(() => {
    if (!clubId) return;
    return subscribeMembers(clubId, setMembers);
  }, [clubId]);
  return { members };
}

export function useJoinRequests(clubId: string | null) {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  useEffect(() => {
    if (!clubId) return;
    return subscribeJoinRequests(clubId, setRequests);
  }, [clubId]);
  return { requests };
}

export function useTeams(clubId: string | null, tournamentId?: string) {
  const [teams, setTeams] = useState<Team[]>([]);
  useEffect(() => {
    if (!clubId) return;
    return subscribeTeams(clubId, setTeams, tournamentId);
  }, [clubId, tournamentId]);
  return { teams };
}

export function useMatches(clubId: string | null, tournamentId?: string) {
  const [matches, setMatches] = useState<Match[]>([]);
  useEffect(() => {
    if (!clubId) return;
    return subscribeMatches(clubId, setMatches, tournamentId);
  }, [clubId, tournamentId]);
  return { matches };
}

export function useLiveMatches(clubId: string | null) {
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  useEffect(() => {
    if (!clubId) return;
    return subscribeLiveMatches(clubId, setLiveMatches);
  }, [clubId]);
  return { liveMatches };
}

export function useTournaments(clubId: string | null) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  useEffect(() => {
    if (!clubId) return;
    return subscribeTournaments(clubId, setTournaments);
  }, [clubId]);
  return { tournaments };
}

export function useStandings(clubId: string | null, tournamentId?: string) {
  const [standings, setStandings] = useState<Standing[]>([]);
  useEffect(() => {
    if (!clubId) return;
    return subscribeStandings(clubId, setStandings, tournamentId);
  }, [clubId, tournamentId]);
  return { standings };
}

export function useNews(clubId: string | null) {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  useEffect(() => {
    if (!clubId) return;
    return subscribeNews(clubId, setPosts);
  }, [clubId]);
  return { posts };
}
