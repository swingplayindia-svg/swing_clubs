"use client";

import { pushEvent, incrementScore, updateMatchMeta } from "@/lib/rtdb/live-match";
import { addCommentaryEntry, autoCommentary } from "@/lib/rtdb/commentary";
import type { LiveMatchMeta } from "@/lib/schemas/live-match";

interface FootballPanelProps {
  matchId: string;
  meta: LiveMatchMeta;
  authorId: string;
  authorName: string;
}

const BTN = "w-full py-3 rounded-xl font-bold text-sm transition active:scale-95";

export function FootballPanel({ matchId, meta, authorId, authorName }: FootballPanelProps) {
  const goal = async (team: "home" | "away") => {
    const teamName = team === "home" ? meta.homeTeamName : meta.awayTeamName;
    const period   = meta.period ?? "match";
    await Promise.all([
      incrementScore(matchId, team, 1),
      pushEvent(matchId, {
        type: "goal", timestamp: Date.now(), teamId: team, teamName,
        description: `Goal — ${teamName}`, period, undone: false, meta: {},
      }),
      addCommentaryEntry(matchId, {
        authorId, authorName, authorRole: "auto", type: "auto",
        text: autoCommentary("football", "goal", teamName),
        period, visibility: "public", pinned: false, highlighted: true, createdAt: Date.now(),
      }),
    ]);
  };

  const card = async (team: "home" | "away", color: "yellow" | "red") => {
    const teamName = team === "home" ? meta.homeTeamName : meta.awayTeamName;
    await Promise.all([
      pushEvent(matchId, {
        type: `${color}_card` as any, timestamp: Date.now(), teamId: team, teamName,
        description: `${color === "yellow" ? "Yellow" : "Red"} card — ${teamName}`,
        period: meta.period, undone: false, meta: { color },
      }),
      addCommentaryEntry(matchId, {
        authorId, authorName, authorRole: "auto", type: "auto",
        text: autoCommentary("football", `${color}_card`, teamName),
        period: meta.period, visibility: "public", pinned: false, highlighted: color === "red", createdAt: Date.now(),
      }),
    ]);
  };

  const periodBtn = async (label: string, period: string) => {
    await updateMatchMeta(matchId, { period, status: "live" });
    await addCommentaryEntry(matchId, {
      authorId, authorName, authorRole: "system", type: "milestone",
      text: `▶ ${label} started.`,
      period, visibility: "public", pinned: true, highlighted: false, createdAt: Date.now(),
    });
  };

  return (
    <div className="space-y-4">
      {/* Goals */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Goals</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => goal("home")} className={`${BTN} bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30`}>
            ⚽ {meta.homeTeamName} Goal
          </button>
          <button onClick={() => goal("away")} className={`${BTN} bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30`}>
            ⚽ {meta.awayTeamName} Goal
          </button>
        </div>
      </div>

      {/* Cards */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Cards</p>
        <div className="grid grid-cols-2 gap-2">
          {(["home", "away"] as const).map((team) => (
            <div key={team} className="space-y-2">
              <p className="text-xs text-center text-muted-foreground truncate">{team === "home" ? meta.homeTeamName : meta.awayTeamName}</p>
              <button onClick={() => card(team, "yellow")} className="w-full py-2 rounded-lg bg-chart-4/20 hover:bg-chart-4/30 text-chart-4 border border-chart-4/30 text-xs font-bold transition active:scale-95">
                🟨 Yellow
              </button>
              <button onClick={() => card(team, "red")} className="w-full py-2 rounded-lg bg-loss/20 hover:bg-loss/30 text-loss border border-loss/30 text-xs font-bold transition active:scale-95">
                🟥 Red
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Period */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Period</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => periodBtn("First Half", "first_half")} className="py-2 rounded-lg bg-muted hover:bg-accent text-muted-foreground hover:text-foreground text-xs font-medium border border-border transition active:scale-95">1st Half</button>
          <button onClick={() => periodBtn("Second Half", "second_half")} className="py-2 rounded-lg bg-muted hover:bg-accent text-muted-foreground hover:text-foreground text-xs font-medium border border-border transition active:scale-95">2nd Half</button>
          <button onClick={() => periodBtn("Extra Time 1st", "et_first")} className="py-2 rounded-lg bg-muted hover:bg-accent text-muted-foreground hover:text-foreground text-xs font-medium border border-border transition active:scale-95">ET 1st</button>
          <button onClick={() => periodBtn("Extra Time 2nd", "et_second")} className="py-2 rounded-lg bg-muted hover:bg-accent text-muted-foreground hover:text-foreground text-xs font-medium border border-border transition active:scale-95">ET 2nd</button>
        </div>
      </div>
    </div>
  );
}
