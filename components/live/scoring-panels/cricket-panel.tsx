"use client";

import { pushEvent, incrementScore, updateMatchMeta } from "@/lib/rtdb/live-match";
import { addCommentaryEntry, autoCommentary } from "@/lib/rtdb/commentary";
import type { LiveMatchMeta, CricketMeta } from "@/lib/schemas/live-match";

interface CricketPanelProps {
  matchId: string;
  meta: LiveMatchMeta;
  authorId: string;
  authorName: string;
}

export function CricketPanel({ matchId, meta, authorId, authorName }: CricketPanelProps) {
  const sportMeta = (meta.sportMeta ?? {}) as Partial<CricketMeta>;
  const batting   = "home"; // simplified: home team bats first
  const teamName  = meta.homeTeamName;

  const addRuns = async (runs: number, type: string = "run") => {
    const over = `${sportMeta.currentOver ?? 0}.${sportMeta.currentBall ?? 0}`;
    const nextBall = ((sportMeta.currentBall ?? 0) + 1) % 7; // 0-6 balls
    const nextOver = nextBall === 0 ? (sportMeta.currentOver ?? 0) + 1 : (sportMeta.currentOver ?? 0);

    await Promise.all([
      incrementScore(matchId, batting, runs),
      updateMatchMeta(matchId, {
        sportMeta: { ...sportMeta, currentBall: nextBall, currentOver: nextOver } as CricketMeta,
      }),
      pushEvent(matchId, {
        type: type as any, timestamp: Date.now(), teamId: batting, teamName,
        description: `${over} — ${runs} run${runs !== 1 ? "s" : ""}`,
        value: runs, period: meta.period, undone: false, meta: { over },
      }),
      addCommentaryEntry(matchId, {
        authorId, authorName, authorRole: "auto", type: "auto",
        text: autoCommentary("cricket", type === "six" ? "six" : type === "four" ? "four" : "run", teamName, undefined, runs),
        period: meta.period, visibility: "public", pinned: false, highlighted: runs >= 4, createdAt: Date.now(),
      }),
    ]);
  };

  const addWicket = async () => {
    const over = `${sportMeta.currentOver ?? 0}.${sportMeta.currentBall ?? 0}`;
    const nextWickets = (sportMeta.wickets ?? 0) + 1;
    await Promise.all([
      updateMatchMeta(matchId, {
        sportMeta: { ...sportMeta, wickets: nextWickets } as CricketMeta,
      }),
      pushEvent(matchId, {
        type: "wicket", timestamp: Date.now(), teamId: batting === "home" ? "away" : "home",
        teamName: batting === "home" ? meta.awayTeamName : meta.homeTeamName,
        description: `${over} — WICKET! ${nextWickets} down`,
        period: meta.period, undone: false, meta: { wickets: nextWickets },
      }),
      addCommentaryEntry(matchId, {
        authorId, authorName, authorRole: "auto", type: "milestone",
        text: autoCommentary("cricket", "wicket", batting === "home" ? meta.awayTeamName : meta.homeTeamName),
        period: meta.period, visibility: "public", pinned: true, highlighted: true, createdAt: Date.now(),
      }),
    ]);
  };

  const addExtra = async (type: "wide" | "no_ball" | "bye" | "leg_bye") => {
    await Promise.all([
      incrementScore(matchId, batting, 1),
      pushEvent(matchId, {
        type, timestamp: Date.now(), teamId: batting, teamName,
        description: type.replace("_", " "), value: 1, period: meta.period, undone: false, meta: {},
      }),
    ]);
  };

  const runBtns = [0, 1, 2, 3, 4, 6];

  return (
    <div className="space-y-4">
      {/* Score display */}
      <div className="rounded-xl bg-muted/30 border border-border p-3 text-center">
        <p className="text-4xl font-bold text-foreground score-digits">
          {batting === "home" ? meta.homeScore : meta.awayScore}/{sportMeta.wickets ?? 0}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Ov {sportMeta.currentOver ?? 0}.{sportMeta.currentBall ?? 0}
          {sportMeta.totalOvers ? ` / ${sportMeta.totalOvers}` : ""}
        </p>
      </div>

      {/* Run buttons */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Runs</p>
        <div className="grid grid-cols-3 gap-2">
          {runBtns.map((r) => (
            <button
              key={r}
              onClick={() => addRuns(r, r === 4 ? "four" : r === 6 ? "six" : "run")}
              className={`py-3 rounded-xl font-bold text-sm transition active:scale-95 ${
                r === 6 ? "bg-primary text-primary-foreground hover:bg-primary/90" :
                r === 4 ? "bg-chart-2/25 text-chart-2 border border-chart-2/40 hover:bg-chart-2/35" :
                "bg-muted hover:bg-accent text-foreground border border-border"
              }`}
            >
              {r === 0 ? "Dot" : r === 4 ? "FOUR" : r === 6 ? "SIX!" : r}
            </button>
          ))}
        </div>
      </div>

      {/* Wicket */}
      <button
        onClick={addWicket}
        disabled={(sportMeta.wickets ?? 0) >= 10}
        className="w-full py-3 rounded-xl bg-loss/25 hover:bg-loss/35 text-loss border border-loss/40 font-bold text-sm transition active:scale-95 disabled:opacity-40"
      >
        🏏 WICKET! ({sportMeta.wickets ?? 0}/10)
      </button>

      {/* Extras */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Extras (+1 run)</p>
        <div className="grid grid-cols-2 gap-2">
          {(["wide", "no_ball", "bye", "leg_bye"] as const).map((e) => (
            <button
              key={e}
              onClick={() => addExtra(e)}
              className="py-2 rounded-lg bg-muted hover:bg-accent text-muted-foreground hover:text-foreground text-xs font-medium border border-border transition active:scale-95 capitalize"
            >
              {e.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
