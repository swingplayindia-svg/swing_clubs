"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Shield,
  Trophy,
  Calendar,
  BarChart3,
  Newspaper,
  Settings,
  Radio,
  LogOut,
  Moon,
  Sun,
  Swords,
  ChevronsUpDown,
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

interface NavSection {
  title: string;
  items: NavItem[];
}

function getNavSections(clubId: string, pendingRequests = 0): NavSection[] {
  return [
    {
      title: "Main",
      items: [
        { label: "Overview", href: `/dashboard/clubs/${clubId}`, icon: LayoutDashboard },
      ],
    },
    {
      title: "People",
      items: [
        { label: "Members", href: `/dashboard/clubs/${clubId}/members`, icon: Users },
        {
          label: "Join Requests",
          href: `/dashboard/clubs/${clubId}/join-requests`,
          icon: Shield,
          badge: pendingRequests,
        },
      ],
    },
    {
      title: "Competition",
      items: [
        { label: "Teams", href: `/dashboard/clubs/${clubId}/teams`, icon: Swords },
        { label: "Tournaments", href: `/dashboard/clubs/${clubId}/tournaments`, icon: Trophy },
        { label: "Matches", href: `/dashboard/clubs/${clubId}/matches`, icon: Calendar },
        { label: "Standings", href: `/dashboard/clubs/${clubId}/standings`, icon: BarChart3 },
      ],
    },
    {
      title: "Club",
      items: [
        { label: "News", href: `/dashboard/clubs/${clubId}/news`, icon: Newspaper },
        { label: "Settings", href: `/dashboard/clubs/${clubId}/settings`, icon: Settings },
      ],
    },
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

function ClubLogo({ club, className }: { club: Club; className?: string }) {
  if (club.logoImageUrl) {
    return (
      <img
        src={club.logoImageUrl}
        alt={club.name}
        className={cn("object-cover shrink-0 border border-sidebar-border/80", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "bg-primary/12 border border-primary/20 flex items-center justify-center shrink-0",
        className,
      )}
    >
      <span className="font-bold text-primary leading-none">
        {club.name.slice(0, 2).toUpperCase()}
      </span>
    </div>
  );
}

export function Sidebar({
  clubs,
  activeClubId,
  onClubChange,
  pendingRequests = 0,
  userDisplayName,
  userPhotoURL,
  onLogout,
}: SidebarProps) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const activeClub = clubs.find((c) => c.id === activeClubId);
  const sections = activeClubId ? getNavSections(activeClubId, pendingRequests) : [];
  const otherClubs = clubs.filter((c) => c.id !== activeClubId);

  return (
    <aside className="w-[252px] shrink-0 h-screen sticky top-0 flex flex-col bg-sidebar border-r border-sidebar-border shadow-[1px_0_0_0_oklch(0_0_0/0.04)] dark:shadow-[1px_0_24px_oklch(0_0_0/0.35)]">

      {/* Brand */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-[0_2px_8px_oklch(from_var(--primary)_l_c_h/0.35)]">
            <Radio className="w-[17px] h-[17px] text-primary-foreground" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-sidebar-foreground tracking-tight leading-none">
              Swing
            </p>
            <p className="text-[11px] text-muted-foreground font-medium mt-1">
              Organization Portal
            </p>
          </div>
        </div>
      </div>

      {/* Club selector */}
      {activeClub ? (
        <div className="px-4 pb-4">
          <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-3">
            <div className="flex items-center gap-3">
              <ClubLogo club={activeClub} className="w-10 h-10 rounded-lg text-[11px]" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Active club
                </p>
                <p className="text-sm font-semibold text-sidebar-foreground truncate mt-0.5">
                  {activeClub.name}
                </p>
                {activeClub.memberCount > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {activeClub.memberCount} members
                  </p>
                )}
              </div>
            </div>

            {otherClubs.length > 0 && (
              <div className="mt-3 pt-3 border-t border-sidebar-border/70 space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-1.5 flex items-center gap-1">
                  <ChevronsUpDown className="w-3 h-3" />
                  Switch club
                </p>
                {otherClubs.map((club) => (
                  <button
                    key={club.id}
                    type="button"
                    onClick={() => onClubChange(club.id)}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                  >
                    <ClubLogo club={club} className="w-6 h-6 rounded-md text-[8px]" />
                    <span className="flex-1 truncate text-xs font-medium">{club.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : clubs.length > 0 ? (
        <div className="px-4 pb-4 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground px-1 mb-2">
            Your clubs
          </p>
          {clubs.map((club) => (
            <button
              key={club.id}
              type="button"
              onClick={() => onClubChange(club.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-sidebar-border bg-sidebar-accent/40 hover:bg-sidebar-accent text-left transition-colors"
            >
              <ClubLogo club={club} className="w-8 h-8 rounded-lg text-[10px]" />
              <span className="flex-1 truncate text-sm font-medium text-sidebar-foreground">
                {club.name}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-5 scrollbar-thin">
        {sections.length === 0 ? (
          <div className="mx-2 rounded-xl border border-dashed border-sidebar-border px-4 py-8 text-center">
            <p className="text-xs font-medium text-muted-foreground">Select a club to get started</p>
          </div>
        ) : (
          sections.map((section) => (
            <div key={section.title}>
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/80">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-150",
                          isActive
                            ? "bg-primary/10 text-primary font-semibold shadow-[inset_3px_0_0_0_var(--sidebar-primary)]"
                            : "text-muted-foreground font-medium hover:bg-sidebar-accent hover:text-sidebar-foreground",
                        )}
                      >
                        <span
                          className={cn(
                            "flex items-center justify-center w-7 h-7 rounded-md shrink-0 transition-colors",
                            isActive
                              ? "bg-primary/15 text-primary"
                              : "bg-transparent text-muted-foreground group-hover:bg-sidebar-accent group-hover:text-sidebar-foreground",
                          )}
                        >
                          <item.icon className="w-[15px] h-[15px]" strokeWidth={isActive ? 2.25 : 2} />
                        </span>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge != null && item.badge > 0 && (
                          <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5 shrink-0">
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-sidebar-border p-3 space-y-2 bg-sidebar/80 backdrop-blur-sm">
        <button
          type="button"
          onClick={toggle}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          <span className="flex items-center gap-2">
            {theme === "dark" ? (
              <Sun className="w-3.5 h-3.5" />
            ) : (
              <Moon className="w-3.5 h-3.5" />
            )}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </span>
          <span
            className={cn(
              "relative w-9 h-5 rounded-full border transition-colors",
              theme === "dark" ? "bg-muted border-border" : "bg-primary/20 border-primary/30",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all duration-200",
                theme === "dark"
                  ? "left-0.5 bg-muted-foreground"
                  : "left-[calc(100%-16px)] bg-primary",
              )}
            />
          </span>
        </button>

        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-sidebar-accent/60 border border-sidebar-border/60">
          {userPhotoURL ? (
            <img
              src={userPhotoURL}
              alt={userDisplayName ?? "User"}
              className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-sidebar-border"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/12 ring-2 ring-primary/20 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-primary">
                {(userDisplayName ?? "U").slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-sidebar-foreground truncate">
              {userDisplayName ?? "Organizer"}
            </p>
            <p className="text-[10px] text-muted-foreground">Club admin</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
