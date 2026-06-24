"use client";

import { formatMatchClock, sportEmoji } from "@/lib/utils";
import type { LiveMatchMeta } from "@/lib/schemas/live-match";
import { Radio, Wifi, Users } from "lucide-react";

interface LiveControlHeaderProps {
  meta: LiveMatchMeta | null;
  clock: number;
  isConnected: boolean;
  presenceCount: number;
  streamLinked: boolean;
  matchHubHref?: string;
}

export function LiveControlHeader({
  meta,
  clock,
  isConnected,
  presenceCount,
  streamLinked,
  matchHubHref,
}: LiveControlHeaderProps) {
  const isLive = meta?.status === "live";

  return (
    <header className="shrink-0 border-b border-border bg-gradient-to-r from-card via-card to-muted/30">
      {/* Score ticker */}
      <div className="flex items-stretch min-h-[52px]">
        <div className="flex items-center gap-2 px-4 border-r border-border bg-primary/5 shrink-0">
          <span className={`w-2 h-2 rounded-full bg-primary ${isLive ? "live-dot" : "opacity-40"}`} />
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">
            {meta?.status ?? "…"}
          </span>
        </div>

        <div className="flex-1 flex items-center justify-center gap-4 md:gap-8 px-4 py-2 min-w-0">
          <div className="text-right min-w-0 flex-1">
            <p className="text-sm md:text-base font-bold text-foreground truncate">{meta?.homeTeamName ?? "Home"}</p>
          </div>
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <span className="text-2xl md:text-3xl font-black score-digits tabular-nums">{meta?.homeScore ?? 0}</span>
            <span className="text-lg text-muted-foreground font-light">:</span>
            <span className="text-2xl md:text-3xl font-black score-digits tabular-nums">{meta?.awayScore ?? 0}</span>
          </div>
          <div className="text-left min-w-0 flex-1">
            <p className="text-sm md:text-base font-bold text-foreground truncate">{meta?.awayTeamName ?? "Away"}</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center px-4 border-l border-border bg-muted/20 shrink-0 min-w-[72px]">
          <p className="text-lg md:text-xl font-black text-primary score-digits tabular-nums leading-none">
            {formatMatchClock(clock)}
          </p>
          <p className="text-[9px] text-muted-foreground capitalize mt-0.5 truncate max-w-[80px] text-center">
            {meta?.period?.replace(/_/g, " ") ?? "—"}
          </p>
        </div>
      </div>

      {/* Sub bar */}
      <div className="flex items-center gap-3 px-4 py-1.5 border-t border-border/60 text-xs text-muted-foreground bg-card/50">
        {meta?.sport && (
          <span>{sportEmoji(meta.sport)} {meta.sport}</span>
        )}
        <span className="hidden sm:inline">·</span>
        <span className={`flex items-center gap-1 ${isConnected ? "text-win" : ""}`}>
          <Wifi className="w-3 h-3" /> {isConnected ? "Connected" : "Connecting…"}
        </span>
        {presenceCount > 0 && (
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" /> {presenceCount} crew
          </span>
        )}
        {streamLinked && (
          <span className="flex items-center gap-1 text-primary">
            <Radio className="w-3 h-3" /> Stream on
          </span>
        )}
        <div className="flex-1" />
        {matchHubHref && (
          <a href={matchHubHref} className="hover:text-primary transition hidden sm:inline">
            Match hub
          </a>
        )}
        <a href="/dashboard" className="hover:text-foreground transition">← Exit</a>
      </div>
    </header>
  );
}
