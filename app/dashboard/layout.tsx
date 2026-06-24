"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Radio } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useClubs } from "@/hooks/use-clubs";
import { useJoinRequests, useClub } from "@/hooks/use-club-data";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { usePathname } from "next/navigation";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const router                              = useRouter();
  const pathname                            = usePathname();
  const { user, isLoading, logout }         = useAuth();
  const { clubs, isLoading: clubsLoading }  = useClubs(user);
  const [activeClubId, setActiveClubId]     = useState<string | null>(null);

  // Set first club as active when clubs load
  useEffect(() => {
    if (!activeClubId && clubs.length > 0) {
      setActiveClubId(clubs[0].id);
    }
  }, [clubs, activeClubId]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, user, router]);

  // Detect active club from URL
  useEffect(() => {
    const match = pathname.match(/\/dashboard\/clubs\/([^/]+)/);
    if (match && match[1] && match[1] !== activeClubId) {
      setActiveClubId(match[1]);
    }
  }, [pathname]);

  const { requests } = useJoinRequests(activeClubId);
  const { club }     = useClub(activeClubId);
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const handleClubChange = (clubId: string) => {
    setActiveClubId(clubId);
    router.push(`/dashboard/clubs/${clubId}`);
  };

  if (isLoading || clubsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Radio className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm font-semibold text-foreground">Loading Swing</p>
            <p className="text-xs text-muted-foreground">Setting up your workspace…</p>
          </div>
          <Loader2 className="w-4 h-4 text-primary/60 animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        clubs={clubs}
        activeClubId={activeClubId}
        onClubChange={handleClubChange}
        pendingRequests={pendingCount}
        userDisplayName={user.displayName}
        userPhotoURL={user.photoURL}
        onLogout={logout}
      />
      <div className="flex-1 min-w-0 overflow-x-hidden flex flex-col">
        <Topbar club={club} />
        <main className="flex-1 min-h-0 px-4 py-4 md:px-5">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardContent>{children}</DashboardContent>;
}
