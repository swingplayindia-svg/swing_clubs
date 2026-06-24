"use client";

import { useState } from "react";
import {
  assignPlayerToSlot,
  changeFormation,
  movePlayerToBench,
  substitutePlayer,
  updateTeamLineup,
} from "@/lib/rtdb/lineups";
import { formationsForSport } from "@/lib/live-formations";
import type { LiveLineupPlayer, TeamLineup } from "@/lib/schemas/live-lineup";
import { positionsForSport } from "@/lib/sport-positions";
import { BenchStrip, LivePitchBoard } from "@/components/live/live-pitch-board";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface LiveLineupManagerProps {
  matchId: string;
  sport: string;
  side: "home" | "away";
  lineup: TeamLineup;
  period: string;
  authorId: string;
  authorName: string;
}

export function LiveLineupManager({
  matchId,
  sport,
  side,
  lineup,
  period,
  authorId,
  authorName,
}: LiveLineupManagerProps) {
  const [selectedBench, setSelectedBench] = useState<LiveLineupPlayer | null>(null);
  const [saving, setSaving] = useState(false);

  const formations = formationsForSport(sport);
  const positions = positionsForSport(sport);

  const handleFormationChange = async (formation: string) => {
    setSaving(true);
    try {
      await changeFormation(matchId, side, lineup, formation);
      toast.success(`Formation → ${formation}`);
    } catch {
      toast.error("Failed to update formation");
    } finally {
      setSaving(false);
    }
  };

  const handleSlotClick = async (slotIndex: number) => {
    if (!selectedBench) return;
    setSaving(true);
    try {
      await assignPlayerToSlot(matchId, side, lineup, selectedBench, slotIndex);
      setSelectedBench(null);
    } catch {
      toast.error("Could not place player");
    } finally {
      setSaving(false);
    }
  };

  const handleOnFieldClick = async (player: LiveLineupPlayer) => {
    if (selectedBench) {
      setSaving(true);
      try {
        await substitutePlayer(matchId, side, lineup, player.userId, selectedBench, {
          teamName: lineup.teamName,
          period,
          authorId,
          authorName,
        });
        setSelectedBench(null);
        toast.success("Substitution recorded");
      } catch {
        toast.error("Substitution failed");
      } finally {
        setSaving(false);
      }
      return;
    }
    setSaving(true);
    try {
      await movePlayerToBench(matchId, side, lineup, player.userId);
    } catch {
      toast.error("Could not move player");
    } finally {
      setSaving(false);
    }
  };

  const updatePlayerPosition = async (userId: string, position: string, onField: boolean) => {
    const list = onField ? lineup.onField : lineup.bench;
    const updated = list.map((p) => (p.userId === userId ? { ...p, position } : p));
    setSaving(true);
    try {
      await updateTeamLineup(matchId, side, onField ? { onField: updated } : { bench: updated });
    } catch {
      toast.error("Failed to save position");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-foreground">{lineup.teamName}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider capitalize">{side} team</p>
        </div>
        <div className="flex items-center gap-2">
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          <select
            value={lineup.formation}
            onChange={(e) => void handleFormationChange(e.target.value)}
            disabled={saving}
            className="px-2 py-1 rounded-lg bg-input border border-border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {Object.entries(formations).map(([key, f]) => (
              <option key={key} value={key}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>

      {(selectedBench) && (
        <div className="px-4 py-2 bg-primary/10 border-b border-primary/20 text-xs text-primary flex items-center gap-2">
          <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" />
          {`「${selectedBench.displayName}」— tap a player to sub off, or an empty slot to place`}
          <button
            type="button"
            onClick={() => setSelectedBench(null)}
            className="ml-auto text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="p-4">
        <LivePitchBoard
          sport={sport}
          lineup={lineup}
          side={side}
          selectedBenchId={selectedBench?.userId}
          onSlotClick={(idx) => void handleSlotClick(idx)}
          onPlayerClick={(p) => void handleOnFieldClick(p)}
        />
      </div>

      <div className="px-4 pb-3 border-t border-border pt-3">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Bench</p>
        <BenchStrip
          lineup={lineup}
          sport={sport}
          selectedId={selectedBench?.userId}
          onSelect={setSelectedBench}
        />
      </div>

      <div className="px-4 pb-4 border-t border-border pt-3">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">On-field positions</p>
        <div className="space-y-1.5 max-h-36 overflow-y-auto">
          {lineup.onField.map((p) => (
            <div key={p.userId} className="flex items-center gap-2 text-xs">
              <span className="font-medium truncate flex-1">{p.displayName}</span>
              <select
                value={p.position ?? ""}
                onChange={(e) => void updatePlayerPosition(p.userId, e.target.value, true)}
                className="px-1.5 py-0.5 rounded bg-input border border-border text-[10px]"
              >
                <option value="">Role</option>
                {positions.map((pos) => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
