"use client";

import type { TeamPlayer } from "@/lib/schemas/team";
import { FORMATION_ZONES, positionsForSport } from "@/lib/sport-positions";
import { MemberAvatar } from "@/components/teams/member-avatar";
import { Star } from "lucide-react";

interface SquadChartProps {
  players: TeamPlayer[];
  sport: string;
  captainId?: string;
}

export function SquadChart({ players, sport, captainId }: SquadChartProps) {
  const zones = FORMATION_ZONES[sport];
  const positions = positionsForSport(sport);

  const byPosition = positions.reduce<Record<string, TeamPlayer[]>>((acc, pos) => {
    acc[pos] = players.filter((p) => p.position === pos);
    return acc;
  }, {});

  const unassigned = players.filter(
    (p) => !p.position || !positions.includes(p.position),
  );

  const pitchClass =
    sport === "Cricket"
      ? "from-amber-900/40 via-amber-800/25 to-amber-900/40"
      : sport === "Basketball"
        ? "from-orange-900/35 via-orange-800/20 to-orange-900/35"
        : "from-emerald-900/40 via-emerald-800/25 to-emerald-900/40";

  return (
    <div className="space-y-4">
      <div
        className={`relative rounded-2xl border border-border bg-gradient-to-b ${pitchClass} p-4 min-h-[280px] overflow-hidden`}
      >
        <div className="absolute inset-4 border border-white/10 rounded-xl pointer-events-none" />
        <div className="absolute left-1/2 top-4 bottom-4 w-px bg-white/10 pointer-events-none" />

        {zones ? (
          <div className="relative z-10 flex flex-col justify-between h-full min-h-[248px] py-2 gap-4">
            {positions.map((pos) => {
              const group = byPosition[pos] ?? [];
              return (
                <div key={pos} className="flex items-center justify-center gap-3 flex-wrap">
                  {group.length === 0 ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30 px-2 py-1 rounded-full border border-white/10">
                      {pos}
                    </span>
                  ) : (
                    group.map((p) => (
                      <PlayerNode
                        key={p.userId}
                        player={p}
                        isCaptain={p.userId === captainId}
                        label={pos}
                      />
                    ))
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 min-h-[248px] content-center">
            {players.length === 0 ? (
              <p className="text-sm text-white/40">Add players to see the squad chart</p>
            ) : (
              players.map((p) => (
                <PlayerNode
                  key={p.userId}
                  player={p}
                  isCaptain={p.userId === captainId}
                  label={p.position ?? "—"}
                />
              ))
            )}
          </div>
        )}
      </div>

      {unassigned.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Bench / Unassigned</p>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((p) => (
              <PlayerNode
                key={p.userId}
                player={p}
                isCaptain={p.userId === captainId}
                label={p.position ?? "—"}
                compact
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerNode({
  player,
  isCaptain,
  label,
  compact = false,
}: {
  player: TeamPlayer;
  isCaptain: boolean;
  label: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1 ${compact ? "w-16" : "w-20"}`}
      title={player.displayName}
    >
      <div className="relative">
        <MemberAvatar
          name={player.displayName}
          avatarUrl={player.avatarUrl}
          size={compact ? "sm" : "md"}
          className="ring-2 ring-white/20"
        />
        {isCaptain && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center">
            <Star className="w-2.5 h-2.5 text-amber-950 fill-amber-950" />
          </span>
        )}
        {player.jerseyNumber != null && (
          <span className="absolute -bottom-1 -left-1 min-w-[16px] h-4 px-0.5 rounded-full bg-black/70 text-[9px] font-bold text-white flex items-center justify-center">
            {player.jerseyNumber}
          </span>
        )}
      </div>
      <p className="text-[10px] font-medium text-white/90 truncate w-full text-center leading-tight">
        {player.displayName.split(" ")[0]}
      </p>
      <span className="text-[9px] font-semibold uppercase tracking-wide text-white/50">{label}</span>
    </div>
  );
}
