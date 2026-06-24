"use client";

import { updateMatchMeta, pushEvent } from "@/lib/rtdb/live-match";
import { addCommentaryEntry } from "@/lib/rtdb/commentary";
import type { LiveMatchMeta, PadelMeta } from "@/lib/schemas/live-match";

interface PadelPanelProps {
  matchId: string;
  meta: LiveMatchMeta;
  authorId: string;
  authorName: string;
}

const POINTS = ["0", "15", "30", "40", "A"];

function nextPoint(current: number, other: number): { home: number; away: number; gameWon: "home" | "away" | null } {
  if (current === 3 && other === 3) return { home: 4, away: 3, gameWon: null }; // to Adv
  if (current === 4 && other === 3) return { home: 0, away: 0, gameWon: "home" }; // win from Adv
  if (current === 4 && other === 4) return { home: 3, away: 3, gameWon: null }; // back to Deuce
  if (current === 3 && other < 3) return { home: 0, away: 0, gameWon: "home" }; // win
  return { home: Math.min(current + 1, 4), away: other, gameWon: null };
}

export function PadelPanel({ matchId, meta, authorId, authorName }: PadelPanelProps) {
  const pm: PadelMeta = {
    sets: meta.sportMeta ? (meta.sportMeta as PadelMeta).sets ?? [] : [],
    currentSet: meta.sportMeta ? (meta.sportMeta as PadelMeta).currentSet ?? 0 : 0,
    gamesHome: meta.sportMeta ? (meta.sportMeta as PadelMeta).gamesHome ?? 0 : 0,
    gamesAway: meta.sportMeta ? (meta.sportMeta as PadelMeta).gamesAway ?? 0 : 0,
    pointsHome: meta.sportMeta ? (meta.sportMeta as PadelMeta).pointsHome ?? 0 : 0,
    pointsAway: meta.sportMeta ? (meta.sportMeta as PadelMeta).pointsAway ?? 0 : 0,
    tiebreak: meta.sportMeta ? (meta.sportMeta as PadelMeta).tiebreak ?? false : false,
    advantages: null,
  };

  const awardPoint = async (team: "home" | "away") => {
    let newPm = { ...pm };
    const curHome = pm.pointsHome;
    const curAway = pm.pointsAway;

    if (team === "home") {
      const res = nextPoint(curHome, curAway);
      if (res.gameWon) {
        // Game won
        newPm.pointsHome = 0;
        newPm.pointsAway = 0;
        newPm.gamesHome += 1;
        await awardGame(newPm, "home");
        return;
      } else {
        newPm.pointsHome = res.home;
        newPm.pointsAway = res.away;
      }
    } else {
      const res = nextPoint(curAway, curHome);
      if (res.gameWon) {
        newPm.pointsHome = 0;
        newPm.pointsAway = 0;
        newPm.gamesAway += 1;
        await awardGame(newPm, "away");
        return;
      } else {
        newPm.pointsHome = res.away;
        newPm.pointsAway = res.home;
      }
    }

    await updateMatchMeta(matchId, { sportMeta: newPm });
    await addCommentaryEntry(matchId, {
      authorId, authorName, authorRole: "auto", type: "auto",
      text: `Point → ${team === "home" ? meta.homeTeamName : meta.awayTeamName}. ${POINTS[newPm.pointsHome]}-${POINTS[newPm.pointsAway]}`,
      period: meta.period, visibility: "public", pinned: false, highlighted: false, createdAt: Date.now(),
    });
  };

  const awardGame = async (newPm: PadelMeta, team: "home" | "away") => {
    const homeGames = newPm.gamesHome;
    const awayGames = newPm.gamesAway;
    let setWon: "home" | "away" | null = null;

    if (homeGames >= 6 && homeGames - awayGames >= 2) setWon = "home";
    else if (awayGames >= 6 && awayGames - homeGames >= 2) setWon = "away";
    else if (homeGames === 7) setWon = "home";
    else if (awayGames === 7) setWon = "away";

    if (setWon) {
      const newSets = [...(newPm.sets ?? []), [homeGames, awayGames] as [number, number]];
      newPm.sets       = newSets;
      newPm.gamesHome  = 0;
      newPm.gamesAway  = 0;
      newPm.currentSet = (newPm.currentSet ?? 0) + 1;

      // Check match win (best of 3 sets)
      const homeSets = newSets.filter(([h, a]) => h > a).length;
      const awaySets = newSets.filter(([h, a]) => a > h).length;
      const matchOver = homeSets === 2 || awaySets === 2;

      await updateMatchMeta(matchId, { sportMeta: newPm, ...(matchOver ? { status: "completed" as any } : {}) });
      await Promise.all([
        pushEvent(matchId, {
          type: "set", timestamp: Date.now(), teamId: setWon, teamName: setWon === "home" ? meta.homeTeamName : meta.awayTeamName,
          description: `Set won!`, period: meta.period, undone: false, meta: { sets: newSets },
        }),
        addCommentaryEntry(matchId, {
          authorId, authorName, authorRole: "auto", type: "milestone",
          text: `SET ${setWon === "home" ? meta.homeTeamName : meta.awayTeamName}! ${newSets.map(([h, a]) => `${h}-${a}`).join(", ")}`,
          period: meta.period, visibility: "public", pinned: true, highlighted: true, createdAt: Date.now(),
        }),
      ]);
      if (setWon === "home") await updateMatchMeta(matchId, { homeScore: homeSets });
      else await updateMatchMeta(matchId, { awayScore: awaySets });
    } else {
      await updateMatchMeta(matchId, { sportMeta: newPm });
      await addCommentaryEntry(matchId, {
        authorId, authorName, authorRole: "auto", type: "auto",
        text: `Game ${team === "home" ? meta.homeTeamName : meta.awayTeamName}! ${homeGames}-${awayGames}`,
        period: meta.period, visibility: "public", pinned: false, highlighted: false, createdAt: Date.now(),
      });
    }
  };

  const pLabel = (pts: number) => POINTS[pts] ?? pts;

  return (
    <div className="space-y-4">
      {/* Current game score */}
      <div className="rounded-xl bg-muted/30 border border-border p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 text-center">Current Game</p>
        <div className="grid grid-cols-3 items-center text-center gap-2">
          <div>
            <p className="text-xs text-muted-foreground truncate">{meta.homeTeamName}</p>
            <p className="text-4xl font-bold text-foreground score-digits">{pLabel(pm.pointsHome)}</p>
          </div>
          <div className="text-muted-foreground font-bold">—</div>
          <div>
            <p className="text-xs text-muted-foreground truncate">{meta.awayTeamName}</p>
            <p className="text-4xl font-bold text-foreground score-digits">{pLabel(pm.pointsAway)}</p>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-2">Games: {pm.gamesHome} — {pm.gamesAway}</p>
      </div>

      {/* Sets */}
      {(pm.sets ?? []).length > 0 && (
        <div className="flex items-center gap-2 justify-center">
          {(pm.sets ?? []).map(([h, a], i) => (
            <div key={i} className="rounded-lg bg-muted px-3 py-1 text-xs font-bold text-foreground">{h}—{a}</div>
          ))}
        </div>
      )}

      {/* Point buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => awardPoint("home")}
          className="py-4 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 font-bold text-sm transition active:scale-95"
        >
          Point {meta.homeTeamName}
        </button>
        <button
          onClick={() => awardPoint("away")}
          className="py-4 rounded-xl bg-chart-3/20 hover:bg-chart-3/30 text-chart-3 border border-chart-3/30 font-bold text-sm transition active:scale-95"
        >
          Point {meta.awayTeamName}
        </button>
      </div>
    </div>
  );
}
