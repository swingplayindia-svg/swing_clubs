"use client";

import { use, useRef, useState } from "react";
import Link from "next/link";
import { useTeams, useMembers } from "@/hooks/use-club-data";
import { createTeam, deleteTeam, updateTeam } from "@/lib/firestore/teams";
import { MemberCombobox, memberUserId } from "@/components/teams/member-combobox";
import { MemberAvatar } from "@/components/teams/member-avatar";
import { captainPlayer, serializePlayers, syncCaptainInRoster } from "@/lib/team-players";
import { formatDate, sportEmoji, initials } from "@/lib/utils";
import { Plus, Trash2, Users, Trophy, X, Camera, Loader2, Edit2, Search, Medal, Shield, ChevronRight, Upload } from "lucide-react";
import { toast } from "sonner";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase";
import type { Team } from "@/lib/schemas/team";
import { BulkTeamsImportModal } from "@/components/teams/bulk-teams-import-modal";

const SPORTS = [
  "Football", "Cricket", "Padel", "Pickleball",
  "Basketball", "Badminton", "Tennis", "Hockey",
];

async function uploadTeamLogo(
  clubId: string,
  teamId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const sRef = storageRef(getFirebaseStorage(), `clubs/${clubId}/teams/${teamId}/logo`);
    const task = uploadBytesResumable(sRef, file, { contentType: file.type });
    task.on(
      "state_changed",
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => resolve(await getDownloadURL(task.snapshot.ref)),
    );
  });
}

// ─── Logo Picker (used inside modals) ──────────────────────────────────────
function LogoPicker({
  currentUrl,
  fallback,
  onFileSelected,
  uploading,
  progress,
}: {
  currentUrl?: string | null;
  fallback: string;
  onFileSelected: (file: File) => void;
  uploading: boolean;
  progress: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB."); return; }
    setPreview(URL.createObjectURL(file));
    onFileSelected(file);
    e.target.value = "";
  };

  const displaySrc = preview ?? currentUrl;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-border bg-muted cursor-pointer group hover:border-primary/50 transition-all overflow-hidden"
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {displaySrc ? (
          <img src={displaySrc} alt="Logo" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xl font-bold text-muted-foreground">{(fallback || "T").slice(0, 2).toUpperCase()}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1">
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 text-white animate-spin" />
              <span className="text-[10px] text-white font-bold">{progress}%</span>
            </>
          ) : (
            <>
              <Camera className="w-5 h-5 text-white" />
              <span className="text-[10px] text-white font-medium">
                {displaySrc ? "Change" : "Upload"}
              </span>
            </>
          )}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">Team logo · max 5 MB</p>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
    </div>
  );
}

// ─── Create Team Modal ──────────────────────────────────────────────────────
function CreateTeamModal({
  clubId,
  defaultSport,
  onClose,
}: {
  clubId: string;
  defaultSport?: string;
  onClose: () => void;
}) {
  const { members } = useMembers(clubId);
  const [name, setName]       = useState("");
  const [sport, setSport]     = useState(defaultSport ?? SPORTS[0]);
  const [captain, setCaptain] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving]   = useState(false);
  const [logoProgress, setLogoProgress] = useState(0);
  const [logoUploading, setLogoUploading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!captain) {
      toast.error("Please select a captain.");
      return;
    }
    const captainMember = members.find((m) => memberUserId(m) === captain);
    if (!captainMember) {
      toast.error("Selected captain not found.");
      return;
    }
    setSaving(true);
    try {
      const cap = captainPlayer(captainMember);
      const teamId = await createTeam(clubId, {
        clubId,
        name: name.trim(),
        sport,
        captainId:        cap.userId,
        captainName:      cap.displayName,
        captainAvatarUrl: cap.avatarUrl,
        players:          serializePlayers([cap]),
        memberCount:      1,
        wins: 0, losses: 0, draws: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      if (logoFile) {
        setLogoUploading(true);
        try {
          const logoUrl = await uploadTeamLogo(clubId, teamId, logoFile, setLogoProgress);
          await updateTeam(clubId, teamId, { logoUrl });
        } catch {
          toast.error("Team created but logo upload failed — you can re-upload from the team card.");
        } finally {
          setLogoUploading(false);
        }
      }

      toast.success("Team created successfully!");
      onClose();
    } catch {
      toast.error("Failed to create team.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground">Create New Team</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Add a team to your club</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-accent transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="px-6 py-5 space-y-5">
          {/* Logo upload */}
          <LogoPicker
            fallback={name}
            onFileSelected={setLogoFile}
            uploading={logoUploading}
            progress={logoProgress}
          />

          {/* Team name */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Team Name <span className="text-primary">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Strike Force A"
              required
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
            />
          </div>

          {/* Sport selector */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              Sport
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {SPORTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSport(s)}
                  className={`py-2 px-1 rounded-xl text-[11px] font-medium transition flex flex-col items-center gap-1 border ${
                    sport === s
                      ? "bg-primary text-primary-foreground border-primary/50 shadow-sm"
                      : "bg-muted text-muted-foreground border-transparent hover:border-border hover:text-foreground"
                  }`}
                >
                  <span className="text-lg leading-none">{sportEmoji(s)}</span>
                  <span className="leading-none">{s}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Captain */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Captain <span className="text-primary">*</span>
            </label>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground px-3 py-2.5 rounded-xl bg-muted border border-border">
                No club members yet — add members before creating a team.
              </p>
            ) : (
              <MemberCombobox
                members={members}
                value={captain}
                onChange={setCaptain}
                required
                placeholder="Search club members…"
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-accent transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim() || !captain || members.length === 0}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" />{logoUploading ? "Uploading logo…" : "Creating…"}</>
              ) : (
                <><Plus className="w-4 h-4" />Create Team</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit Team Modal ────────────────────────────────────────────────────────
function EditTeamModal({ clubId, team, onClose }: { clubId: string; team: Team; onClose: () => void }) {
  const { members } = useMembers(clubId);
  const [name, setName]       = useState(team.name);
  const [sport, setSport]     = useState(team.sport);
  const [captain, setCaptain] = useState(team.captainId ?? "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);
  const [logoProgress, setLogoProgress] = useState(0);
  const [logoUploading, setLogoUploading] = useState(false);

  const handleFileSelected = (file: File) => {
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!captain) {
      toast.error("Please select a captain.");
      return;
    }
    const captainMember = members.find((m) => memberUserId(m) === captain);
    if (!captainMember) {
      toast.error("Selected captain not found.");
      return;
    }
    setSaving(true);
    try {
      const cap = captainPlayer(captainMember, team.players.find((p) => p.userId === captain)?.jerseyNumber ?? 1);
      const updates: Partial<Team> = {
        name:             name.trim(),
        sport,
        captainId:        cap.userId,
        captainName:      cap.displayName,
        captainAvatarUrl: cap.avatarUrl,
        players:          serializePlayers(syncCaptainInRoster(team.players ?? [], team.captainId, cap)),
        memberCount:      syncCaptainInRoster(team.players ?? [], team.captainId, cap).length,
      };

      if (logoFile) {
        setLogoUploading(true);
        try {
          const logoUrl = await uploadTeamLogo(clubId, team.id, logoFile, setLogoProgress);
          updates.logoUrl = logoUrl;
        } catch {
          toast.error("Logo upload failed — other changes will still be saved.");
        } finally {
          setLogoUploading(false);
        }
      }

      await updateTeam(clubId, team.id, updates);
      toast.success("Team updated!");
      onClose();
    } catch {
      toast.error("Failed to update team.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground">Edit Team</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Update team details and logo</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-accent transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="px-6 py-5 space-y-5">
          <LogoPicker
            currentUrl={logoPreview ?? team.logoUrl}
            fallback={name || team.name}
            onFileSelected={handleFileSelected}
            uploading={logoUploading}
            progress={logoProgress}
          />

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Team Name <span className="text-primary">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-xl bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Sport</label>
            <div className="grid grid-cols-4 gap-1.5">
              {SPORTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSport(s)}
                  className={`py-2 px-1 rounded-xl text-[11px] font-medium transition flex flex-col items-center gap-1 border ${
                    sport === s
                      ? "bg-primary text-primary-foreground border-primary/50 shadow-sm"
                      : "bg-muted text-muted-foreground border-transparent hover:border-border hover:text-foreground"
                  }`}
                >
                  <span className="text-lg leading-none">{sportEmoji(s)}</span>
                  <span className="leading-none">{s}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Captain <span className="text-primary">*</span>
            </label>
            <MemberCombobox
              members={members}
              value={captain}
              onChange={setCaptain}
              required
              placeholder="Search club members…"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-accent transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim() || !captain}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" />{logoUploading ? "Uploading…" : "Saving…"}</>
              ) : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────
export default function TeamsPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId }      = use(params);
  const { teams }       = useTeams(clubId);
  const { members }     = useMembers(clubId);
  const [showCreate,    setShowCreate]  = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [createSport,   setCreateSport] = useState<string | undefined>();
  const [editingTeam,   setEditingTeam] = useState<Team | null>(null);
  const [search,        setSearch]      = useState("");
  const [sportFilter,   setSportFilter] = useState("all");
  const [deleting,      setDeleting]    = useState<string | null>(null);

  const sports   = Array.from(new Set(teams.map((t) => t.sport)));
  const filtered = teams.filter((t) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.captainName?.toLowerCase().includes(search.toLowerCase());
    const matchSport  = sportFilter === "all" || t.sport === sportFilter;
    return matchSearch && matchSport;
  });

  const sorted = [...filtered].sort((a, b) => {
    const sportCmp = a.sport.localeCompare(b.sport);
    if (sportCmp !== 0) return sportCmp;
    return a.name.localeCompare(b.name);
  });

  const totalWins   = teams.reduce((s, t) => s + t.wins,   0);
  const totalDraws  = teams.reduce((s, t) => s + t.draws,  0);
  const totalLosses = teams.reduce((s, t) => s + t.losses, 0);

  const handleDelete = async (team: Team) => {
    if (!confirm(`Delete "${team.name}"? This cannot be undone.`)) return;
    setDeleting(team.id);
    try {
      await deleteTeam(clubId, team.id);
      toast.success("Team deleted.");
    } catch {
      toast.error("Failed to delete team.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Modals */}
      {showCreate && (
        <CreateTeamModal
          clubId={clubId}
          defaultSport={createSport}
          onClose={() => { setShowCreate(false); setCreateSport(undefined); }}
        />
      )}
      {editingTeam && <EditTeamModal  clubId={clubId} team={editingTeam} onClose={() => setEditingTeam(null)} />}
      {showBulkImport && (
        <BulkTeamsImportModal
          clubId={clubId}
          members={members}
          existingTeams={teams}
          onClose={() => setShowBulkImport(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Teams</h1>
          <p className="text-sm text-muted-foreground">
            {teams.length} {teams.length === 1 ? "team" : "teams"} across {sports.length} {sports.length === 1 ? "sport" : "sports"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBulkImport(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-accent transition"
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </button>
          <button
            onClick={() => { setCreateSport(sportFilter === "all" ? undefined : sportFilter); setShowCreate(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-95 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Team
          </button>
        </div>
      </div>

      {/* Stats overview strip */}
      {teams.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Teams",  value: teams.length, icon: Trophy,  color: "text-chart-4", bg: "bg-chart-4/10" },
            { label: "Total Wins",   value: totalWins,    icon: Medal,   color: "text-win",     bg: "bg-win/10"     },
            { label: "Total Draws",  value: totalDraws,   icon: Shield,  color: "text-draw",    bg: "bg-draw/10"    },
            { label: "Total Losses", value: totalLosses,  icon: Medal,   color: "text-loss",    bg: "bg-loss/10"    },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-border bg-card px-4 py-3.5 flex items-center gap-3 stat-card"
            >
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`w-4.5 h-4.5 ${s.color}`} style={{width:18,height:18}} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground score-digits leading-none">{s.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search + filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Search teams…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-2 rounded-xl bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 w-48 transition"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {["all", ...sports].map((s) => (
            <button
              key={s}
              onClick={() => setSportFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                sportFilter === s
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {s === "all" ? "All Sports" : `${sportEmoji(s)} ${s}`}
            </button>
          ))}
        </div>
      </div>

      {/* Teams table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Team</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Sport</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">Captain</th>
                <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Players</th>
                <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3">W</th>
                <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3">D</th>
                <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3">L</th>
                <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">Win %</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden xl:table-cell">Created</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16">
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                      <Trophy className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="font-semibold text-foreground">
                      {teams.length === 0 ? "No teams yet" : "No teams match your search"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 mb-5">
                      {teams.length === 0
                        ? "Create your first team to start building squads."
                        : "Try a different sport filter or search term."}
                    </p>
                    {teams.length === 0 && (
                      <button
                        onClick={() => { setCreateSport(sportFilter === "all" ? undefined : sportFilter); setShowCreate(true); }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
                      >
                        <Plus className="w-4 h-4" />
                        Create First Team
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                sorted.map((team) => {
                  const total = team.wins + team.draws + team.losses;
                  const winRate = total > 0 ? Math.round((team.wins / total) * 100) : 0;
                  const playerCount = team.memberCount || team.players?.length || 0;

                  return (
                    <tr key={team.id} className="group hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/clubs/${clubId}/teams/${team.id}`}
                          className="flex items-center gap-3 min-w-0"
                        >
                          <div className="w-9 h-9 rounded-lg overflow-hidden border border-border bg-muted shrink-0">
                            {team.logoUrl ? (
                              <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-primary/10">
                                <span className="text-xs font-bold text-primary">{initials(team.name)}</span>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {team.name}
                            </p>
                            <p className="text-xs text-muted-foreground sm:hidden">
                              {sportEmoji(team.sport)} {team.sport}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                        </Link>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                          {sportEmoji(team.sport)} {team.sport}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {team.captainName ? (
                          <div className="flex items-center gap-2 min-w-0">
                            <MemberAvatar
                              name={team.captainName}
                              avatarUrl={team.captainAvatarUrl}
                              size="sm"
                            />
                            <span className="text-sm text-foreground truncate">{team.captainName}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center hidden lg:table-cell">
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="w-3.5 h-3.5" />
                          {playerCount}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="font-bold score-digits text-win">{team.wins}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="font-bold score-digits text-draw">{team.draws}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="font-bold score-digits text-loss">{team.losses}</span>
                      </td>
                      <td className="px-4 py-3 text-center hidden md:table-cell">
                        {total > 0 ? (
                          <span className="text-sm font-semibold text-foreground">{winRate}%</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden xl:table-cell whitespace-nowrap">
                        {formatDate(team.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            onClick={() => setEditingTeam(team)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition"
                            title="Edit team"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(team)}
                            disabled={deleting === team.id}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition disabled:opacity-50"
                            title="Delete team"
                          >
                            {deleting === team.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {sorted.length > 0 && (
          <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing {sorted.length} of {teams.length} {teams.length === 1 ? "team" : "teams"}
            </span>
            <span>Click a team row to manage squad &amp; settings</span>
          </div>
        )}
      </div>
    </div>
  );
}
