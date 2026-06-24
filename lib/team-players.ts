import type { ClubMember } from "@/lib/schemas/club";
import type { TeamPlayer } from "@/lib/schemas/team";

export function memberUserId(m: ClubMember): string {
  return m.userId || m.id;
}

export function memberToPlayer(
  member: ClubMember,
  opts?: { position?: string; jerseyNumber?: number },
): TeamPlayer {
  const player: TeamPlayer = {
    userId: memberUserId(member),
    displayName: member.displayName,
  };
  if (member.avatarUrl) player.avatarUrl = member.avatarUrl;
  if (opts?.position) player.position = opts.position;
  if (opts?.jerseyNumber != null && !Number.isNaN(opts.jerseyNumber)) {
    player.jerseyNumber = opts.jerseyNumber;
  }
  return player;
}

/** Clean player objects before writing to Firestore. */
export function serializeTeamPlayer(player: TeamPlayer): TeamPlayer {
  const out: TeamPlayer = {
    userId: player.userId,
    displayName: player.displayName,
  };
  if (player.avatarUrl) out.avatarUrl = player.avatarUrl;
  if (player.position) out.position = player.position;
  if (player.jerseyNumber != null && !Number.isNaN(player.jerseyNumber)) {
    out.jerseyNumber = player.jerseyNumber;
  }
  return out;
}

export function serializePlayers(players: TeamPlayer[]): TeamPlayer[] {
  return players.map(serializeTeamPlayer);
}

export function captainPlayer(member: ClubMember, jerseyNumber = 1): TeamPlayer {
  return memberToPlayer(member, { position: "Captain", jerseyNumber });
}

export function syncCaptainInRoster(
  players: TeamPlayer[],
  prevCaptainId: string | undefined,
  newCaptain: TeamPlayer,
): TeamPlayer[] {
  const withoutOld = players.filter(
    (p) => p.userId !== prevCaptainId && p.userId !== newCaptain.userId,
  );
  return [newCaptain, ...withoutOld];
}
