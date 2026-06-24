"use client";

import type { ReactNode } from "react";
import { MatchStreamPanel } from "@/components/matches/match-stream-panel";
import { YoutubeEmbed } from "@/components/matches/youtube-embed";
import { LiveLineupManager } from "@/components/live/live-lineup-manager";
import { BenchStrip, LivePitchBoard, LineupSummaryBar } from "@/components/live/live-pitch-board";
import type { Match } from "@/lib/schemas/match";
import type { LiveMatchMeta } from "@/lib/schemas/live-match";
import type { MatchLineups } from "@/lib/schemas/live-lineup";
import { sportEmoji } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, LayoutGrid, Users, Video, Radio,
} from "lucide-react";

export type BroadcastView = "overview" | "scoring" | "lineups" | "broadcast";

interface LiveBroadcastDeskProps {
  view: BroadcastView;
  onViewChange: (v: BroadcastView) => void;
  meta: LiveMatchMeta;
  firestoreMatch: Match | null;
  lineups: MatchLineups | null;
  lineupsLoading: boolean;
  matchId: string;
  authorId: string;
  authorName: string;
  scoringPanel: ReactNode;
  streamLinked: boolean;
}

const VIEWS: { id: BroadcastView; label: string; icon: typeof LayoutGrid }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "scoring", label: "Scoring", icon: LayoutGrid },
  { id: "lineups", label: "Lineups", icon: Users },
  { id: "broadcast", label: "Broadcast", icon: Video },
];

export function LiveBroadcastDesk({
  view,
  onViewChange,
  meta,
  firestoreMatch,
  lineups,
  lineupsLoading,
  matchId,
  authorId,
  authorName,
  scoringPanel,
  streamLinked,
}: LiveBroadcastDeskProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-gradient-to-r from-muted/40 via-card to-muted/40 shrink-0 overflow-x-auto">
        {VIEWS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onViewChange(id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition",
              view === id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {id === "broadcast" && streamLinked && (
              <span className="w-1.5 h-1.5 rounded-full bg-win animate-pulse" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-5">
        {view === "overview" && (
          <div className="max-w-6xl mx-auto space-y-5">
            <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
              <div className="rounded-2xl border border-border overflow-hidden bg-black shadow-lg">
                {firestoreMatch?.youtubeEmbedUrl ? (
                  <YoutubeEmbed
                    embedUrl={firestoreMatch.youtubeEmbedUrl}
                    title={firestoreMatch.liveStreamTitle ?? "Live broadcast"}
                  />
                ) : (
                  <div className="aspect-video flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                    <Video className="w-10 h-10 mb-2 opacity-40" />
                    <p className="text-sm">No stream linked</p>
                    <button
                      type="button"
                      onClick={() => onViewChange("broadcast")}
                      className="mt-2 text-xs text-primary hover:underline"
                    >
                      Set up broadcast →
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Live scoreboard</p>
                <div className="space-y-4">
                  {(["home", "away"] as const).map((side) => (
                    <div key={side} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-foreground truncate">
                          {side === "home" ? meta.homeTeamName : meta.awayTeamName}
                        </p>
                        {lineups && (
                          <p className="text-[10px] text-muted-foreground">
                            {lineups[side].onField.length} on field · {lineups[side].formation}
                          </p>
                        )}
                      </div>
                      <span className="text-3xl font-black score-digits tabular-nums">
                        {side === "home" ? meta.homeScore : meta.awayScore}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span className="capitalize">{meta.period?.replace(/_/g, " ")}</span>
                  <span className="flex items-center gap-1 text-primary font-semibold">
                    <Radio className="w-3 h-3" /> {meta.status}
                  </span>
                </div>
              </div>
            </div>

            {lineups && !lineupsLoading && (
              <div className="grid md:grid-cols-2 gap-4">
                {(["home", "away"] as const).map((side) => (
                  <div key={side} className="rounded-2xl border border-border bg-card p-3">
                    <div className="mb-2 px-1">
                      <LineupSummaryBar lineup={lineups[side]} />
                    </div>
                    <LivePitchBoard sport={meta.sport} lineup={lineups[side]} side={side} compact />
                    <div className="mt-2 pt-2 border-t border-border">
                      <BenchStrip lineup={lineups[side]} sport={meta.sport} onSelect={() => onViewChange("lineups")} compact />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {lineupsLoading && (
              <p className="text-sm text-muted-foreground text-center py-8">Loading lineups…</p>
            )}
          </div>
        )}

        {view === "scoring" && (
          <div className="max-w-3xl mx-auto space-y-4">
            {firestoreMatch?.youtubeEmbedUrl && (
              <div className="rounded-xl overflow-hidden border border-border">
                <YoutubeEmbed
                  embedUrl={firestoreMatch.youtubeEmbedUrl}
                  title={firestoreMatch.liveStreamTitle ?? "Live"}
                  aspect="wide"
                />
              </div>
            )}
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                {sportEmoji(meta.sport)} {meta.sport} — Scoring controls
              </p>
              {scoringPanel}
            </div>
          </div>
        )}

        {view === "lineups" && (
          <div className="max-w-6xl mx-auto">
            {lineupsLoading && (
              <p className="text-sm text-muted-foreground text-center py-12">Loading lineups from squad data…</p>
            )}
            {!lineupsLoading && !lineups && (
              <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
                Lineups not seeded yet. Re-start the match from the tournament page to load team rosters.
              </div>
            )}
            {lineups && (
              <>
                <p className="text-xs text-muted-foreground mb-4">
                  Tap bench players to place on pitch · Tap on-field player to bench · Select bench + on-field for substitution
                </p>
                <div className="grid lg:grid-cols-2 gap-4">
                  <LiveLineupManager
                    matchId={matchId}
                    sport={meta.sport}
                    side="home"
                    lineup={lineups.home}
                    period={meta.period}
                    authorId={authorId}
                    authorName={authorName}
                  />
                  <LiveLineupManager
                    matchId={matchId}
                    sport={meta.sport}
                    side="away"
                    lineup={lineups.away}
                    period={meta.period}
                    authorId={authorId}
                    authorName={authorName}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {view === "broadcast" && (
          <div className="max-w-4xl mx-auto space-y-5">
            {firestoreMatch ? (
              <div className="rounded-2xl border border-border bg-card p-5">
                <MatchStreamPanel match={firestoreMatch} tournamentId={meta.tournamentId ?? undefined} />
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="text-sm text-muted-foreground mb-4">
                  Link your YouTube live URL — viewers in the Swing app will see this stream.
                </p>
                <YoutubeEmbed title={meta.homeTeamName} />
              </div>
            )}
            <div className="rounded-xl border border-border bg-muted/20 p-4 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Broadcast tips</p>
              <p>• Use YouTube Studio to go live, then paste the watch or embed URL here.</p>
              <p>• Stream title appears on match cards in the app.</p>
              <p>• Overview tab shows a picture-in-picture style preview while you score.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
