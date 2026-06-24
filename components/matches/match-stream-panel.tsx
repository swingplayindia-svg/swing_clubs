"use client";

import { useState } from "react";
import { updateMatch } from "@/lib/firestore/matches";
import { YoutubeEmbed } from "@/components/matches/youtube-embed";
import { isValidYoutubeUrl, toYoutubeEmbedUrl, toYoutubeWatchUrl } from "@/lib/youtube";
import type { Match } from "@/lib/schemas/match";
import { ExternalLink, Loader2, Radio, Save, Video } from "lucide-react";
import { toast } from "sonner";

interface MatchStreamPanelProps {
  match: Match;
  tournamentId?: string;
  compact?: boolean;
}

export function MatchStreamPanel({ match, tournamentId, compact = false }: MatchStreamPanelProps) {
  const [streamUrl, setStreamUrl] = useState(match.streamUrl ?? match.youtubeEmbedUrl ?? "");
  const [title, setTitle] = useState(match.liveStreamTitle ?? "");
  const [saving, setSaving] = useState(false);

  const previewEmbed = toYoutubeEmbedUrl(streamUrl) ?? match.youtubeEmbedUrl;

  const handleSave = async () => {
    if (streamUrl && !isValidYoutubeUrl(streamUrl)) {
      toast.error("Enter a valid YouTube URL.");
      return;
    }
    setSaving(true);
    try {
      const embed = streamUrl ? toYoutubeEmbedUrl(streamUrl) : undefined;
      const watch = streamUrl ? toYoutubeWatchUrl(streamUrl) : undefined;
      await updateMatch(match.clubId, match.id, {
        streamUrl: (watch ?? streamUrl) || undefined,
        youtubeEmbedUrl: embed,
        liveStreamTitle: title.trim() || undefined,
      }, tournamentId);
      toast.success("Stream settings saved.");
    } catch {
      toast.error("Failed to save stream settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={compact ? "space-y-3" : "space-y-5"}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
          <Video className="w-4 h-4 text-red-500" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">YouTube Live Stream</h3>
          <p className="text-xs text-muted-foreground">Controls what viewers see in the app</p>
        </div>
        {match.status === "live" && (
          <span className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase">
            <Radio className="w-3 h-3" /> Live
          </span>
        )}
      </div>

      <YoutubeEmbed
        embedUrl={previewEmbed ?? undefined}
        title={title || match.homeTeamName}
        className={compact ? "" : "ring-1 ring-border/50"}
      />

      <div className="space-y-3">
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
            Stream title (optional)
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Strike Hitters vs Thunder XI — Final"
            className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
            YouTube URL
          </label>
          <input
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=… or live link"
            className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Supports watch, live, embed, and youtu.be links
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save stream
          </button>
          {previewEmbed && (
            <a
              href={toYoutubeWatchUrl(streamUrl) ?? streamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition"
            >
              Open on YouTube <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
