"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Shield, Trophy, Calendar, BarChart3,
  Newspaper, Settings, Radio, ChevronRight, LogOut,
  Moon, Sun, Zap, Swords,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme-provider";
import type { Club } from "@/lib/schemas/club";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

function getNavItems(clubId: string, pendingRequests = 0): NavItem[] {
  return [
    { label: "Overview",      href: `/dashboard/clubs/${clubId}`,              icon: LayoutDashboard },
    { label: "Members",       href: `/dashboard/clubs/${clubId}/members`,       icon: Users           },
    { label: "Join Requests", href: `/dashboard/clubs/${clubId}/join-requests`, icon: Shield, badge: pendingRequests },
    { label: "Teams",         href: `/dashboard/clubs/${clubId}/teams`,         icon: Swords          },
    { label: "Tournaments",   href: `/dashboard/clubs/${clubId}/tournaments`,   icon: Trophy          },
    { label: "Matches",       href: `/dashboard/clubs/${clubId}/matches`,       icon: Calendar        },
    { label: "Standings",     href: `/dashboard/clubs/${clubId}/standings`,     icon: BarChart3       },
    { label: "News",          href: `/dashboard/clubs/${clubId}/news`,          icon: Newspaper       },
    { label: "Settings",      href: `/dashboard/clubs/${clubId}/settings`,      icon: Settings        },
  ];
}

interface SidebarProps {
  clubs: Club[];
  activeClubId: string | null;
  onClubChange: (clubId: string) => void;
  pendingRequests?: number;
  userDisplayName?: string | null;
  userPhotoURL?: string | null;
  onLogout: () => void;
}

function ClubAvatar({ club, size = "sm" }: { club: Club; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-6 h-6 rounded-md text-[9px]" : "w-8 h-8 rounded-lg text-[11px]";
  if (club.logoImageUrl) {
    return (
      <img
        src={club.logoImageUrl}
        alt={club.name}
        className={cn(dim, "object-cover shrink-0 border border-sidebar-border")}
      />
    );
  }
  return (
    <div className={cn(dim, "bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0")}>
      <span className="font-bold text-primary leading-none">
        {club.name.slice(0, 2).toUpperCase()}
      </span>
    </div>
  );
}

export function Sidebar({
  clubs, activeClubId, onClubChange, pendingRequests = 0,
  userDisplayName, userPhotoURL, onLogout,
}: SidebarProps) {
  const pathname   = usePathname();
  const { theme, toggle } = useTheme();
  const activeClub = clubs.find((c) => c.id === activeClubId);
  const navItems   = activeClubId ? getNavItems(activeClubId, pendingRequests) : [];

  return (
    <aside className="w-[220px] shrink-0 min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col">

      {/* ── Brand ─────────────────────────────────────────────────────── */}
      <div className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-sm">
            <Radio className="w-[18px] h-[18px] text-primary-foreground" />
          </div>
          <div className="leading-none">
            <p className="text-[15px] font-bold text-sidebar-foreground tracking-tight">Swing</p>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Organizer Portal</p>
          </div>
        </div>
      </div>

      {/* ── Club switcher ─────────────────────────────────────────────── */}
      {clubs.length > 0 && (
        <div className="px-3 py-3 border-b border-sidebar-border">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">
            My Clubs
          </p>
          <div className="space-y-0.5">
            {clubs.map((club) => {
              const isActive = club.id === activeClubId;
              return (
                <button
                  key={club.id}
                  onClick={() => onClubChange(club.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all text-sm group",
                    isActive
                      ? "bg-primary/12 text-sidebar-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  )}
                >
                  <ClubAvatar club={club} size="sm" />
                  <span className="flex-1 truncate font-medium text-[13px]">{club.name}</span>
                  {isActive && (
                    <ChevronRight className="w-3 h-3 text-primary shrink-0 opacity-80" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {navItems.length === 0 ? (
          <div className="py-10 text-center">
            <Zap className="w-5 h-5 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-xs text-muted-foreground">Select a club to manage</p>
          </div>
        ) : (
          navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "nav-item-active flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all relative",
                  isActive
                    ? "bg-primary/12 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground font-medium",
                  !isActive && "nav-item-active-off",
                )}
              >
                <item.icon
                  className={cn(
                    "w-[15px] h-[15px] shrink-0 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1 shrink-0">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </Link>
            );
          })
        )}
      </nav>

      {/* ── Bottom: theme toggle + user ─────────────────────────────── */}
      <div className="border-t border-sidebar-border px-3 py-3 space-y-2">

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all group"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          <div className="w-[15px] h-[15px] shrink-0 relative">
            <Sun
              className={cn(
                "w-[15px] h-[15px] absolute inset-0 transition-all duration-300",
                theme === "dark" ? "opacity-100 rotate-0" : "opacity-0 rotate-90",
              )}
            />
            <Moon
              className={cn(
                "w-[15px] h-[15px] absolute inset-0 transition-all duration-300",
                theme === "light" ? "opacity-100 rotate-0" : "opacity-0 -rotate-90",
              )}
            />
          </div>
          <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          <div className={cn(
            "ml-auto w-8 h-4.5 rounded-full border transition-all duration-300 relative shrink-0",
            theme === "dark"
              ? "bg-muted border-border"
              : "bg-primary/20 border-primary/30",
          )} style={{height:18}}>
            <div className={cn(
              "absolute top-0.5 w-3 h-3 rounded-full transition-all duration-300",
              theme === "dark"
                ? "left-0.5 bg-muted-foreground"
                : "left-[calc(100%-14px)] bg-primary",
            )} />
          </div>
        </button>

        {/* User info + logout */}
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-sidebar-accent transition group">
          {/* Avatar */}
          {userPhotoURL ? (
            <img
              src={userPhotoURL}
              alt={userDisplayName ?? "User"}
              className="w-7 h-7 rounded-full object-cover shrink-0 border border-sidebar-border"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-primary">
                {(userDisplayName ?? "U").slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <span className="flex-1 text-[12px] text-muted-foreground truncate font-medium">
            {userDisplayName ?? "Organizer"}
          </span>
          <button
            onClick={onLogout}
            className="text-muted-foreground hover:text-destructive transition p-1 rounded-md opacity-0 group-hover:opacity-100 shrink-0"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
