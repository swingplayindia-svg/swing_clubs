"use client";

import { incrementScore, pushEvent, updateMatchMeta } from "@/lib/rtdb/live-match";
import { addCommentaryEntry, autoCommentary } from "@/lib/rtdb/commentary";
import type { LiveMatchMeta, BasketballMeta } from "@/lib/schemas/live-match";

interface BasketballPanelProps {
  matchId: string;
  meta: LiveMatchMeta;
  authorId: string;
  authorName: string;
}

export function BasketballPanel({ matchId, meta, authorId, authorName }: BasketballPanelProps) {
  const bm: BasketballMeta = {
    quarter:      (meta.sportMeta as Partial<BasketballMeta>)?.quarter ?? 1,
    foulsHome:    (meta.sportMeta as Partial<BasketballMeta>)?.foulsHome ?? 0,
    foulsAway:    (meta.sportMeta as Partial<BasketballMeta>)?.foulsAway ?? 0,
    timeoutsHome: (meta.sportMeta as Partial<BasketballMeta>)?.timeoutsHome ?? 3,
    timeoutsAway: (meta.sportMeta as Partial<BasketballMeta>)?.timeoutsAway ?? 3,
  };

  const score = async (team: "home" | "away", pts: number, type: string) => {
    const teamName = team === "home" ? meta.homeTeamName : meta.awayTeamName;
    await Promise.all([
      incrementScore(matchId, team, pts),
      pushEvent(matchId, {
        type: type as any, timestamp: Date.now(), teamId: team, teamName,
        description: `${pts}pts — ${teamName}`, value: pts, period: `Q${bm.quarter}`, undone: false, meta: {},
      }),
      addCommentaryEntry(matchId, {
        authorId, authorName, authorRole: "auto", type: "auto",
        text: autoCommentary("basketball", type, teamName),
        period: `Q${bm.quarter}`, visibility: "public", pinned: false, highlighted: pts === 3, createdAt: Date.now(),
      }),
    ]);
  };

  const foul = async (team: "home" | "away") => {
    const teamName = team === "home" ? meta.homeTeamName : meta.awayTeamName;
    const newFouls = team === "home" ? bm.foulsHome + 1 : bm.foulsAway + 1;
    await Promise.all([
      updateMatchMeta(matchId, { sportMeta: { ...bm, [team === "home" ? "foulsHome" : "foulsAway"]: newFouls } as BasketballMeta }),
      pushEvent(matchId, {
        type: "foul", timestamp: Date.now(), teamId: team, teamName,
        description: `Foul — ${teamName} (${newFouls})`, period: `Q${bm.quarter}`, undone: false, meta: { fouls: newFouls },
      }),
    ]);
  };

  const nextQuarter = async () => {
    const next = Math.min(bm.quarter + 1, 4);
    await updateMatchMeta(matchId, { sportMeta: { ...bm, quarter: next } as BasketballMeta, period: `Q${next}` });
    await addCommentaryEntry(matchId, {
      authorId, authorName, authorRole: "system", type: "milestone",
      text: `▶ Quarter ${next} started.`, period: `Q${next}`,
      visibility: "public", pinned: true, highlighted: false, createdAt: Date.now(),
    });
  };

  const ScoreGroup = ({ team, label }: { team: "home" | "away"; label: string }) => (
    <div className="space-y-2">
      <p className="text-xs text-center text-muted-foreground font-medium truncate">{label}</p>
      <button onClick={() => score(team, 2, "two_points")} className="w-full py-2.5 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 font-bold text-sm transition active:scale-95">+2</button>
      <button onClick={() => score(team, 3, "three_points")} className="w-full py-2.5 rounded-xl bg-chart-5/20 hover:bg-chart-5/30 text-chart-5 border border-chart-5/30 font-bold text-sm transition active:scale-95">+3 🎯</button>
      <button onClick={() => score(team, 1, "free_throw")} className="w-full py-2 rounded-xl bg-muted hover:bg-accent text-muted-foreground text-xs font-medium border border-border transition active:scale-95">Free Throw</button>
      <button onClick={() => foul(team)} className="w-full py-2 rounded-xl bg-chart-4/20 hover:bg-chart-4/30 text-chart-4 border border-chart-4/30 text-xs font-medium transition active:scale-95">Foul ({team === "home" ? bm.foulsHome : bm.foulsAway})</button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <ScoreGroup team="home" label={meta.homeTeamName} />
        <ScoreGroup team="away" label={meta.awayTeamName} />
      </div>

      <div className="rounded-xl bg-muted/30 border border-border px-4 py-2.5 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Quarter {bm.quarter}/4</span>
        <button onClick={nextQuarter} disabled={bm.quarter >= 4} className="px-3 py-1 rounded-lg bg-muted hover:bg-accent text-xs font-medium border border-border transition active:scale-95 disabled:opacity-40">Next Quarter →</button>
      </div>
    </div>
  );
}
