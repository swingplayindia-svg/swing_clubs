"use client";

import { use, useState } from "react";
import { useJoinRequests } from "@/hooks/use-club-data";
import { resolveJoinRequest } from "@/lib/firestore/clubs";
import { formatDate, initials } from "@/lib/utils";
import { UserCheck, UserX, Clock } from "lucide-react";
import { toast } from "sonner";

export default function JoinRequestsPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId }    = use(params);
  const { requests }  = useJoinRequests(clubId);
  const [resolving,   setResolving] = useState<string | null>(null);

  const handleResolve = async (reqId: string, status: "approved" | "rejected") => {
    setResolving(reqId);
    try {
      await resolveJoinRequest(clubId, reqId, status);
      toast.success(status === "approved" ? "Request approved — member added." : "Request rejected.");
    } catch {
      toast.error("Failed to update request.");
    } finally {
      setResolving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Join Requests</h1>
        <p className="text-sm text-muted-foreground">{requests.filter((r) => r.status === "pending").length} pending</p>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-16 text-center">
          <Clock className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-foreground font-medium">No pending join requests</p>
          <p className="text-sm text-muted-foreground mt-1">Requests from members wanting to join your club appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
              {req.avatarUrl ? (
                <img src={req.avatarUrl} alt={req.displayName} className="w-10 h-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">{initials(req.displayName)}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{req.displayName}</p>
                {req.email && <p className="text-xs text-muted-foreground">{req.email}</p>}
                {req.message && <p className="text-xs text-muted-foreground italic mt-0.5">"{req.message}"</p>}
                <p className="text-xs text-muted-foreground mt-0.5">{formatDate(req.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleResolve(req.id, "rejected")}
                  disabled={resolving === req.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition disabled:opacity-50"
                >
                  <UserX className="w-4 h-4" /> Reject
                </button>
                <button
                  onClick={() => handleResolve(req.id, "approved")}
                  disabled={resolving === req.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-win/15 text-win border border-win/25 hover:bg-win/25 transition disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" /> Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
