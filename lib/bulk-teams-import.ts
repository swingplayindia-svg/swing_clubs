import type { ClubMember } from "@/lib/schemas/club";
import type { Team } from "@/lib/schemas/team";
import { normalizeSport, CLUB_SPORTS } from "@/lib/constants/sports";
import { memberUserId, memberToPlayer, captainPlayer, serializePlayers } from "@/lib/team-players";
import { createTeam } from "@/lib/firestore/teams";

/** One CSV row = one player on a team. Repeat team_name/sport for each player. */
export const BULK_TEAM_CSV_COLUMNS = [
  { key: "team_name", label: "Team Name", required: true },
  { key: "sport", label: "Sport", required: true },
  { key: "captain_email", label: "Captain Email", required: true },
  { key: "player_email", label: "Player Email", required: false },
  { key: "player_name", label: "Player Name", required: false },
  { key: "position", label: "Position", required: false },
  { key: "jersey_number", label: "Jersey #", required: false },
  { key: "is_captain", label: "Is Captain (yes/no)", required: false },
] as const;

const HEADER_ALIASES: Record<string, string> = {
  team_name: "team_name",
  team: "team_name",
  "team name": "team_name",
  teamname: "team_name",
  sport: "sport",
  captain_email: "captain_email",
  "captain email": "captain_email",
  captain: "captain_email",
  captains_email: "captain_email",
  player_email: "player_email",
  "player email": "player_email",
  email: "player_email",
  member_email: "player_email",
  player_name: "player_name",
  "player name": "player_name",
  name: "player_name",
  member_name: "player_name",
  display_name: "player_name",
  player: "player_name",
  position: "position",
  pos: "position",
  jersey_number: "jersey_number",
  jersey: "jersey_number",
  "jersey #": "jersey_number",
  number: "jersey_number",
  is_captain: "is_captain",
  "is captain": "is_captain",
  captain_flag: "is_captain",
};

export interface BulkTeamCsvRow {
  lineNumber: number;
  team_name: string;
  sport: string;
  captain_email: string;
  player_email: string;
  player_name: string;
  position: string;
  jersey_number: string;
  is_captain: string;
}

export interface ResolvedBulkPlayer {
  lineNumber: number;
  playerEmail: string;
  playerName: string;
  position: string;
  jerseyNumber?: number;
  isCaptain: boolean;
  member: ClubMember | null;
  matchLabel: string;
}

export interface BulkTeamPreview {
  key: string;
  teamName: string;
  sport: string;
  captainEmail: string;
  captainMember: ClubMember | null;
  players: ResolvedBulkPlayer[];
  errors: string[];
  warnings: string[];
  ready: boolean;
  duplicateExisting: boolean;
}

export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
      row.push(cell.trim());
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
      cell = "";
      if (ch === "\r") i++;
    } else if (ch !== "\r") {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some((c) => c !== "")) rows.push(row);
  }

  return rows;
}

function normalizeHeader(h: string): string {
  return HEADER_ALIASES[h.trim().toLowerCase()] ?? h.trim().toLowerCase();
}

export function parseBulkTeamCsv(text: string): BulkTeamCsvRow[] {
  const grid = parseCsvText(text.replace(/^\uFEFF/, ""));
  if (grid.length < 2) return [];

  const headers = grid[0].map(normalizeHeader);
  const idx = (key: string) => headers.indexOf(key);

  const required = ["team_name", "sport", "captain_email"];
  if (!required.every((k) => idx(k) >= 0)) return [];

  return grid.slice(1).map((cells, i) => {
    const get = (key: string) => (idx(key) >= 0 ? cells[idx(key)] ?? "" : "").trim();
    return {
      lineNumber: i + 2,
      team_name: get("team_name"),
      sport: get("sport"),
      captain_email: get("captain_email"),
      player_email: get("player_email"),
      player_name: get("player_name"),
      position: get("position"),
      jersey_number: get("jersey_number"),
      is_captain: get("is_captain"),
    };
  }).filter((r) => r.team_name || r.player_email || r.player_name);
}

export function findClubMember(
  members: ClubMember[],
  email?: string,
  name?: string,
): ClubMember | null {
  const e = email?.trim().toLowerCase();
  if (e) {
    const byEmail = members.find((m) => m.email?.trim().toLowerCase() === e);
    if (byEmail) return byEmail;
  }

  const n = name?.trim().toLowerCase();
  if (n) {
    const exact = members.find((m) => m.displayName.trim().toLowerCase() === n);
    if (exact) return exact;
    const partial = members.filter((m) => m.displayName.trim().toLowerCase().includes(n));
    if (partial.length === 1) return partial[0];
  }

  return null;
}

function parseJersey(raw: string): number | undefined {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 && n <= 99 ? n : undefined;
}

function parseCaptainFlag(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  return v === "yes" || v === "y" || v === "true" || v === "1" || v === "captain";
}

function teamKey(name: string, sport: string): string {
  return `${name.trim().toLowerCase()}|${sport.trim().toLowerCase()}`;
}

export function buildBulkTeamPreviews(
  rows: BulkTeamCsvRow[],
  members: ClubMember[],
  existingTeams: Team[],
): BulkTeamPreview[] {
  const existingKeys = new Set(
    existingTeams.map((t) => teamKey(t.name, t.sport)),
  );

  const grouped = new Map<string, BulkTeamCsvRow[]>();
  for (const row of rows) {
    const sport = normalizeSport(row.sport);
    if (!row.team_name.trim()) continue;
    const key = teamKey(row.team_name, sport ?? row.sport);
    (grouped.get(key) ?? grouped.set(key, []).get(key)!)!.push(row);
  }

  const previews: BulkTeamPreview[] = [];

  for (const [key, teamRows] of grouped) {
    const errors: string[] = [];
    const warnings: string[] = [];

    const teamName = teamRows[0].team_name.trim();
    const sportNorm = normalizeSport(teamRows[0].sport);
    if (!sportNorm) {
      errors.push(`Invalid sport "${teamRows[0].sport}". Use: ${CLUB_SPORTS.join(", ")}`);
    }

    const captainEmails = [...new Set(teamRows.map((r) => r.captain_email.trim().toLowerCase()).filter(Boolean))];
    if (captainEmails.length > 1) {
      warnings.push(`Multiple captain emails in file — using "${captainEmails[0]}"`);
    }
    const captainEmail = captainEmails[0] ?? "";
    if (!captainEmail) errors.push("Captain email is required");

    const captainMember = captainEmail
      ? findClubMember(members, captainEmail)
      : null;
    if (captainEmail && !captainMember) {
      errors.push(`Captain not found in club members: ${captainEmail}`);
    }

    const resolvedPlayers: ResolvedBulkPlayer[] = [];
    const seenUserIds = new Set<string>();

    for (const row of teamRows) {
      if (!row.player_email && !row.player_name) {
        warnings.push(`Row ${row.lineNumber}: skipped — no player email or name`);
        continue;
      }

      const member = findClubMember(members, row.player_email, row.player_name);
      const matchLabel = member
        ? member.email
          ? `${member.displayName} (${member.email})`
          : member.displayName
        : row.player_email || row.player_name;

      if (!member) {
        errors.push(
          `Row ${row.lineNumber}: player not found — ${row.player_email || row.player_name}`,
        );
        resolvedPlayers.push({
          lineNumber: row.lineNumber,
          playerEmail: row.player_email,
          playerName: row.player_name,
          position: row.position,
          jerseyNumber: parseJersey(row.jersey_number),
          isCaptain: parseCaptainFlag(row.is_captain),
          member: null,
          matchLabel,
        });
        continue;
      }

      const uid = memberUserId(member);
      if (seenUserIds.has(uid)) {
        warnings.push(`Row ${row.lineNumber}: duplicate player "${member.displayName}" — skipped`);
        continue;
      }
      seenUserIds.add(uid);

      resolvedPlayers.push({
        lineNumber: row.lineNumber,
        playerEmail: row.player_email,
        playerName: row.player_name,
        position: row.position,
        jerseyNumber: parseJersey(row.jersey_number),
        isCaptain: parseCaptainFlag(row.is_captain),
        member,
        matchLabel,
      });
    }

    // Ensure captain is on roster
    if (captainMember && !seenUserIds.has(memberUserId(captainMember))) {
      resolvedPlayers.unshift({
        lineNumber: 0,
        playerEmail: captainMember.email ?? "",
        playerName: captainMember.displayName,
        position: "Captain",
        jerseyNumber: 1,
        isCaptain: true,
        member: captainMember,
        matchLabel: captainMember.email
          ? `${captainMember.displayName} (${captainMember.email})`
          : captainMember.displayName,
      });
      seenUserIds.add(memberUserId(captainMember));
      warnings.push("Captain was not listed as a player — added automatically");
    }

    if (resolvedPlayers.filter((p) => p.member).length === 0) {
      errors.push("No valid players mapped to club members");
    }

    if (captainMember) {
      const capId = memberUserId(captainMember);
      const capInRoster = resolvedPlayers.some((p) => p.member && memberUserId(p.member) === capId);
      if (!capInRoster) {
        errors.push("Captain must be included as a player on the team");
      }
    }

    const duplicateExisting = sportNorm
      ? existingKeys.has(teamKey(teamName, sportNorm))
      : false;
    if (duplicateExisting) {
      errors.push(`Team "${teamName}" (${sportNorm}) already exists in this club`);
    }

    const ready =
      errors.length === 0 &&
      !!sportNorm &&
      !!captainMember &&
      resolvedPlayers.some((p) => p.member);

    previews.push({
      key,
      teamName,
      sport: sportNorm ?? teamRows[0].sport,
      captainEmail,
      captainMember,
      players: resolvedPlayers,
      errors,
      warnings,
      ready,
      duplicateExisting,
    });
  }

  return previews.sort((a, b) => a.teamName.localeCompare(b.teamName));
}

export function downloadBulkTeamsTemplate(): void {
  const header = BULK_TEAM_CSV_COLUMNS.map((c) => c.key).join(",");
  const examples = [
    "Strike Force,Football,captain@club.com,captain@club.com,Alex Morgan,Captain,1,yes",
    "Strike Force,Football,captain@club.com,player2@club.com,Jordan Lee,MID,8,no",
    "Strike Force,Football,captain@club.com,player3@club.com,Sam Taylor,FWD,9,no",
    "Thunder XI,Cricket,skip@club.com,skip@club.com,Skip Verma,WK,1,yes",
    "Thunder XI,Cricket,skip@club.com,batsman@club.com,Riya Patel,BAT,18,no",
  ];
  const blob = new Blob(
    [`${header}\n${examples.join("\n")}\n`],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: "teams-bulk-import-template.csv",
  });
  a.click();
  URL.revokeObjectURL(url);
}

export async function executeBulkTeamImport(
  clubId: string,
  previews: BulkTeamPreview[],
  onProgress?: (done: number, total: number, teamName: string) => void,
): Promise<{ success: number; errors: string[] }> {
  const toImport = previews.filter((p) => p.ready);
  const errors: string[] = [];
  let success = 0;

  for (let i = 0; i < toImport.length; i++) {
    const group = toImport[i];
    onProgress?.(i, toImport.length, group.teamName);

    try {
      const sport = normalizeSport(group.sport);
      if (!sport || !group.captainMember) {
        errors.push(`${group.teamName}: missing sport or captain`);
        continue;
      }

      const capId = memberUserId(group.captainMember);
      const roster = group.players
        .filter((p) => p.member)
        .map((p) => {
          const m = p.member!;
          const isCap = memberUserId(m) === capId || p.isCaptain;
          return memberToPlayer(m, {
            position: isCap ? "Captain" : p.position || undefined,
            jerseyNumber: p.jerseyNumber ?? (isCap ? 1 : undefined),
          });
        });

      const cap = captainPlayer(
        group.captainMember,
        roster.find((p) => p.userId === capId)?.jerseyNumber ?? 1,
      );

      const players = serializePlayers(
        roster.some((p) => p.userId === capId)
          ? roster.map((p) => (p.userId === capId ? { ...cap, position: "Captain" } : p))
          : [cap, ...roster.filter((p) => p.userId !== capId)],
      );

      await createTeam(clubId, {
        clubId,
        name: group.teamName,
        sport,
        captainId: cap.userId,
        captainName: cap.displayName,
        captainAvatarUrl: cap.avatarUrl,
        players,
        memberCount: players.length,
        wins: 0,
        losses: 0,
        draws: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      success++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`${group.teamName}: ${msg}`);
    }
  }

  onProgress?.(toImport.length, toImport.length, "");

  for (const p of previews.filter((x) => !x.ready)) {
    errors.push(
      `${p.teamName}: skipped — ${p.errors[0] ?? "validation failed"}`,
    );
  }

  return { success, errors };
}
