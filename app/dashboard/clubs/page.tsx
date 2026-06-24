"use client";

import { useAuth } from "@/hooks/use-auth";
import { useClubs } from "@/hooks/use-clubs";
import Link from "next/link";
import { Trophy, Users, MapPin, ChevronRight } from "lucide-react";
import { sportEmoji, formatDate } from "@/lib/utils";

export default function ClubsPage() {
  const { user }    = useAuth();
  const { clubs }   = useClubs(user);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">My Clubs</h1>
        <p className="text-sm text-muted-foreground">{clubs.length} clubs you manage</p>
      </div>

      {clubs.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-16 flex flex-col items-center text-center">
          <Trophy className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-foreground font-medium">No clubs found</p>
          <p className="text-sm text-muted-foreground mt-1">Your account must be the owner of a Swing club to manage it here.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clubs.map((club) => (
            <Link
              key={club.id}
              href={`/dashboard/clubs/${club.id}`}
              className="rounded-xl border border-border bg-card overflow-hidden hover:border-border/70 hover:bg-card/80 transition group"
            >
              {club.coverImageUrl ? (
                <div className="h-28 bg-cover bg-center" style={{ backgroundImage: `url(${club.coverImageUrl})` }} />
              ) : (
                <div className="h-28 bg-gradient-to-br from-primary/20 to-primary/5" />
              )}
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3 -mt-8">
                  {club.logoImageUrl ? (
                    <img src={club.logoImageUrl} alt={club.name} className="w-12 h-12 rounded-xl border-2 border-card object-cover shadow-lg" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl border-2 border-card bg-primary/20 flex items-center justify-center shadow-lg">
                      <span className="text-sm font-bold text-primary">{club.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                  )}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                    club.status === "active" ? "bg-win/10 text-win border-win/25" : "bg-loss/10 text-loss border-loss/25"
                  } mt-auto`}>{club.status}</span>
                </div>
                <h3 className="font-bold text-foreground">{club.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1">{club.tagline || club.locationCity}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {club.memberCount}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {club.locationCity}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {club.primarySports.slice(0, 3).map((s) => (
                    <span key={s} className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px]">{sportEmoji(s)} {s}</span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
