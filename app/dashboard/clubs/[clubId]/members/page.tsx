"use client";

import { use, useState } from "react";
import { useMembers } from "@/hooks/use-club-data";
import { updateMemberRole } from "@/lib/firestore/clubs";
import { formatDate, initials } from "@/lib/utils";
import { Users, Shield, Crown, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import type { MemberRole } from "@/lib/schemas/club";

const ROLES: MemberRole[] = ["owner", "admin", "scorekeeper", "commentator", "member"];

const roleColors: Record<MemberRole, string> = {
  owner:       "bg-primary/15 text-primary border-primary/30",
  admin:       "bg-chart-5/15 text-chart-5 border-chart-5/30",
  scorekeeper: "bg-chart-2/15 text-chart-2 border-chart-2/30",
  commentator: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  member:      "bg-muted text-muted-foreground border-border",
};

const roleIcons: Record<MemberRole, React.ComponentType<{ className?: string }>> = {
  owner:       Crown,
  admin:       Shield,
  scorekeeper: Shield,
  commentator: Shield,
  member:      Users,
};

export default function MembersPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId }    = use(params);
  const { members }   = useMembers(clubId);
  const [search,      setSearch]  = useState("");
  const [roleFilter,  setRoleFilter] = useState<MemberRole | "all">("all");
  const [updating,    setUpdating] = useState<string | null>(null);

  const filtered = members.filter((m) => {
    const matchSearch = m.displayName.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || m.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleRoleChange = async (userId: string, role: MemberRole) => {
    if (role === "owner") return; // safety
    setUpdating(userId);
    try {
      await updateMemberRole(clubId, userId, role);
      toast.success("Role updated.");
    } catch {
      toast.error("Failed to update role.");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Members</h1>
          <p className="text-sm text-muted-foreground">{members.length} total members</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="search"
          placeholder="Search members…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 w-64"
        />
        <div className="flex items-center gap-1.5">
          {(["all", ...ROLES] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition capitalize ${
                roleFilter === r ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Member</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Email</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Role</th>
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-10 text-muted-foreground text-sm">No members found.</td></tr>
            ) : (
              filtered.map((m) => {
                const RoleIcon = roleIcons[m.role];
                return (
                  <tr key={m.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {m.avatarUrl ? (
                          <img src={m.avatarUrl} alt={m.displayName} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                            <span className="text-xs font-bold text-primary">{initials(m.displayName)}</span>
                          </div>
                        )}
                        <span className="font-medium text-foreground">{m.displayName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{m.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      {m.role === "owner" ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${roleColors[m.role]}`}>
                          <RoleIcon className="w-3 h-3" />{m.role}
                        </span>
                      ) : (
                        <div className="relative inline-block">
                          <select
                            value={m.role}
                            disabled={updating === m.userId}
                            onChange={(e) => handleRoleChange(m.userId, e.target.value as MemberRole)}
                            className={`appearance-none pr-6 pl-2 py-0.5 rounded-full text-xs font-semibold border cursor-pointer bg-transparent focus:outline-none ${roleColors[m.role]}`}
                          >
                            {ROLES.filter((r) => r !== "owner").map((r) => (
                              <option key={r} value={r} className="bg-popover text-foreground capitalize">{r}</option>
                            ))}
                          </select>
                          <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">{formatDate(m.joinedAt)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
