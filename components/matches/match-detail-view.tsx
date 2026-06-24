"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMatch, useTeam } from "@/hooks/use-club-data";
import { updateMatch } from "@/lib/firestore/matches";
import { startMatchLive } from "@/lib/start-match";
import { MatchStreamPanel } from "@/components/matches/match-stream-panel";
import { YoutubeEmbed } from "@/components/matches/youtube-embed";
import {
  awardOptionsForSport,
  type HighlightType,
  type Match,
  type MatchAward,
  type MatchAwardType,
  type MatchHighlight,
  type MatchStatus,
} from "@/lib/schemas/match";
import type { TeamPlayer } from "@/lib/schemas/team";
import { isValidYoutubeUrl, toYoutubeEmbedUrl, toYoutubeWatchUrl } from "@/lib/youtube";
import { formatDate, formatTime, sportEmoji } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Award,
  Calendar,
  ChevronRight,
  ExternalLink,
  Film,
  Loader2,
  MapPin,
  Plus,
  Radio,
  Save,
  Sparkles,
  Star,
  Trash2,
  Trophy,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";

type Tab = "overview" | "stream" | "highlights" | "recap";

const statusStyles: Record<MatchStatus, string> = {
  scheduled: "bg-muted text-muted-foreground",
  live: "bg-primary/20 text-primary",
  halftime: "bg-chart-4/20 text-chart-4",
  completed: "bg-win/20 text-win",
  cancelled: "bg-loss/20 text-loss",
  postponed: "bg-muted text-muted-foreground",
};

const HIGHLIGHT_TYPES: { value: HighlightType; label: string }[] = [
  { value: "full_match", label: "Full match" },
  { value: "goal", label: "Goal" },
  { value: "wicket", label: "Wicket" },
  { value: "save", label: "Save" },
  { value: "dunk", label: "Dunk" },
  { value: "ace", label: "Ace" },
  { value: "other", label: "Other" },
];

interface MatchDetailViewProps {
  clubId: string;
  matchId: string;
  tournamentId?: string;
  backHref: string;
  backLabel?: string;
}

function PlayerPicker({
  players,
  value,
  onChange,
  label,
}: {
  players: (TeamPlayer & { teamName: string; teamId: string })[];
  value: string;
  onChange: (player: TeamPlayer & { teamName: string; teamId: string }) => void;
  label: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => {
          const p = players.find((pl) => pl.userId === e.target.value);
          if (p) onChange(p);
        }}
        className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <option value="">Select player…</option>
        {players.map((p) => (
          <option key={p.userId} value={p.userId}>
            {p.displayName} ({p.teamName})
          </option>
        ))}
      </select>
    </div>
  );
}

export function MatchDetailView({ clubId, matchId, tournamentId, backHref, backLabel = "Back" }: MatchDetailViewProps) {
  const { match, isLoading } = useMatch(clubId, matchId, tournamentId);
  const { team: homeTeam } = useTeam(clubId, match?.homeTeamId ?? null, tournamentId);
  const { team: awayTeam } = useTeam(clubId, match?.awayTeamId ?? null, tournamentId);

  const [tab, setTab] = useState<Tab>("overview");
  const [starting, setStarting] = useState(false);
  const [savingRecap, setSavingRecap] = useState(false);
  const [recap, setRecap] = useState("");
  const [attendance, setAttendance] = useState("");
  const [notes, setNotes] = useState("");

  const [hlTitle, setHlTitle] = useState("");
  const [hlUrl, setHlUrl] = useState("");
  const [hlType, setHlType] = useState<HighlightType>("other");
  const [hlTimestamp, setHlTimestamp] = useState("");
  const [savingHl, setSavingHl] = useState(false);

  const [awardType, setAwardType] = useState<MatchAwardType>("man_of_the_match");
  const [awardPlayerId, setAwardPlayerId] = useState("");
  const [awardStatLabel, setAwardStatLabel] = useState("");
  const [awardStatValue, setAwardStatValue] = useState("");
  const [savingAward, setSavingAward] = useState(false);

  useEffect(() => {
    if (!match) return;
    setRecap(match.recap ?? "");
    setAttendance(match.attendance != null ? String(match.attendance) : "");
    setNotes(match.notes ?? "");
    const opts = awardOptionsForSport(match.sport);
    setAwardType(opts[0]?.type ?? "man_of_the_match");
  }, [match?.id]);

  const roster = useMemo(() => {
    const list: (TeamPlayer & { teamName: string; teamId: string })[] = [];
    if (homeTeam) {
      for (const p of homeTeam.players) {
        list.push({ ...p, teamName: homeTeam.name, teamId: homeTeam.id });
      }
    }
    if (awayTeam) {
      for (const p of awayTeam.players) {
        list.push({ ...p, teamName: awayTeam.name, teamId: awayTeam.id });
      }
    }
    return list;
  }, [homeTeam, awayTeam]);

  const awardOptions = match ? awardOptionsForSport(match.sport) : [];
  const motm = match?.awards?.find((a) => a.type === "man_of_the_match") ?? (
    match?.manOfTheMatchName
      ? {
          type: "man_of_the_match" as const,
          playerName: match.manOfTheMatchName,
          userId: match.manOfTheMatchUserId,
          avatarUrl: match.manOfTheMatchAvatarUrl,
          teamName: match.manOfTheMatchTeamName,
        }
      : null
  );

  const handleGoLive = async () => {
    if (!match) return;
    setStarting(true);
    try {
      await startMatchLive({ id: match.id, clubId, tournamentId });
      toast.success("Match is now live.");
      window.open(`/dashboard/live/${match.id}`, "_blank");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start match.");
    } finally {
      setStarting(false);
    }
  };

  const saveRecap = async () => {
    if (!match) return;
    setSavingRecap(true);
    try {
      await updateMatch(clubId, match.id, {
        recap: recap.trim() || undefined,
        notes: notes.trim() || undefined,
        attendance: attendance ? Number(attendance) : undefined,
      }, tournamentId);
      toast.success("Match notes saved.");
    } catch {
      toast.error("Failed to save.");
    } finally {
      setSavingRecap(false);
    }
  };

  const addHighlight = async () => {
    if (!match || !hlTitle.trim() || !hlUrl.trim()) {
      toast.error("Title and YouTube URL are required.");
      return;
    }
    if (!isValidYoutubeUrl(hlUrl)) {
      toast.error("Enter a valid YouTube URL.");
      return;
    }
    setSavingHl(true);
    try {
      const highlight: MatchHighlight = {
        id: crypto.randomUUID(),
        title: hlTitle.trim(),
        youtubeUrl: toYoutubeWatchUrl(hlUrl) ?? hlUrl.trim(),
        youtubeEmbedUrl: toYoutubeEmbedUrl(hlUrl) ?? undefined,
        type: hlType,
        timestamp: hlTimestamp.trim() || undefined,
        createdAt: Date.now(),
      };
      await updateMatch(clubId, match.id, {
        highlights: [...(match.highlights ?? []), highlight],
      }, tournamentId);
      setHlTitle("");
      setHlUrl("");
      setHlTimestamp("");
      toast.success("Highlight added.");
    } catch {
      toast.error("Failed to add highlight.");
    } finally {
      setSavingHl(false);
    }
  };

  const removeHighlight = async (id: string) => {
    if (!match) return;
    try {
      await updateMatch(clubId, match.id, {
        highlights: (match.highlights ?? []).filter((h) => h.id !== id),
      }, tournamentId);
      toast.success("Highlight removed.");
    } catch {
      toast.error("Failed to remove highlight.");
    }
  };

  const addAward = async () => {
    if (!match || !awardPlayerId) {
      toast.error("Select a player.");
      return;
    }
    const player = roster.find((p) => p.userId === awardPlayerId);
    if (!player) return;

    setSavingAward(true);
    try {
      const award: MatchAward = {
        type: awardType,
        userId: player.userId,
        playerName: player.displayName,
        avatarUrl: player.avatarUrl,
        teamId: player.teamId,
        teamName: player.teamName,
        statLabel: awardStatLabel.trim() || undefined,
        statValue: awardStatValue.trim() || undefined,
      };
      const existing = (match.awards ?? []).filter((a) => a.type !== awardType);
      const awards = [...existing, award];

      const patch: Partial<Match> = { awards };
      if (awardType === "man_of_the_match") {
        patch.manOfTheMatchName = player.displayName;
        patch.manOfTheMatchUserId = player.userId;
        patch.manOfTheMatchAvatarUrl = player.avatarUrl;
        patch.manOfTheMatchTeamName = player.teamName;
      }

      await updateMatch(clubId, match.id, patch, tournamentId);
      setAwardPlayerId("");
      setAwardStatLabel("");
      setAwardStatValue("");
      toast.success("Award saved.");
    } catch {
      toast.error("Failed to save award.");
    } finally {
      setSavingAward(false);
    }
  };

  const removeAward = async (type: MatchAwardType) => {
    if (!match) return;
    try {
      const awards = (match.awards ?? []).filter((a) => a.type !== type);
      const patch: Partial<Match> = { awards };
      if (type === "man_of_the_match") {
        patch.manOfTheMatchName = undefined;
        patch.manOfTheMatchUserId = undefined;
        patch.manOfTheMatchAvatarUrl = undefined;
        patch.manOfTheMatchTeamName = undefined;
      }
      await updateMatch(clubId, match.id, patch, tournamentId);
      toast.success("Award removed.");
    } catch {
      toast.error("Failed to remove award.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading match…
      </div>
    );
  }

  if (!match) {
    return (
      <div className="rounded-xl border border-border bg-card py-16 text-center">
        <p className="text-muted-foreground">Match not found.</p>
        <Link href={backHref} className="text-sm text-primary mt-2 inline-block hover:underline">{backLabel}</Link>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof Trophy }[] = [
    { id: "overview", label: "Overview", icon: Trophy },
    { id: "stream", label: "Live Stream", icon: Video },
    { id: "highlights", label: "Highlights", icon: Film },
    { id: "recap", label: "Awards & Recap", icon: Award },
  ];

  return (
    <div className="space-y-5">
      <Link href={backHref} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition">
        ← {backLabel}
      </Link>

      {/* Hero scoreboard */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-card via-card to-muted/30 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-border/60 flex flex-wrap items-center justify-between gap-2 bg-muted/20">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", statusStyles[match.status])}>
              {match.status === "live" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary live-dot mr-1 align-middle" />}
              {match.status}
            </span>
            <span className="text-xs text-muted-foreground">{sportEmoji(match.sport)} {match.sport}</span>
            {match.knockoutStage && (
              <span className="text-xs font-semibold text-primary">{match.knockoutStage}</span>
            )}
            {match.round != null && !match.knockoutStage && (
              <span className="text-xs text-muted-foreground">Round {match.round}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {match.status === "live" && (
              <Link
                href={`/dashboard/live/${match.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition"
              >
                <Radio className="w-3 h-3" /> Control Room
              </Link>
            )}
            {match.status === "scheduled" && (
              <button
                onClick={() => void handleGoLive()}
                disabled={starting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/40 text-primary text-xs font-bold hover:bg-primary/10 transition disabled:opacity-50"
              >
                <Radio className="w-3 h-3" /> {starting ? "Starting…" : "Go Live"}
              </button>
            )}
            {(match.status === "live" || match.status === "halftime") && (
              <Link
                href={`/dashboard/live/${match.id}`}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition"
              >
                Open broadcast desk <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>

        <div className="px-6 py-8 grid md:grid-cols-[1fr_auto_1fr] gap-6 items-center">
          <div className="text-center md:text-right">
            <p className="text-lg md:text-xl font-bold text-foreground">{match.homeTeamName}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Home</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-4">
              <span className="text-4xl md:text-5xl font-black score-digits text-foreground tabular-nums">
                {match.homeScore}
              </span>
              <span className="text-2xl text-muted-foreground font-light">–</span>
              <span className="text-4xl md:text-5xl font-black score-digits text-foreground tabular-nums">
                {match.awayScore}
              </span>
            </div>
            <div className="flex items-center justify-center gap-3 mt-3 text-xs text-muted-foreground flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(match.matchDate)} · {formatTime(match.matchDate)}
              </span>
              {match.venue && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {match.venue}
                </span>
              )}
            </div>
          </div>
          <div className="text-center md:text-left">
            <p className="text-lg md:text-xl font-bold text-foreground">{match.awayTeamName}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Away</p>
          </div>
        </div>

        {motm && (
          <div className="px-5 py-3 border-t border-border/60 bg-primary/5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <Star className="w-4 h-4 text-primary" />
            </div>
            {motm.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={motm.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : null}
            <div>
              <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Player of the Match</p>
              <p className="text-sm font-semibold text-foreground">{motm.playerName}</p>
              {motm.teamName && <p className="text-xs text-muted-foreground">{motm.teamName}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <nav className="flex items-center gap-1 overflow-x-auto border-b border-border pb-px">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition",
              tab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
            {id === "highlights" && (match.highlights?.length ?? 0) > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-bold">
                {match.highlights!.length}
              </span>
            )}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Match centre
            </h3>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</dt>
                <dd className="font-semibold capitalize">{match.status}</dd>
              </div>
              <div>
                <dt className="text-[10px] text-muted-foreground uppercase tracking-wider">Format</dt>
                <dd className="font-semibold">{match.isKnockout ? "Knockout" : "League"}</dd>
              </div>
              {match.attendance != null && (
                <div>
                  <dt className="text-[10px] text-muted-foreground uppercase tracking-wider">Attendance</dt>
                  <dd className="font-semibold inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {match.attendance}
                  </dd>
                </div>
              )}
              {match.liveStreamTitle && (
                <div className="col-span-2">
                  <dt className="text-[10px] text-muted-foreground uppercase tracking-wider">Broadcast</dt>
                  <dd className="font-semibold">{match.liveStreamTitle}</dd>
                </div>
              )}
            </dl>
            {match.recap && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Recap</p>
                <p className="text-sm text-foreground leading-relaxed">{match.recap}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {(match.youtubeEmbedUrl || match.streamUrl) ? (
              <YoutubeEmbed embedUrl={match.youtubeEmbedUrl} url={match.streamUrl} title={match.liveStreamTitle} />
            ) : (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No stream linked — add one in the Live Stream tab.
              </div>
            )}

            {(match.highlights?.length ?? 0) > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Latest highlights</p>
                <div className="space-y-2">
                  {match.highlights!.slice(0, 3).map((h) => (
                    <a
                      key={h.id}
                      href={h.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition text-sm"
                    >
                      <Film className="w-4 h-4 text-primary shrink-0" />
                      <span className="truncate flex-1">{h.title}</span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "stream" && (
        <div className="rounded-xl border border-border bg-card p-5 max-w-3xl">
          <MatchStreamPanel match={match} tournamentId={tournamentId} />
        </div>
      )}

      {tab === "highlights" && (
        <div className="grid lg:grid-cols-[340px_1fr] gap-5">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 h-fit">
            <h3 className="text-sm font-bold text-foreground">Add highlight clip</h3>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Title</label>
              <input
                value={hlTitle}
                onChange={(e) => setHlTitle(e.target.value)}
                placeholder="e.g. Last-over six"
                className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">YouTube URL</label>
              <input
                value={hlUrl}
                onChange={(e) => setHlUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=…"
                className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Type</label>
                <select
                  value={hlType}
                  onChange={(e) => setHlType(e.target.value as HighlightType)}
                  className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {HIGHLIGHT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Timestamp</label>
                <input
                  value={hlTimestamp}
                  onChange={(e) => setHlTimestamp(e.target.value)}
                  placeholder="12:34"
                  className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
            {hlUrl && isValidYoutubeUrl(hlUrl) && (
              <YoutubeEmbed url={hlUrl} title={hlTitle || "Preview"} className="ring-1 ring-border/50" />
            )}
            <button
              type="button"
              onClick={() => void addHighlight()}
              disabled={savingHl}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50"
            >
              {savingHl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add highlight
            </button>
          </div>

          <div className="space-y-4">
            {(match.highlights ?? []).length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground text-sm">
                No highlights yet. Add YouTube clips for goals, wickets, or full match replays.
              </div>
            ) : (
              match.highlights!.map((h) => (
                <div key={h.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  <YoutubeEmbed embedUrl={h.youtubeEmbedUrl} url={h.youtubeUrl} title={h.title} />
                  <div className="p-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{h.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                        {h.type?.replace(/_/g, " ") ?? "clip"}
                        {h.timestamp ? ` · ${h.timestamp}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeHighlight(h.id)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-loss hover:bg-loss/10 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "recap" && (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" /> Match awards
            </h3>
            <p className="text-xs text-muted-foreground">
              Sport-specific awards for {match.sport}. Rosters from both teams are available.
            </p>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Award</label>
              <select
                value={awardType}
                onChange={(e) => setAwardType(e.target.value as MatchAwardType)}
                className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {awardOptions.map((o) => (
                  <option key={o.type} value={o.type}>{o.label}</option>
                ))}
              </select>
            </div>

            <PlayerPicker
              players={roster}
              value={awardPlayerId}
              onChange={(p) => setAwardPlayerId(p.userId)}
              label="Player"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Stat label</label>
                <input
                  value={awardStatLabel}
                  onChange={(e) => setAwardStatLabel(e.target.value)}
                  placeholder="e.g. Runs"
                  className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Value</label>
                <input
                  value={awardStatValue}
                  onChange={(e) => setAwardStatValue(e.target.value)}
                  placeholder="e.g. 87"
                  className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => void addAward()}
              disabled={savingAward || roster.length === 0}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50"
            >
              {savingAward ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save award
            </button>

            {roster.length === 0 && (
              <p className="text-xs text-muted-foreground">Add players to team rosters to assign awards.</p>
            )}

            <div className="pt-4 border-t border-border space-y-2">
              {(match.awards ?? []).length === 0 && !motm ? (
                <p className="text-xs text-muted-foreground">No awards assigned yet.</p>
              ) : (
                (match.awards ?? (motm ? [motm as MatchAward] : [])).map((a) => (
                  <div key={a.type} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    {a.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                        <Star className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-primary uppercase">
                        {awardOptions.find((o) => o.type === a.type)?.label ?? a.type.replace(/_/g, " ")}
                      </p>
                      <p className="text-sm font-semibold truncate">{a.playerName}</p>
                      {a.statValue && (
                        <p className="text-xs text-muted-foreground">{a.statLabel ?? "Stat"}: {a.statValue}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeAward(a.type)}
                      className="p-1.5 text-muted-foreground hover:text-loss transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground">Post-match notes</h3>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Match recap</label>
              <textarea
                value={recap}
                onChange={(e) => setRecap(e.target.value)}
                rows={5}
                placeholder="Write a short match report for fans and the app…"
                className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Internal notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Organizer-only notes…"
                className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Attendance</label>
              <input
                type="number"
                min={0}
                value={attendance}
                onChange={(e) => setAttendance(e.target.value)}
                placeholder="e.g. 250"
                className="w-full px-3 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <button
              type="button"
              onClick={() => void saveRecap()}
              disabled={savingRecap}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50"
            >
              {savingRecap ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save notes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
