"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Upload,
  X,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import type { ClubMember } from "@/lib/schemas/club";
import type { Team } from "@/lib/schemas/team";
import { MemberAvatar } from "@/components/teams/member-avatar";
import { sportEmoji } from "@/lib/utils";
import {
  BULK_TEAM_CSV_COLUMNS,
  buildBulkTeamPreviews,
  downloadBulkTeamsTemplate,
  executeBulkTeamImport,
  parseBulkTeamCsv,
  type BulkTeamPreview,
} from "@/lib/bulk-teams-import";

type Step = "upload" | "review" | "importing" | "done";

interface BulkTeamsImportModalProps {
  clubId: string;
  members: ClubMember[];
  existingTeams: Team[];
  onClose: () => void;
}

export function BulkTeamsImportModal({
  clubId,
  members,
  existingTeams,
  onClose,
}: BulkTeamsImportModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0, label: "" });
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);

  const [rawRows, setRawRows] = useState<ReturnType<typeof parseBulkTeamCsv>>([]);

  const previews = useMemo(
    () => buildBulkTeamPreviews(rawRows, members, existingTeams),
    [rawRows, members, existingTeams],
  );

  const readyCount = previews.filter((p) => p.ready).length;
  const totalPlayers = previews.reduce(
    (n, p) => n + p.players.filter((pl) => pl.member).length,
    0,
  );

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a .csv file");
      return;
    }
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseBulkTeamCsv(text);
      if (parsed.length === 0) {
        toast.error("No valid rows found. Download the template and check column headers.");
        return;
      }
      setRawRows(parsed);
      setExpanded(new Set(buildBulkTeamPreviews(parsed, members, existingTeams).map((p) => p.key)));
      setStep("review");
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (readyCount === 0) {
      toast.error("No teams are ready to import. Fix mapping errors first.");
      return;
    }
    setStep("importing");
    try {
      const res = await executeBulkTeamImport(clubId, previews, (done, total, label) => {
        setImportProgress({ done, total, label });
      });
      setResult(res);
      setStep("done");
      if (res.success > 0) toast.success(`Created ${res.success} team${res.success === 1 ? "" : "s"}`);
      if (res.errors.length > 0) toast.error(`${res.errors.length} issue(s) during import`);
    } catch {
      toast.error("Import failed");
      setStep("review");
    }
  };

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground">Bulk Import Teams &amp; Squads</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload a CSV — one row per player. Players are matched to club members by email or name.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Column reference */}
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              CSV columns
            </p>
            <div className="flex flex-wrap gap-1.5">
              {BULK_TEAM_CSV_COLUMNS.map((c) => (
                <span
                  key={c.key}
                  className={`text-[11px] px-2 py-0.5 rounded-md border ${
                    c.required
                      ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                      : "bg-background border-border text-muted-foreground"
                  }`}
                >
                  {c.key}{c.required ? " *" : ""}
                </span>
              ))}
            </div>
          </div>

          {step === "upload" && (
            <>
              <button
                type="button"
                onClick={downloadBulkTeamsTemplate}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition text-sm"
              >
                <Download className="w-4 h-4 text-primary shrink-0" />
                <div className="text-left">
                  <p className="font-medium text-foreground">Download CSV Template</p>
                  <p className="text-xs text-muted-foreground">
                    Includes example teams with captain + squad rows
                  </p>
                </div>
              </button>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (file) handleFile(file);
                }}
                onClick={() => fileRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-12 cursor-pointer transition ${
                  dragging
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                }`}
              >
                <FileText className="w-9 h-9 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    {fileName ?? "Drop your CSV here"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">or click to browse</p>
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />

              <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-amber-600">Mapping rules</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Players must already be <strong className="text-foreground">club members</strong></li>
                  <li>Match by <strong className="text-foreground">player_email</strong> first, then player_name</li>
                  <li>Repeat team_name + sport on every player row</li>
                  <li>captain_email must match a member who is on the squad</li>
                </ul>
              </div>
            </>
          )}

          {(step === "review" || step === "importing" || step === "done") && (
            <>
              {/* Summary bar */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Teams found", value: previews.length },
                  { label: "Ready to import", value: readyCount, accent: "text-win" },
                  { label: "Players mapped", value: totalPlayers, accent: "text-primary" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-center">
                    <p className={`text-2xl font-bold score-digits ${s.accent ?? "text-foreground"}`}>{s.value}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>

              {step === "importing" && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-4 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      Creating teams… {importProgress.done}/{importProgress.total}
                    </p>
                    {importProgress.label && (
                      <p className="text-xs text-muted-foreground truncate">{importProgress.label}</p>
                    )}
                    <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{
                          width: importProgress.total
                            ? `${(importProgress.done / importProgress.total) * 100}%`
                            : "0%",
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Team groups */}
              <div className="space-y-2">
                {previews.map((group) => (
                  <TeamPreviewCard
                    key={group.key}
                    group={group}
                    expanded={expanded.has(group.key)}
                    onToggle={() => toggleExpand(group.key)}
                  />
                ))}
              </div>

              {result && step === "done" && (
                <div className="rounded-xl border border-border p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-win" />
                    <p className="text-sm font-semibold text-foreground">
                      {result.success} team{result.success === 1 ? "" : "s"} created successfully
                    </p>
                  </div>
                  {result.errors.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-loss">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{e}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-border shrink-0">
          {step === "review" && (
            <button
              type="button"
              onClick={() => { setStep("upload"); setRawRows([]); setFileName(null); }}
              className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-accent transition"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-accent transition"
          >
            {step === "done" ? "Close" : "Cancel"}
          </button>
          {step === "review" && (
            <button
              type="button"
              onClick={() => void handleImport()}
              disabled={readyCount === 0}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Import {readyCount} Team{readyCount === 1 ? "" : "s"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TeamPreviewCard({
  group,
  expanded,
  onToggle,
}: {
  group: BulkTeamPreview;
  expanded: boolean;
  onToggle: () => void;
}) {
  const mapped = group.players.filter((p) => p.member).length;
  const failed = group.players.filter((p) => !p.member).length;

  return (
    <div
      className={`rounded-xl border overflow-hidden ${
        group.ready
          ? "border-win/30 bg-win/5"
          : "border-destructive/30 bg-destructive/5"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/20 transition"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground">{group.teamName}</span>
            <span className="text-xs text-muted-foreground">
              {sportEmoji(group.sport)} {group.sport}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Captain: {group.captainEmail}
            {group.captainMember ? (
              <span className="text-win ml-1">· matched</span>
            ) : (
              <span className="text-loss ml-1">· not found</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {mapped}
          </span>
          {group.ready ? (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-win/15 text-win border border-win/30">
              Ready
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/30">
              {failed > 0 ? `${failed} unmapped` : "Error"}
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/50 px-4 py-3 space-y-3 bg-card/50">
          {(group.errors.length > 0 || group.warnings.length > 0) && (
            <div className="space-y-1">
              {group.errors.map((e, i) => (
                <p key={`e-${i}`} className="text-xs text-destructive flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {e}
                </p>
              ))}
              {group.warnings.map((w, i) => (
                <p key={`w-${i}`} className="text-xs text-amber-600">{w}</p>
              ))}
            </div>
          )}

          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left font-semibold pb-2 pr-2">Row</th>
                <th className="text-left font-semibold pb-2 pr-2">CSV value</th>
                <th className="text-left font-semibold pb-2 pr-2">Mapped member</th>
                <th className="text-left font-semibold pb-2 pr-2">Position</th>
                <th className="text-left font-semibold pb-2">#</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {group.players.map((p, i) => (
                <tr key={i}>
                  <td className="py-2 pr-2 text-muted-foreground">{p.lineNumber || "—"}</td>
                  <td className="py-2 pr-2 text-foreground">
                    {p.playerEmail || p.playerName || "—"}
                  </td>
                  <td className="py-2 pr-2">
                    {p.member ? (
                      <div className="flex items-center gap-1.5">
                        <MemberAvatar
                          name={p.member.displayName}
                          avatarUrl={p.member.avatarUrl}
                          size="sm"
                        />
                        <span className="text-foreground font-medium">{p.matchLabel}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-win shrink-0" />
                      </div>
                    ) : (
                      <span className="text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Not found
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-2 text-muted-foreground">{p.position || "—"}</td>
                  <td className="py-2 text-muted-foreground">{p.jerseyNumber ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
