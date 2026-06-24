"use client";

import { formationSlots } from "@/lib/live-formations";
import type { LiveLineupPlayer, TeamLineup } from "@/lib/schemas/live-lineup";
import { positionsForSport } from "@/lib/sport-positions";
import { cn } from "@/lib/utils";
import { MemberAvatar } from "@/components/teams/member-avatar";

interface LivePitchBoardProps {
  sport: string;
  lineup: TeamLineup;
  side: "home" | "away";
  compact?: boolean;
  selectedBenchId?: string | null;
  onSlotClick?: (slotIndex: number) => void;
  onPlayerClick?: (player: LiveLineupPlayer, onField: boolean) => void;
}

export function LivePitchBoard({
  sport,
  lineup,
  side,
  compact = false,
  selectedBenchId,
  onSlotClick,
  onPlayerClick,
}: LivePitchBoardProps) {
  const slots = formationSlots(sport, lineup.formation);
  const pitchClass =
    sport === "Cricket"
      ? "from-amber-950/80 via-amber-900/50 to-amber-950/80"
      : sport === "Basketball"
        ? "from-orange-950/80 via-orange-900/50 to-orange-950/80"
        : "from-emerald-950/80 via-emerald-900/50 to-emerald-950/80";

  const playerAtSlot = (idx: number) => lineup.onField.find((p) => p.slotIndex === idx);

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      <div
        className={cn(
          "relative rounded-2xl border border-white/10 bg-gradient-to-b overflow-hidden",
          pitchClass,
          compact ? "min-h-[200px]" : "min-h-[320px]",
        )}
      >
        <div className="absolute inset-3 border border-white/15 rounded-xl pointer-events-none" />
        <div className="absolute left-1/2 top-3 bottom-3 w-px bg-white/10 pointer-events-none" />
        <div className="absolute left-3 right-3 top-1/2 h-px bg-white/10 pointer-events-none" />
        {sport.toLowerCase() === "football" && (
          <div className="absolute left-1/2 -translate-x-1/2 top-3 w-24 h-10 border border-white/10 rounded-b-lg pointer-events-none" />
        )}

        <div className="absolute top-2 left-2 z-10">
          <span className="text-[9px] font-bold uppercase tracking-wider text-white/50 bg-black/30 px-2 py-0.5 rounded-full">
            {lineup.formation}
          </span>
        </div>

        {slots.map((slot, idx) => {
          const player = playerAtSlot(idx);
          const isPlaceTarget = selectedBenchId && !player;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (player) onPlayerClick?.(player, true);
                else onSlotClick?.(idx);
              }}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all",
                compact ? "w-12" : "w-16",
                isPlaceTarget && "animate-pulse",
              )}
              style={{ left: `${slot.x}%`, top: `${side === "away" ? 100 - slot.y : slot.y}%` }}
            >
              {player ? (
                <PitchPlayer player={player} compact={compact} />
              ) : (
                <div
                  className={cn(
                    "rounded-full border-2 border-dashed border-white/25 flex items-center justify-center",
                    compact ? "w-9 h-9" : "w-11 h-11",
                    isPlaceTarget && "border-primary bg-primary/20",
                  )}
                >
                  <span className="text-[8px] font-bold text-white/40">{slot.role}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PitchPlayer({
  player,
  compact,
}: {
  player: LiveLineupPlayer;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative">
        <MemberAvatar
          name={player.displayName}
          avatarUrl={player.avatarUrl}
          size={compact ? "sm" : "md"}
          className="ring-2 ring-white/30"
        />
        {player.jerseyNumber != null && (
          <span className="absolute -bottom-1 -right-1 min-w-[14px] h-3.5 px-0.5 rounded-full bg-black/80 text-[8px] font-bold text-white flex items-center justify-center">
            {player.jerseyNumber}
          </span>
        )}
      </div>
      <p className="text-[9px] font-semibold text-white/90 truncate max-w-[56px] text-center leading-tight">
        {player.displayName.split(" ")[0]}
      </p>
      {player.position && (
        <span className="text-[8px] text-white/45 uppercase">{player.position}</span>
      )}
    </div>
  );
}

interface BenchStripProps {
  lineup: TeamLineup;
  sport: string;
  selectedId?: string | null;
  onSelect: (player: LiveLineupPlayer) => void;
  compact?: boolean;
}

export function BenchStrip({ lineup, sport, selectedId, onSelect, compact }: BenchStripProps) {
  const positions = positionsForSport(sport);

  if (lineup.bench.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-2">No players on bench</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {lineup.bench.map((p) => (
        <button
          key={p.userId}
          type="button"
          onClick={() => onSelect(p)}
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-xl border transition text-left",
            selectedId === p.userId
              ? "border-primary bg-primary/10 ring-1 ring-primary/30"
              : "border-border bg-card hover:border-primary/30",
            compact && "px-1.5 py-1",
          )}
        >
          <MemberAvatar name={p.displayName} avatarUrl={p.avatarUrl} size="sm" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold truncate max-w-[72px]">{p.displayName.split(" ")[0]}</p>
            <p className="text-[9px] text-muted-foreground">{p.position ?? positions[0]}</p>
          </div>
          {selectedId === p.userId && (
            <span className="text-[9px] text-primary font-bold">Tap pitch</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function LineupSummaryBar({ lineup, onFieldCount }: { lineup: TeamLineup; onFieldCount?: number }) {
  const count = onFieldCount ?? lineup.onField.length;
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="font-bold text-foreground truncate">{lineup.teamName}</span>
      <span className="text-muted-foreground shrink-0">
        {count} on field · {lineup.bench.length} bench
      </span>
    </div>
  );
}
