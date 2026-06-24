/**
 * Seeds a complete Swing Sports Club with teams, tournaments, matches, standings
 * and top players into Firestore.
 *
 * Run:
 *   DRY_RUN=true  node scripts/seed-club-data.mjs   (preview — no writes)
 *   DRY_RUN=false node scripts/seed-club-data.mjs   (actually seeds Firebase)
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ── env ───────────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const idx = line.indexOf("=");
    if (idx < 1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}

function normalizePrivateKey(raw) {
  let key = raw.trim();
  for (let i = 0; i < 2; i++) {
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) key = key.slice(1, -1).trim();
  }
  if (key.includes("\\n")) key = key.replace(/\\n/g, "\n");
  return key;
}

const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
const rawKey = process.env.FIREBASE_PRIVATE_KEY;
if (!projectId || !clientEmail || !rawKey) {
  console.error("❌  Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY");
  process.exit(1);
}
if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey: normalizePrivateKey(rawKey) }) });
}

const db = getFirestore();
const DRY_RUN = process.env.DRY_RUN !== "false";
if (DRY_RUN) console.log("🔍  DRY RUN — pass DRY_RUN=false to write\n");

// ── helpers ───────────────────────────────────────────────────────────────────

const now = Date.now();
const ts = (offsetDays = 0) => now + offsetDays * 86400000;

async function set(ref, data) {
  if (DRY_RUN) { console.log("  SET", ref.path, JSON.stringify(data).slice(0, 120)); return; }
  await ref.set(data);
}

// ── CLUB ─────────────────────────────────────────────────────────────────────

const CLUB_ID = "swing-premier-club";

const clubData = {
  id: CLUB_ID,
  name: "Swing Premier Club",
  tagline: "Where Champions Are Made",
  description: "The flagship sports club for Swing's community — hosting cricket, football, basketball and padel competitions year-round.",
  coverImageUrl: "",
  logoImageUrl: "",
  locationLabel: "DLF CyberHub, Gurugram",
  locationCity: "Gurugram",
  locationAddress: "DLF CyberHub, Sector 24, Gurugram, Haryana 122002",
  primarySports: ["Cricket", "Football", "Basketball", "Padel"],
  visibility: "public",
  status: "active",
  ownerId: "seed-owner-uid",
  ownerName: "Swing Admin",
  ownerEmail: "admin@swing.com",
  memberCount: 48,
  contactEmail: "club@swing.com",
  website: "swing.gg",
  instagramHandle: "swingpremierclub",
  foundedYear: "2024",
  createdAt: ts(-120),
  updatedAt: ts(0),
};

// ── MEMBERS ───────────────────────────────────────────────────────────────────

const members = [
  { id: "m1", userId: "m1", displayName: "Arjun Sharma",   role: "owner",   avatarUrl: "", joinedAt: ts(-120), sport: "Cricket" },
  { id: "m2", userId: "m2", displayName: "Priya Kapoor",   role: "admin",   avatarUrl: "", joinedAt: ts(-115), sport: "Padel" },
  { id: "m3", userId: "m3", displayName: "Rahul Verma",    role: "member",  avatarUrl: "", joinedAt: ts(-100), sport: "Football" },
  { id: "m4", userId: "m4", displayName: "Sneha Reddy",    role: "member",  avatarUrl: "", joinedAt: ts(-95),  sport: "Basketball" },
  { id: "m5", userId: "m5", displayName: "Karan Singh",    role: "member",  avatarUrl: "", joinedAt: ts(-90),  sport: "Cricket" },
  { id: "m6", userId: "m6", displayName: "Ananya Gupta",   role: "member",  avatarUrl: "", joinedAt: ts(-85),  sport: "Cricket" },
  { id: "m7", userId: "m7", displayName: "Dev Patel",      role: "member",  avatarUrl: "", joinedAt: ts(-80),  sport: "Football" },
  { id: "m8", userId: "m8", displayName: "Riya Nair",      role: "member",  avatarUrl: "", joinedAt: ts(-75),  sport: "Basketball" },
  { id: "m9", userId: "m9", displayName: "Vikram Joshi",   role: "member",  avatarUrl: "", joinedAt: ts(-70),  sport: "Padel" },
  { id: "m10",userId: "m10",displayName: "Meera Pillai",   role: "member",  avatarUrl: "", joinedAt: ts(-65),  sport: "Football" },
  { id: "m11",userId: "m11",displayName: "Aditya Kumar",   role: "scorekeeper", avatarUrl: "", joinedAt: ts(-60), sport: "Cricket" },
  { id: "m12",userId: "m12",displayName: "Tara Menon",     role: "member",  avatarUrl: "", joinedAt: ts(-55),  sport: "Padel" },
];

// ── CLUB-LEVEL TEAMS ──────────────────────────────────────────────────────────

const T1 = "team-thunder-xi";
const T2 = "team-desert-hawks";
const T3 = "team-midnight-riders";
const T4 = "team-fire-strikers";
const T5 = "team-blaze-fc";
const T6 = "team-neon-fc";
const T7 = "team-storm-ballers";
const T8 = "team-vortex-hoops";

const clubTeams = [
  {
    id: T1, clubId: CLUB_ID, name: "Thunder XI", sport: "Cricket",
    captainId: "m5", captainName: "Karan Singh", captainAvatarUrl: "",
    players: [
      { userId: "m1", displayName: "Arjun Sharma", jerseyNumber: 7, position: "Batsman" },
      { userId: "m5", displayName: "Karan Singh",  jerseyNumber: 10, position: "Captain / All-Rounder" },
      { userId: "m6", displayName: "Ananya Gupta", jerseyNumber: 2, position: "Bowler" },
      { userId: "m11",displayName: "Aditya Kumar", jerseyNumber: 4, position: "Wicketkeeper" },
    ],
    memberCount: 4, wins: 3, losses: 1, draws: 0,
    createdAt: ts(-110), updatedAt: ts(-5),
  },
  {
    id: T2, clubId: CLUB_ID, name: "Desert Hawks", sport: "Cricket",
    captainId: "m6", captainName: "Ananya Gupta", captainAvatarUrl: "",
    players: [
      { userId: "m6", displayName: "Ananya Gupta",  jerseyNumber: 1, position: "Captain / Batsman" },
      { userId: "m2", displayName: "Priya Kapoor",  jerseyNumber: 9, position: "Bowler" },
      { userId: "m12",displayName: "Tara Menon",    jerseyNumber: 5, position: "All-Rounder" },
    ],
    memberCount: 3, wins: 2, losses: 2, draws: 0,
    createdAt: ts(-108), updatedAt: ts(-5),
  },
  {
    id: T3, clubId: CLUB_ID, name: "Midnight Riders", sport: "Cricket",
    captainId: "m11", captainName: "Aditya Kumar", captainAvatarUrl: "",
    players: [
      { userId: "m11",displayName: "Aditya Kumar",  jerseyNumber: 3, position: "Captain / Bowler" },
      { userId: "m9", displayName: "Vikram Joshi",  jerseyNumber: 11, position: "Batsman" },
    ],
    memberCount: 2, wins: 1, losses: 3, draws: 0,
    createdAt: ts(-106), updatedAt: ts(-5),
  },
  {
    id: T4, clubId: CLUB_ID, name: "Fire Strikers XI", sport: "Cricket",
    captainId: "m1", captainName: "Arjun Sharma", captainAvatarUrl: "",
    players: [
      { userId: "m1", displayName: "Arjun Sharma",  jerseyNumber: 8, position: "Captain / Batsman" },
      { userId: "m3", displayName: "Rahul Verma",   jerseyNumber: 6, position: "All-Rounder" },
      { userId: "m7", displayName: "Dev Patel",     jerseyNumber: 14, position: "Bowler" },
    ],
    memberCount: 3, wins: 0, losses: 4, draws: 0,
    createdAt: ts(-104), updatedAt: ts(-5),
  },
  {
    id: T5, clubId: CLUB_ID, name: "Blaze FC", sport: "Football",
    captainId: "m3", captainName: "Rahul Verma", captainAvatarUrl: "",
    players: [
      { userId: "m3", displayName: "Rahul Verma",  jerseyNumber: 9, position: "Captain / Striker" },
      { userId: "m7", displayName: "Dev Patel",    jerseyNumber: 4, position: "Midfielder" },
      { userId: "m10",displayName: "Meera Pillai", jerseyNumber: 1, position: "Goalkeeper" },
    ],
    memberCount: 3, wins: 2, losses: 1, draws: 1,
    createdAt: ts(-100), updatedAt: ts(-3),
  },
  {
    id: T6, clubId: CLUB_ID, name: "Neon FC", sport: "Football",
    captainId: "m10", captainName: "Meera Pillai", captainAvatarUrl: "",
    players: [
      { userId: "m10",displayName: "Meera Pillai", jerseyNumber: 10, position: "Captain / Midfielder" },
      { userId: "m2", displayName: "Priya Kapoor", jerseyNumber: 7,  position: "Winger" },
      { userId: "m8", displayName: "Riya Nair",    jerseyNumber: 3,  position: "Defender" },
    ],
    memberCount: 3, wins: 1, losses: 1, draws: 2,
    createdAt: ts(-98), updatedAt: ts(-3),
  },
  {
    id: T7, clubId: CLUB_ID, name: "Storm Ballers", sport: "Basketball",
    captainId: "m4", captainName: "Sneha Reddy", captainAvatarUrl: "",
    players: [
      { userId: "m4", displayName: "Sneha Reddy",  jerseyNumber: 23, position: "Captain / Point Guard" },
      { userId: "m8", displayName: "Riya Nair",    jerseyNumber: 11, position: "Shooting Guard" },
      { userId: "m12",displayName: "Tara Menon",   jerseyNumber: 5,  position: "Forward" },
    ],
    memberCount: 3, wins: 3, losses: 0, draws: 0,
    createdAt: ts(-95), updatedAt: ts(-2),
  },
  {
    id: T8, clubId: CLUB_ID, name: "Vortex Hoops", sport: "Basketball",
    captainId: "m9", captainName: "Vikram Joshi", captainAvatarUrl: "",
    players: [
      { userId: "m9", displayName: "Vikram Joshi", jerseyNumber: 32, position: "Captain / Center" },
      { userId: "m1", displayName: "Arjun Sharma", jerseyNumber: 8,  position: "Small Forward" },
    ],
    memberCount: 2, wins: 0, losses: 3, draws: 0,
    createdAt: ts(-93), updatedAt: ts(-2),
  },
];

// ── CLUB-LEVEL MATCHES (visible in Matches tab of club) ──────────────────────

const clubMatches = [
  // Cricket
  {
    id: "cm1", clubId: CLUB_ID, homeTeamId: T1, homeTeamName: "Thunder XI", awayTeamId: T2, awayTeamName: "Desert Hawks",
    homeScore: 187, awayScore: 143, status: "completed", sport: "Cricket", matchDate: ts(-28), stage: "League", round: 1,
    venue: "DLF CyberHub Ground, Gurugram",
    recap: "Thunder XI put on a dominant batting display, posting 187 runs on the board. Arjun Sharma top-scored with 78 runs off 52 balls. Desert Hawks fought bravely but fell short by 44 runs.",
    manOfTheMatchName: "Arjun Sharma",
    awards: [{ id: "a-cm1-1", title: "Man of the Match", recipientName: "Arjun Sharma", recipientId: "m1" }],
    highlights: [{ id: "h-cm1-1", title: "Arjun Sharma's 78-run blitz", url: "https://youtu.be/example1", type: "youtube" }],
  },
  {
    id: "cm2", clubId: CLUB_ID, homeTeamId: T3, homeTeamName: "Midnight Riders", awayTeamId: T4, awayTeamName: "Fire Strikers XI",
    homeScore: 162, awayScore: 115, status: "completed", sport: "Cricket", matchDate: ts(-25), stage: "League", round: 1,
    venue: "DLF CyberHub Ground, Gurugram",
    recap: "Midnight Riders bowlers set the tone early, restricting Fire Strikers XI to just 115 runs. Midnight Riders chased comfortably with 5 overs to spare.",
    manOfTheMatchName: "Aditya Kumar",
    awards: [{ id: "a-cm2-1", title: "Man of the Match", recipientName: "Aditya Kumar", recipientId: "m11" }],
    highlights: [],
  },
  {
    id: "cm3", clubId: CLUB_ID, homeTeamId: T1, homeTeamName: "Thunder XI", awayTeamId: T3, awayTeamName: "Midnight Riders",
    homeScore: 201, awayScore: 174, status: "completed", sport: "Cricket", matchDate: ts(-21), stage: "League", round: 2,
    venue: "DLF CyberHub Ground, Gurugram",
    recap: "A high-scoring thriller saw Thunder XI post 201 — their highest total of the season. Midnight Riders put up a spirited chase, but Thunder XI's bowling attack held firm.",
    manOfTheMatchName: "Karan Singh",
    awards: [{ id: "a-cm3-1", title: "Man of the Match", recipientName: "Karan Singh", recipientId: "m5" }],
    highlights: [{ id: "h-cm3-1", title: "Karan Singh smashes century", url: "https://youtu.be/example2", type: "youtube" }],
  },
  {
    id: "cm4", clubId: CLUB_ID, homeTeamId: T2, homeTeamName: "Desert Hawks", awayTeamId: T4, awayTeamName: "Fire Strikers XI",
    homeScore: 155, awayScore: 138, status: "completed", sport: "Cricket", matchDate: ts(-18), stage: "League", round: 2,
    venue: "DLF CyberHub Ground, Gurugram",
    recap: "Desert Hawks edged out Fire Strikers XI in a close contest. Tara Menon's 62-run knock was the difference between the sides.",
    manOfTheMatchName: "Tara Menon",
    awards: [{ id: "a-cm4-1", title: "Man of the Match", recipientName: "Tara Menon", recipientId: "m12" }],
    highlights: [],
  },
  { id: "cm5", clubId: CLUB_ID, homeTeamId: T1, homeTeamName: "Thunder XI", awayTeamId: T4, awayTeamName: "Fire Strikers XI",
    homeScore: null, awayScore: null, status: "scheduled", sport: "Cricket", matchDate: ts(3), stage: "League", round: 3,
    venue: "DLF CyberHub Ground, Gurugram", highlights: [], awards: [] },
  { id: "cm6", clubId: CLUB_ID, homeTeamId: T2, homeTeamName: "Desert Hawks", awayTeamId: T3, awayTeamName: "Midnight Riders",
    homeScore: null, awayScore: null, status: "scheduled", sport: "Cricket", matchDate: ts(5), stage: "League", round: 3,
    venue: "DLF CyberHub Ground, Gurugram", highlights: [], awards: [] },
  // Football
  {
    id: "cm7", clubId: CLUB_ID, homeTeamId: T5, homeTeamName: "Blaze FC", awayTeamId: T6, awayTeamName: "Neon FC",
    homeScore: 2, awayScore: 1, status: "completed", sport: "Football", matchDate: ts(-14), stage: "QF", round: 1,
    venue: "5-a-side Turf, Sector 44",
    recap: "Blaze FC secured a hard-fought quarter-final victory. Goals from Rohit and Priya put them 2-0 up before Neon FC pulled one back late on.",
    manOfTheMatchName: "Rohit Mehta",
    awards: [{ id: "a-cm7-1", title: "Man of the Match", recipientName: "Rohit Mehta", recipientId: "m7" }],
    highlights: [{ id: "h-cm7-1", title: "Rohit's stunning opener", url: "https://youtu.be/example3", type: "youtube" }],
  },
  { id: "cm8", clubId: CLUB_ID, homeTeamId: T6, homeTeamName: "Neon FC", awayTeamId: T5, awayTeamName: "Blaze FC",
    homeScore: null, awayScore: null, status: "scheduled", sport: "Football", matchDate: ts(7), stage: "Final", round: 2,
    venue: "5-a-side Turf, Sector 44", highlights: [], awards: [] },
  // Basketball
  {
    id: "cm9", clubId: CLUB_ID, homeTeamId: T7, homeTeamName: "Storm Ballers", awayTeamId: T8, awayTeamName: "Vortex Hoops",
    homeScore: 78, awayScore: 52, status: "completed", sport: "Basketball", matchDate: ts(-10), stage: "SF", round: 1,
    venue: "Courtyard Sports Complex",
    recap: "Storm Ballers dominated from tip-off, building a 20-point lead by halftime. Vortex Hoops never recovered as Storm Ballers cruised to a comfortable semi-final win.",
    manOfTheMatchName: "Vikram Joshi",
    awards: [{ id: "a-cm9-1", title: "MVP", recipientName: "Vikram Joshi", recipientId: "m9" }],
    highlights: [],
  },
  {
    id: "cm10", clubId: CLUB_ID, homeTeamId: T7, homeTeamName: "Storm Ballers", awayTeamId: T8, awayTeamName: "Vortex Hoops",
    homeScore: 91, awayScore: 60, status: "completed", sport: "Basketball", matchDate: ts(-7), stage: "Final", round: 2,
    venue: "Courtyard Sports Complex",
    recap: "Storm Ballers crowned Basketball Summer Cup champions with another commanding performance. 91-60 in the final says it all — a truly dominant season.",
    manOfTheMatchName: "Vikram Joshi",
    awards: [
      { id: "a-cm10-1", title: "MVP", recipientName: "Vikram Joshi", recipientId: "m9" },
      { id: "a-cm10-2", title: "Tournament Champion", recipientName: "Storm Ballers", recipientId: null },
    ],
    highlights: [{ id: "h-cm10-1", title: "Championship Highlights", url: "https://youtu.be/example4", type: "youtube" }],
  },
];

// ── TOURNAMENTS ───────────────────────────────────────────────────────────────

const TOURN1 = "tourn-cricket-league-s1";
const TOURN2 = "tourn-football-knockout";
const TOURN3 = "tourn-basketball-cup";

const tournaments = [
  {
    id: TOURN1, clubId: CLUB_ID,
    name: "Premier Cricket League – Season 1",
    description: "A round-robin league featuring the top four cricket squads of Swing Premier Club. Top 2 teams advance to the knockout stage.",
    sport: "Cricket",
    format: "league",
    status: "active",
    startDate: ts(-30), endDate: ts(15),
    location: "DLF CyberHub Ground, Gurugram",
    maxTeams: 4, teamCount: 4, matchCount: 6,
    registrationOpen: false,
    createdAt: ts(-32), updatedAt: ts(-1),
  },
  {
    id: TOURN2, clubId: CLUB_ID,
    name: "Football Knockout Championship",
    description: "Single-elimination knockout tournament. One loss and you're out — only the strongest team wins.",
    sport: "Football",
    format: "knockout",
    status: "active",
    startDate: ts(-15), endDate: ts(10),
    location: "5-a-side Turf, Sector 44",
    maxTeams: 4, teamCount: 4, matchCount: 3,
    registrationOpen: false,
    createdAt: ts(-18), updatedAt: ts(-1),
  },
  {
    id: TOURN3, clubId: CLUB_ID,
    name: "Basketball Summer Cup",
    description: "Best-of-3 series cup format for the Swing basketball squads. Fast, intense, and winner-takes-all.",
    sport: "Basketball",
    format: "knockout",
    status: "completed",
    startDate: ts(-12), endDate: ts(-5),
    location: "Courtyard Sports Complex",
    maxTeams: 2, teamCount: 2, matchCount: 2,
    registrationOpen: false,
    createdAt: ts(-14), updatedAt: ts(-5),
  },
];

// ── TOURNAMENT 1: Cricket League — teams, matches, standings, topPlayers ──────

const t1Teams = [T1, T2, T3, T4].map(id => clubTeams.find(t => t.id === id));

const t1Matches = [
  { id: "t1m1", clubId: CLUB_ID, tournamentId: TOURN1, homeTeamId: T1, homeTeamName: "Thunder XI",       awayTeamId: T2, awayTeamName: "Desert Hawks",    homeScore: 187, awayScore: 143, status: "completed", sport: "Cricket", matchDate: ts(-28), stage: "group", round: 1, isKnockout: false },
  { id: "t1m2", clubId: CLUB_ID, tournamentId: TOURN1, homeTeamId: T3, homeTeamName: "Midnight Riders",  awayTeamId: T4, awayTeamName: "Fire Strikers XI", homeScore: 162, awayScore: 115, status: "completed", sport: "Cricket", matchDate: ts(-25), stage: "group", round: 1, isKnockout: false },
  { id: "t1m3", clubId: CLUB_ID, tournamentId: TOURN1, homeTeamId: T1, homeTeamName: "Thunder XI",       awayTeamId: T3, awayTeamName: "Midnight Riders",  homeScore: 201, awayScore: 174, status: "completed", sport: "Cricket", matchDate: ts(-21), stage: "group", round: 2, isKnockout: false },
  { id: "t1m4", clubId: CLUB_ID, tournamentId: TOURN1, homeTeamId: T2, homeTeamName: "Desert Hawks",     awayTeamId: T4, awayTeamName: "Fire Strikers XI", homeScore: 155, awayScore: 138, status: "completed", sport: "Cricket", matchDate: ts(-18), stage: "group", round: 2, isKnockout: false },
  { id: "t1m5", clubId: CLUB_ID, tournamentId: TOURN1, homeTeamId: T2, homeTeamName: "Desert Hawks",     awayTeamId: T3, awayTeamName: "Midnight Riders",  homeScore: 168, awayScore: 141, status: "completed", sport: "Cricket", matchDate: ts(-14), stage: "group", round: 3, isKnockout: false },
  { id: "t1m6", clubId: CLUB_ID, tournamentId: TOURN1, homeTeamId: T1, homeTeamName: "Thunder XI",       awayTeamId: T4, awayTeamName: "Fire Strikers XI", homeScore: 0,   awayScore: 0,   status: "scheduled", sport: "Cricket", matchDate: ts(3),   stage: "group", round: 3, isKnockout: false },
];

const t1Standings = [
  { id: T1, teamId: T1, teamName: "Thunder XI",       played: 3, won: 3, drawn: 0, lost: 0, goalsFor: 575, goalsAgainst: 432, points: 9,  position: 1, sport: "Cricket" },
  { id: T2, teamId: T2, teamName: "Desert Hawks",     played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 466, goalsAgainst: 451, points: 6,  position: 2, sport: "Cricket" },
  { id: T3, teamId: T3, teamName: "Midnight Riders",  played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 477, goalsAgainst: 520, points: 3,  position: 3, sport: "Cricket" },
  { id: T4, teamId: T4, teamName: "Fire Strikers XI", played: 2, won: 0, drawn: 0, lost: 2, goalsFor: 253, goalsAgainst: 342, points: 0,  position: 4, sport: "Cricket" },
];

const t1TopPlayers = [
  { id: "tp1", userId: "m5",  name: "Karan Singh",   profileImageUrl: "", teamId: T1, teamName: "Thunder XI",    sport: "Cricket", statLabel: "Runs",    statValue: 312, position: 1 },
  { id: "tp2", userId: "m6",  name: "Ananya Gupta",  profileImageUrl: "", teamId: T2, teamName: "Desert Hawks",  sport: "Cricket", statLabel: "Wickets", statValue: 9,   position: 2 },
  { id: "tp3", userId: "m1",  name: "Arjun Sharma",  profileImageUrl: "", teamId: T1, teamName: "Thunder XI",    sport: "Cricket", statLabel: "Runs",    statValue: 278, position: 3 },
  { id: "tp4", userId: "m11", name: "Aditya Kumar",  profileImageUrl: "", teamId: T3, teamName: "Midnight Riders",sport: "Cricket",statLabel: "Wickets", statValue: 7,   position: 4 },
  { id: "tp5", userId: "m12", name: "Tara Menon",    profileImageUrl: "", teamId: T2, teamName: "Desert Hawks",  sport: "Cricket", statLabel: "Runs",    statValue: 195, position: 5 },
];

// ── TOURNAMENT 2: Football Knockout ───────────────────────────────────────────

const T5b = "team-storm-united";
const T6b = "team-phoenix-rangers";

const extraFootballTeams = [
  {
    id: T5b, clubId: CLUB_ID, name: "Storm United", sport: "Football",
    captainId: "m9", captainName: "Vikram Joshi",
    players: [
      { userId: "m9", displayName: "Vikram Joshi", jerseyNumber: 6,  position: "Captain / Defender" },
      { userId: "m4", displayName: "Sneha Reddy",  jerseyNumber: 11, position: "Midfielder" },
    ],
    memberCount: 2, wins: 0, losses: 1, draws: 0,
    createdAt: ts(-90), updatedAt: ts(-3),
  },
  {
    id: T6b, clubId: CLUB_ID, name: "Phoenix Rangers", sport: "Football",
    captainId: "m8", captainName: "Riya Nair",
    players: [
      { userId: "m8", displayName: "Riya Nair",   jerseyNumber: 7, position: "Captain / Winger" },
      { userId: "m12",displayName: "Tara Menon",  jerseyNumber: 3, position: "Defender" },
    ],
    memberCount: 2, wins: 0, losses: 1, draws: 0,
    createdAt: ts(-88), updatedAt: ts(-3),
  },
];

const t2Matches = [
  { id: "t2m1", clubId: CLUB_ID, tournamentId: TOURN2, homeTeamId: T5,  homeTeamName: "Blaze FC",       awayTeamId: T5b, awayTeamName: "Storm United",    homeScore: 3,  awayScore: 1,  status: "completed", sport: "Football", matchDate: ts(-14), stage: "QF", round: 1, isKnockout: true, knockoutStage: "QF" },
  { id: "t2m2", clubId: CLUB_ID, tournamentId: TOURN2, homeTeamId: T6,  homeTeamName: "Neon FC",        awayTeamId: T6b, awayTeamName: "Phoenix Rangers",  homeScore: 2,  awayScore: 0,  status: "completed", sport: "Football", matchDate: ts(-13), stage: "QF", round: 1, isKnockout: true, knockoutStage: "QF" },
  { id: "t2m3", clubId: CLUB_ID, tournamentId: TOURN2, homeTeamId: T5,  homeTeamName: "Blaze FC",       awayTeamId: T6,  awayTeamName: "Neon FC",          homeScore: 0,  awayScore: 0,  status: "scheduled", sport: "Football", matchDate: ts(7),   stage: "Final", round: 2, isKnockout: true, knockoutStage: "Final" },
];

const t2TopPlayers = [
  { id: "tf1", userId: "m3",  name: "Rahul Verma",  profileImageUrl: "", teamId: T5, teamName: "Blaze FC", sport: "Football", statLabel: "Goals", statValue: 4, position: 1 },
  { id: "tf2", userId: "m10", name: "Meera Pillai", profileImageUrl: "", teamId: T6, teamName: "Neon FC",  sport: "Football", statLabel: "Goals", statValue: 2, position: 2 },
  { id: "tf3", userId: "m7",  name: "Dev Patel",    profileImageUrl: "", teamId: T5, teamName: "Blaze FC", sport: "Football", statLabel: "Assists",statValue: 3, position: 3 },
];

// ── TOURNAMENT 3: Basketball Cup ──────────────────────────────────────────────

const t3Matches = [
  { id: "t3m1", clubId: CLUB_ID, tournamentId: TOURN3, homeTeamId: T7, homeTeamName: "Storm Ballers", awayTeamId: T8, awayTeamName: "Vortex Hoops", homeScore: 78, awayScore: 52, status: "completed", sport: "Basketball", matchDate: ts(-10), stage: "SF",    round: 1, isKnockout: true, knockoutStage: "SF" },
  { id: "t3m2", clubId: CLUB_ID, tournamentId: TOURN3, homeTeamId: T7, homeTeamName: "Storm Ballers", awayTeamId: T8, awayTeamName: "Vortex Hoops", homeScore: 91, awayScore: 60, status: "completed", sport: "Basketball", matchDate: ts(-7),  stage: "Final", round: 2, isKnockout: true, knockoutStage: "Final" },
];

const t3TopPlayers = [
  { id: "tb1", userId: "m4", name: "Sneha Reddy",  profileImageUrl: "", teamId: T7, teamName: "Storm Ballers", sport: "Basketball", statLabel: "Points", statValue: 41, position: 1 },
  { id: "tb2", userId: "m8", name: "Riya Nair",    profileImageUrl: "", teamId: T7, teamName: "Storm Ballers", sport: "Basketball", statLabel: "Points", statValue: 38, position: 2 },
  { id: "tb3", userId: "m9", name: "Vikram Joshi", profileImageUrl: "", teamId: T8, teamName: "Vortex Hoops", sport: "Basketball", statLabel: "Points", statValue: 29, position: 3 },
];

// ── SEED ──────────────────────────────────────────────────────────────────────

async function seed() {
  const clubRef = db.collection("clubs").doc(CLUB_ID);

  console.log(`\n📦  Club: ${CLUB_ID}`);
  await set(clubRef, clubData);

  // Members
  console.log(`\n👥  Members (${members.length})`);
  for (const m of members) await set(clubRef.collection("members").doc(m.id), m);

  // Club teams (all sports)
  const allClubTeams = [...clubTeams, ...extraFootballTeams];
  console.log(`\n🏅  Club teams (${allClubTeams.length})`);
  for (const t of allClubTeams) await set(clubRef.collection("teams").doc(t.id), t);

  // Club-level matches
  console.log(`\n⚽  Club matches (${clubMatches.length})`);
  for (const m of clubMatches) await set(clubRef.collection("matches").doc(m.id), m);

  // ── Tournament 1: Cricket League ──
  console.log(`\n🏆  Tournament 1: ${tournaments[0].name}`);
  await set(clubRef.collection("tournaments").doc(TOURN1), tournaments[0]);
  const t1Ref = clubRef.collection("tournaments").doc(TOURN1);
  for (const t of t1Teams) { if (t) await set(t1Ref.collection("teams").doc(t.id), { ...t, tournamentId: TOURN1 }); }
  for (const m of t1Matches) await set(t1Ref.collection("matches").doc(m.id), m);
  for (const s of t1Standings) await set(t1Ref.collection("standings").doc(s.id), s);
  for (const p of t1TopPlayers) await set(t1Ref.collection("topPlayers").doc(p.id), p);

  // ── Tournament 2: Football Knockout ──
  console.log(`\n🏆  Tournament 2: ${tournaments[1].name}`);
  await set(clubRef.collection("tournaments").doc(TOURN2), tournaments[1]);
  const t2Ref = clubRef.collection("tournaments").doc(TOURN2);
  for (const t of [T5, T6, T5b, T6b].map(id => allClubTeams.find(x => x.id === id)).filter(Boolean)) {
    await set(t2Ref.collection("teams").doc(t.id), { ...t, tournamentId: TOURN2 });
  }
  for (const m of t2Matches) await set(t2Ref.collection("matches").doc(m.id), m);
  for (const p of t2TopPlayers) await set(t2Ref.collection("topPlayers").doc(p.id), p);

  // ── Tournament 3: Basketball Cup ──
  console.log(`\n🏆  Tournament 3: ${tournaments[2].name}`);
  await set(clubRef.collection("tournaments").doc(TOURN3), tournaments[2]);
  const t3Ref = clubRef.collection("tournaments").doc(TOURN3);
  for (const t of [T7, T8].map(id => clubTeams.find(x => x.id === id)).filter(Boolean)) {
    await set(t3Ref.collection("teams").doc(t.id), { ...t, tournamentId: TOURN3 });
  }
  for (const m of t3Matches) await set(t3Ref.collection("matches").doc(m.id), m);
  for (const p of t3TopPlayers) await set(t3Ref.collection("topPlayers").doc(p.id), p);

  console.log(`\n✅  Done! Club "${clubData.name}" seeded in project ${projectId}`);
  if (DRY_RUN) console.log("    → Re-run with DRY_RUN=false to actually write.\n");
}

seed().catch(e => { console.error(e); process.exit(1); });
