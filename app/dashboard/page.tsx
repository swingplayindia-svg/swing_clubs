"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useClubs } from "@/hooks/use-clubs";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { clubs, isLoading: clubsLoading } = useClubs(user);

  useEffect(() => {
    if (!isLoading && !user) { router.push("/login"); return; }
    if (!clubsLoading && clubs.length > 0) {
      router.push(`/dashboard/clubs/${clubs[0].id}`);
    }
  }, [user, isLoading, clubs, clubsLoading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">
          {!clubsLoading && clubs.length === 0
            ? "No clubs found. Your account needs to own or admin a club."
            : "Redirecting…"}
        </p>
      </div>
    </div>
  );
}
