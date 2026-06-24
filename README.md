# Swing Organizer Portal

Production-grade web dashboard for Swing club and tournament organizers. Connects to the same Firebase project as the iOS app and CMS.

## Tech Stack

- **Next.js 16** (App Router) + TypeScript strict
- **Tailwind CSS v4** + shadcn/ui (New York style)
- **Firebase 12** (Firestore + RTDB + Storage + Auth)
- **Firebase Admin 13** (server-side API routes)
- Dark-first UI with Swing red accent (`#FF4444`)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Install shadcn components
npx shadcn@latest init   # (accepts existing components.json)

# 3. Copy env file and fill in values
cp .env.local.example .env.local

# 4. Start dev server
npm run dev    # http://localhost:3000
```

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```env
# Firebase Client (same values as CMS + iOS)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC9zaHYD2up3pxc8BW-icIXoIfOkk5pl5E
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=swing-b7a0c.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://swing-b7a0c-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=swing-b7a0c
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=swing-b7a0c.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=978072149914
NEXT_PUBLIC_FIREBASE_APP_ID=1:978072149914:web:a57f10332c449eecf5a423

# Firebase Admin (from Firebase Console → Project settings → Service accounts)
FIREBASE_PROJECT_ID=swing-b7a0c
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@swing-b7a0c.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

## Data Model

```mermaid
graph TD
  clubs["clubs/{clubId}"] --> members["members/{uid}"]
  clubs --> news["news/{newsId}"]
  clubs --> teams["teams/{teamId}"]
  clubs --> matches["matches/{matchId}"]
  clubs --> standings["standings/{teamId}"]
  clubs --> tournaments["tournaments/{tournamentId}"]
  tournaments --> t_teams["teams/{teamId}"]
  tournaments --> t_matches["matches/{matchId}"]
  tournaments --> t_standings["standings/{teamId}"]
  tournaments --> t_topPlayers["topPlayers/{playerId}"]

  RTDB["RTDB: liveMatches/{matchId}"] --> meta["meta/"]
  RTDB --> events["events/{eventId}"]
  RTDB --> commentary["commentary/{entryId}"]
  RTDB --> presence["presence/{uid}"]
```

## Role Matrix

| Role | Club Settings | Members | Teams | Matches | Live Score | Commentary | Delete |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **owner** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **scorekeeper** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **commentator** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **member** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

Role stored in `clubs/{clubId}/members/{uid}.role` (Firestore).

## Live Control Room

Route: `/dashboard/live/[matchId]`

Real-time scoring via Firebase RTDB at `liveMatches/{matchId}`:

```
liveMatches/{matchId}/
  meta/         — scores, status, period, clock, sport metadata
  events/       — all scoring events (goals, wickets, points…)
  commentary/   — broadcast commentary feed
  presence/     — who's connected (scorekeeper, commentators)
```

### Sport-specific scoring panels

| Sport | Events |
|-------|--------|
| **Football** | Goals, yellow/red cards, period control |
| **Cricket** | Runs (0-6), wickets, extras, over tracking |
| **Padel** | Points → Games → Sets (best-of-3), tiebreak |
| **Basketball** | 2pts, 3pts, free throw, fouls, quarters |
| **Badminton/Pickleball** | Points per set, best-of-3 |

### Scorekeeper lock

Only one scorekeeper can hold the lock at a time. Checked via `meta.scorekeeperUid`. Released on disconnect via `onDisconnect()`.

## iOS Compatibility

The dashboard writes Firestore fields that the iOS app already reads:

| iOS screen | Reads from |
|-----------|-----------|
| Teams tab | `clubs/{id}/teams` |
| Matches tab | `clubs/{id}/matches` (+ tournaments) |
| Standings tab | `clubs/{id}/standings` (+ tournaments) |
| Match LIVE badge | `match.status == "live"` |
| Watch Live link | `match.streamUrl` / `match.youtubeEmbedUrl` |
| News tab | `clubs/{id}/news` |
| Join requests | `clubs/{id}/joinRequests` |

No iOS app changes required — field names are preserved.

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/me` | GET | Verify token + fetch managed clubs |
| `/api/matches/[matchId]/complete` | POST | End match, write score to Firestore |
| `/api/fixtures/generate` | POST | Server-side round-robin fixture generation |

## Deploy

### Vercel (recommended)

```bash
vercel --prod
```

Set all env vars in Vercel dashboard → Project → Settings → Environment Variables.

### Firebase Hosting

```bash
npm run build
npx firebase deploy --only hosting
```

## Development Seed Data

Use the existing **`strike-hitters`** club in Firestore:
1. Log in with the club owner's Firebase Auth account
2. Navigate to `/dashboard/clubs/strike-hitters`
3. Create teams, schedule matches, and open the live control room

To create a test live match in RTDB for development:
```javascript
// Run in browser console after login
const { initialiseLiveMatch } = await import('/lib/rtdb/live-match.ts');
await initialiseLiveMatch('test-match-001', {
  status: 'live', sport: 'Football',
  homeTeamId: 'team-a', homeTeamName: 'Strike Force',
  awayTeamId: 'team-b', awayTeamName: 'Thunder XI',
  homeScore: 0, awayScore: 0, period: 'first_half', clock: 0,
  scorekeeperUid: null, scorekeeperName: null,
  clubId: 'strike-hitters', tournamentId: null,
  firestoreMatchId: 'test-match-001', sportMeta: {},
});
```
# swing_clubs
