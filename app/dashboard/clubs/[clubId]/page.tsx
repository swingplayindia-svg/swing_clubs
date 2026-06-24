"use client";

import { use } from "react";
import Link from "next/link";
import {
  useClub, useLiveMatches, useTeams, useMembers,
  useTournaments, useMatches, useStandings,
} from "@/hooks/use-club-data";
import { formatDate, formatTime, sportEmoji, initials } from "@/lib/utils";
import {
  Radio, Users, Trophy, Calendar, BarChart3,
  Plus, ChevronRight, Flame, Activity,
  Shield, Newspaper, Settings, Star, TrendingUp,
} from "lucide-react";

export default function ClubOverviewPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = use(params);
  const { club }        = useClub(clubId);
  const { liveMatches } = useLiveMatches(clubId);
  const { teams }       = useTeams(clubId);
  const { members }     = useMembers(clubId);
  const { tournaments } = useTournaments(clubId);
  const { matches }     = useMatches(clubId);
  const { standings }   = useStandings(clubId);

  const now       = Date.now();
  const upcoming  = matches
    .filter((m) => m.status === "scheduled" && m.matchDate > now)
    .sort((a, b) => a.matchDate - b.matchDate)
    .slice(0, 5);

  const recent = matches
    .filter((m) => m.status === "completed")
    .sort((a, b) => b.matchDate - a.matchDate)
    .slice(0, 4);

  const activeTournaments  = tournaments.filter((t) => t.status === "active");
  const totalWins          = teams.reduce((s, t) => s + t.wins,   0);
  const totalMatches       = matches.filter((m) => m.status === "completed").length;

  const stats = [
    { label: "Members",            value: club?.memberCount ?? members.length, icon: Users,    href: "members",     color: "text-chart-2", bg: "bg-chart-2/10" },
    { label: "Teams",              value: teams.length,                        icon: Trophy,   href: "teams",       color: "text-chart-4", bg: "bg-chart-4/10" },
    { label: "Active Tournaments", value: activeTournaments.length,            icon: Flame,    href: "tournaments", color: "text-chart-5", bg: "bg-chart-5/10" },
    { label: "Matches Played",     value: totalMatches,                        icon: Activity, href: "matches",     color: "text-chart-3", bg: "bg-chart-3/10" },
  ];

  const quickActions = [
    { label: "Schedule Match",  href: `matches`,     icon: Calendar,   desc: "Set date, time & venue"    },
    { label: "Add Team",        href: `teams`,        icon: Trophy,     desc: "Create with logo & captain" },
    { label: "New Tournament",  href: `tournaments`,  icon: Flame,      desc: "League or knockout format"  },
    { label: "Post News",       href: `news`,         icon: Newspaper,  desc: "Announce to your club"      },
    { label: "Manage Members",  href: `members`,      icon: Users,      desc: "Roles & permissions"        },
    { label: "Club Settings",   href: `settings`,     icon: Settings,   desc: "Profile & branding"         },
  ];

  return (
    <div className="space-y-8">

      {/* ── Club header ─────────────────────────────────────────────────── */}
      {club && (
        <div className="relative rounded-2xl border border-border bg-card overflow-hidden">
          {/* Cover image */}
          {club.coverImageUrl && (
            <div className="h-28 w-full overflow-hidden">
              <img src={club.coverImageUrl} alt="cover" className="w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 h-28 bg-gradient-to-b from-transparent to-card" />
            </div>
          )}
          <div className={`flex items-start gap-5 px-6 ${club.coverImageUrl ? "py-4 -mt-10 relative z-10" : "py-6"}`}>
            {/* Logo */}
            {club.logoImageUrl ? (
              <img
                src={club.logoImageUrl}
                alt={club.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-border bg-muted shrink-0 shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-primary/15 border-2 border-primary/25 flex items-center justify-center shrink-0 shadow-lg">
                <span className="text-xl font-bold text-primary">{initials(club.name)}</span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground leading-tight">{club.name}</h1>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                  club.status === "active"
                    ? "bg-win/10 text-win border-win/25"
                    : "bg-loss/10 text-loss border-loss/25"
                }`}>
                  {club.status}
                </span>
              </div>
              {club.tagline && (
                <p className="text-muted-foreground text-sm mt-0.5 italic">&ldquo;{club.tagline}&rdquo;</p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {club.primarySports.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded-md bg-accent text-accent-foreground text-xs font-semibold">
                    {sportEmoji(s)} {s}
                  </span>
                ))}
                {club.locationCity && (
                  <span className="text-xs text-muted-foreground">· {club.locationCity}</span>
                )}
              </div>
            </div>

            <Link
              href={`/dashboard/clubs/${clubId}/settings`}
              className="shrink-0 p-2 rounded-lg border border-border hover:bg-accent transition text-muted-foreground hover:text-foreground"
              title="Club Settings"
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* ── Live matches ─────────────────────────────────────────────────── */}
      {liveMatches.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-primary live-dot" />
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest">Live Now</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {liveMatches.map((match) => (
              <div
                key={match.id}
                className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-4 live-border"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <span className="text-[10px] font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded-md">LIVE</span>
                    <span className="text-xs text-muted-foreground">{sportEmoji(match.sport)} {match.sport}</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">{match.homeTeamName}</span>
                      <span className="text-2xl font-bold text-foreground score-digits w-8 text-right">{match.homeScore}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">{match.awayTeamName}</span>
                      <span className="text-2xl font-bold text-foreground score-digits w-8 text-right">{match.awayScore}</span>
                    </div>
                  </div>
                </div>
                <Link
                  href={`/dashboard/live/${match.id}`}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 active:scale-95 transition"
                >
                  <Radio className="w-3 h-3" />
                  Control
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Stats grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={`/dashboard/clubs/${clubId}/${s.href}`}
            className="rounded-xl border border-border bg-card p-5 hover:border-border/80 transition stat-card group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-4.5 h-4.5 ${s.color}`} style={{width:18,height:18}} />
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="text-3xl font-bold text-foreground score-digits">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* ── Two-col: Upcoming + Recent Results ──────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Upcoming fixtures */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm">Upcoming Fixtures</h2>
            <Link href={`/dashboard/clubs/${clubId}/matches`} className="text-xs text-primary hover:underline font-medium">
              View all
            </Link>
          </div>
          <div className="p-2">
            {upcoming.length === 0 ? (
              <div className="text-center py-10">
                <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No upcoming matches</p>
                <Link
                  href={`/dashboard/clubs/${clubId}/matches`}
                  className="text-xs text-primary mt-1 inline-flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3 h-3" /> Schedule a match
                </Link>
              </div>
            ) : (
              upcoming.map((m, i) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition"
                >
                  <div className="text-center w-9 shrink-0">
                    <p className="text-[10px] text-muted-foreground uppercase">
                      {new Date(m.matchDate).toLocaleDateString("en-IN", { month: "short" })}
                    </p>
                    <p className="text-base font-bold text-foreground leading-none">
                      {new Date(m.matchDate).getDate()}
                    </p>
                  </div>
                  <div className="w-px h-8 bg-border shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {m.homeTeamName} <span className="text-muted-foreground font-normal text-xs">vs</span> {m.awayTeamName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(m.matchDate)} · {sportEmoji(m.sport)} {m.sport}
                      {m.venue && ` · ${m.venue}`}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent results */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm">Recent Results</h2>
            <Link href={`/dashboard/clubs/${clubId}/matches`} className="text-xs text-primary hover:underline font-medium">
              View all
            </Link>
          </div>
          <div className="p-2">
            {recent.length === 0 ? (
              <div className="text-center py-10">
                <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No completed matches yet</p>
              </div>
            ) : (
              recent.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition"
                >
                  <span className="text-base">{sportEmoji(m.sport)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {m.homeTeamName} <span className="text-muted-foreground">vs</span> {m.awayTeamName}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(m.matchDate)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground score-digits">
                      {m.homeScore} – {m.awayScore}
                    </p>
                    <p className="text-[10px] text-muted-foreground">FT</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Top teams ────────────────────────────────────────────────────── */}
      {teams.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm">Teams at a Glance</h2>
            <Link href={`/dashboard/clubs/${clubId}/teams`} className="text-xs text-primary hover:underline font-medium">
              Manage teams
            </Link>
          </div>
          <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {teams.slice(0, 6).map((team) => {
              const total   = team.wins + team.draws + team.losses;
              const winRate = total > 0 ? Math.round((team.wins / total) * 100) : 0;
              return (
                <div key={team.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition">
                  {team.logoUrl ? (
                    <img src={team.logoUrl} alt={team.name} className="w-9 h-9 rounded-lg object-cover shrink-0 border border-border/60" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{initials(team.name)}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{team.name}</p>
                    <p className="text-[11px] text-muted-foreground">{sportEmoji(team.sport)} {team.sport}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground score-digits">{team.wins}W</p>
                    {total > 0 && <p className="text-[10px] text-muted-foreground">{winRate}%</p>}
                  </div>
                </div>
              );
            })}
            {/* Add team CTA */}
            <Link
              href={`/dashboard/clubs/${clubId}/teams`}
              className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-border hover:border-primary/30 hover:bg-primary/5 transition text-muted-foreground hover:text-primary"
            >
              <div className="w-9 h-9 rounded-lg border-2 border-dashed border-current flex items-center justify-center shrink-0">
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium">Add new team</span>
            </Link>
          </div>
        </div>
      )}

      {/* ── Quick actions ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground text-sm">Quick Actions</h2>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {quickActions.map((a) => (
            <Link
              key={a.label}
              href={`/dashboard/clubs/${clubId}/${a.href}`}
              className="flex items-start gap-3 px-3.5 py-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition group"
            >
              <a.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition leading-tight">{a.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{a.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
