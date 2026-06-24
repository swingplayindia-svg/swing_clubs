"use client";

import { use } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Overview",  href: "" },
  { label: "Teams",     href: "/teams" },
  { label: "Fixtures",  href: "/fixtures" },
  { label: "Matches",   href: "/matches" },
  { label: "Standings", href: "/standings" },
];

export default function TournamentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clubId: string; tournamentId: string }>;
}) {
  const { clubId, tournamentId } = use(params);
  const pathname                 = usePathname();
  const base = `/dashboard/clubs/${clubId}/tournaments/${tournamentId}`;

  return (
    <div className="space-y-4">
      {/* Tournament tabs */}
      <nav className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {TABS.map((tab) => {
          const href   = `${base}${tab.href}`;
          const active = tab.href === "" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={tab.label}
              href={href}
              className={cn(
                "px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
