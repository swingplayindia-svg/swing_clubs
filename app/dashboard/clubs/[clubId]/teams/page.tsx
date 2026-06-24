"use client";

import { use, useRef, useState } from "react";
import { useTeams, useMembers } from "@/hooks/use-club-data";
import { createTeam, deleteTeam, updateTeam } from "@/lib/firestore/teams";
import { formatDate, sportEmoji, initials } from "@/lib/utils";
import { Plus, Trash2, Users, Trophy, X, Camera, Loader2, Edit2, Search, Star, Medal, Shield } from "lucide-react";
import { toast } from "sonner";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase";
import type { Team } from "@/lib/schemas/team";

const SPORTS = [
  "Football", "Cricket", "Padel", "Pickleball",
  "Basketball", "Badminton", "Tennis", "Hockey",
];

const SPORT_COLORS: Record<string, string> = {
  Football:   "from-green-500/20 to-green-500/5 border-green-500/30",
  Cricket:    "from-amber-500/20 to-amber-500/5 border-amber-500/30",
  Basketball: "from-orange-500/20 to-orange-500/5 border-orange-500/30",
  Badminton:  "from-blue-500/20 to-blue-500/5 border-blue-500/30",
  Tennis:     "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30",
  Hockey:     "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30",
  Padel:      "from-violet-500/20 to-violet-500/5 border-violet-500/30",
  Pickleball: "from-pink-500/20 to-pink-500/5 border-pink-500/30",
};

const SPORT_ACCENT: Record<string, string> = {
  Football:   "bg-green-500",
  Cricket:    "bg-amber-500",
  Basketball: "bg-orange-500",
  Badminton:  "bg-blue-500",
  Tennis:     "bg-yellow-500",
  Hockey:     "bg-emerald-500",
  Padel:      "bg-violet-500",
  Pickleball: "bg-pink-500",
};

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
function CreateTeamModal({ clubId, onClose }: { clubId: string; onClose: () => void }) {
  const { members } = useMembers(clubId);
  const [name, setName]       = useState("");
  const [sport, setSport]     = useState(SPORTS[0]);
  const [captain, setCaptain] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving]   = useState(false);
  const [logoProgress, setLogoProgress] = useState(0);
  const [logoUploading, setLogoUploading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const captainMember = members.find((m) => m.userId === captain);
      const teamId = await createTeam(clubId, {
        clubId,
        name: name.trim(),
        sport,
        captainId:   captainMember?.userId,
        captainName: captainMember?.displayName,
        players:     [],
        memberCount: 0,
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
              Captain <span className="text-muted-foreground font-normal normal-case">(optional)</span>
            </label>
            <select
              value={captain}
              onChange={(e) => setCaptain(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
            >
              <option value="">— No captain —</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>{m.displayName}</option>
              ))}
            </select>
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
              disabled={saving || !name.trim()}
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
    setSaving(true);
    try {
      const captainMember = members.find((m) => m.userId === captain);
      const updates: Partial<Team> = {
        name:        name.trim(),
        sport,
        captainId:   captainMember?.userId,
        captainName: captainMember?.displayName,
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
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Captain</label>
            <select
              value={captain}
              onChange={(e) => setCaptain(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
            >
              <option value="">— No captain —</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>{m.displayName}</option>
              ))}
            </select>
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
              disabled={saving || !name.trim()}
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

// ─── Inline logo uploader on the team card ─────────────────────────────────
function CardLogoUpload({
  clubId,
  team,
  onUploaded,
}: {
  clubId: string;
  team: Team;
  onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please select an image."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB."); return; }

    const sRef = storageRef(getFirebaseStorage(), `clubs/${clubId}/teams/${team.id}/logo`);
    const task = uploadBytesResumable(sRef, file, { contentType: file.type });
    task.on(
      "state_changed",
      (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      () => { toast.error("Upload failed."); setProgress(null); },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        await updateTeam(clubId, team.id, { logoUrl: url });
        onUploaded(url);
        setProgress(null);
        toast.success("Team logo updated!");
      },
    );
  };

  return (
    <>
      <div
        className="absolute inset-0 rounded-xl flex items-center justify-center cursor-pointer"
        onClick={(e) => { e.stopPropagation(); if (progress == null) inputRef.current?.click(); }}
      >
        {progress != null ? (
          <div className="flex flex-col items-center gap-0.5">
            <Loader2 className="w-4 h-4 text-white animate-spin" />
            <span className="text-[9px] text-white font-bold">{progress}%</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-0.5">
            <Camera className="w-4 h-4 text-white" />
            <span className="text-[9px] text-white">Change</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </>
  );
}

// ─── Team Card ──────────────────────────────────────────────────────────────
function TeamCard({
  team,
  clubId,
  onDelete,
  onEdit,
  deleting,
}: {
  team: Team;
  clubId: string;
  onDelete: () => void;
  onEdit: () => void;
  deleting: boolean;
}) {
  const [localLogoUrl, setLocalLogoUrl] = useState<string | undefined>(team.logoUrl);
  const total   = team.wins + team.draws + team.losses;
  const winRate = total > 0 ? Math.round((team.wins / total) * 100) : 0;
  const accentClass = SPORT_ACCENT[team.sport] ?? "bg-primary";

  return (
    <div className="relative rounded-2xl border border-border bg-card hover:border-border/80 transition-all group overflow-hidden flex flex-col">
      {/* Sport colour top strip */}
      <div className={`h-[3px] w-full shrink-0 ${accentClass}`} />

      <div className="p-5 flex flex-col flex-1">
        {/* Header: logo + name + actions */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hoverable logo */}
            <div className="relative shrink-0 w-13 h-13">
              <div className="w-13 h-13 rounded-xl overflow-hidden border border-border/60 bg-muted" style={{width:52,height:52}}>
                {localLogoUrl ? (
                  <img src={localLogoUrl} alt={team.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10">
                    <span className="text-sm font-bold text-primary">{initials(team.name)}</span>
                  </div>
                )}
              </div>
              {/* Camera overlay */}
              <div className="absolute inset-0 rounded-xl bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity" style={{width:52,height:52}}>
                <CardLogoUpload
                  clubId={clubId}
                  team={{ ...team, logoUrl: localLogoUrl }}
                  onUploaded={(url) => setLocalLogoUrl(url)}
                />
              </div>
            </div>

            <div className="min-w-0">
              <p className="font-bold text-foreground text-sm leading-tight truncate">{team.name}</p>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                {sportEmoji(team.sport)} {team.sport}
              </span>
            </div>
          </div>

          {/* Edit & delete — visible on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition"
              title="Edit team"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              disabled={deleting}
              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition disabled:opacity-50"
              title="Delete team"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* W / D / L stats */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {([
            { label: "W", val: team.wins,   bg: "bg-win/10",  fg: "text-win"  },
            { label: "D", val: team.draws,  bg: "bg-draw/10", fg: "text-draw" },
            { label: "L", val: team.losses, bg: "bg-loss/10", fg: "text-loss" },
          ] as const).map(({ label, val, bg, fg }) => (
            <div key={label} className={`${bg} rounded-xl py-2.5 text-center`}>
              <p className={`text-lg font-bold score-digits ${fg}`}>{val}</p>
              <p className="text-[10px] text-muted-foreground font-semibold tracking-wide">{label}</p>
            </div>
          ))}
        </div>

        {/* Win-rate bar */}
        {total > 0 ? (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">Win rate · {total} played</span>
              <span className="text-[10px] font-bold text-foreground">{winRate}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-win transition-all duration-700"
                style={{ width: `${winRate}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <div className="h-1.5 rounded-full bg-muted" />
            <p className="text-[10px] text-muted-foreground mt-1">No matches played yet</p>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-auto flex items-center gap-3 flex-wrap pt-1">
          {team.captainName && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>{team.captainName}</span>
            </div>
          )}
          {team.memberCount > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Users className="w-3 h-3" />
              <span>{team.memberCount} players</span>
            </div>
          )}
          <span className="text-[11px] text-muted-foreground ml-auto">
            {formatDate(team.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────
export default function TeamsPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId }      = use(params);
  const { teams }       = useTeams(clubId);
  const [showCreate,    setShowCreate]  = useState(false);
  const [editingTeam,   setEditingTeam] = useState<Team | null>(null);
  const [search,        setSearch]      = useState("");
  const [sportFilter,   setSportFilter] = useState("all");
  const [deleting,      setDeleting]    = useState<string | null>(null);

  const sports   = Array.from(new Set(teams.map((t) => t.sport)));
  const filtered = teams.filter((t) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchSport  = sportFilter === "all" || t.sport === sportFilter;
    return matchSearch && matchSport;
  });

  // Group by sport for display
  const grouped = filtered.reduce<Record<string, Team[]>>((acc, team) => {
    (acc[team.sport] ??= []).push(team);
    return acc;
  }, {});

  const totalWins   = teams.reduce((s, t) => s + t.wins,   0);
  const totalDraws  = teams.reduce((s, t) => s + t.draws,  0);
  const totalLosses = teams.reduce((s, t) => s + t.losses, 0);
  const totalPlayed = totalWins + totalDraws + totalLosses;

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
      {showCreate  && <CreateTeamModal clubId={clubId} onClose={() => setShowCreate(false)} />}
      {editingTeam && <EditTeamModal  clubId={clubId} team={editingTeam} onClose={() => setEditingTeam(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Teams</h1>
          <p className="text-sm text-muted-foreground">
            {teams.length} {teams.length === 1 ? "team" : "teams"} across {sports.length} {sports.length === 1 ? "sport" : "sports"}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-95 transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Team
        </button>
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

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Trophy className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-foreground font-semibold text-base">
            {teams.length === 0 ? "No teams yet" : "No teams match your search"}
          </p>
          <p className="text-sm text-muted-foreground mt-1 mb-5">
            {teams.length === 0
              ? "Create your first team and add a logo — it will instantly appear in the iOS app."
              : "Try a different sport filter or search term."}
          </p>
          {teams.length === 0 && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create First Team
            </button>
          )}
        </div>
      ) : (
        /* Grouped by sport */
        <div className="space-y-8 pb-4">
          {Object.entries(grouped).map(([sport, sportTeams]) => (
            <section key={sport}>
              {/* Sport section header */}
              <div className="flex items-center gap-2.5 mb-4">
                <span className="text-xl leading-none">{sportEmoji(sport)}</span>
                <h2 className="text-sm font-bold text-foreground">{sport}</h2>
                <div className="h-px flex-1 bg-border/60" />
                <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">
                  {sportTeams.length} {sportTeams.length === 1 ? "team" : "teams"}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sportTeams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    clubId={clubId}
                    onDelete={() => handleDelete(team)}
                    onEdit={() => setEditingTeam(team)}
                    deleting={deleting === team.id}
                  />
                ))}

                {/* "Add team" ghost card */}
                <button
                  onClick={() => { setSportFilter(sport); setShowCreate(true); }}
                  className="rounded-2xl border border-dashed border-border bg-card/30 hover:bg-card hover:border-primary/30 transition group flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground hover:text-primary"
                >
                  <div className="w-10 h-10 rounded-xl border-2 border-dashed border-current flex items-center justify-center">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium">Add {sport} team</span>
                </button>
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Bottom hint */}
      {teams.length > 0 && (
        <p className="text-[11px] text-muted-foreground text-center pb-2">
          Hover a team card to change its logo · changes sync to the iOS app instantly
        </p>
      )}
    </div>
  );
}
