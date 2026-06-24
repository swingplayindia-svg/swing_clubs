export type ClubVisibility = "public" | "private";
export type ClubStatus     = "active" | "suspended";
export type MemberRole     = "owner" | "admin" | "scorekeeper" | "commentator" | "member";

export interface Club {
  id: string;
  name: string;
  tagline: string;
  description: string;
  coverImageUrl: string;
  logoImageUrl: string;
  locationLabel: string;
  locationCity: string;
  locationAddress?: string;
  latitude?: number;
  longitude?: number;
  primarySports: string[];
  visibility: ClubVisibility;
  status: ClubStatus;
  ownerId: string;
  ownerName: string;
  ownerEmail?: string;
  applicationId?: string;
  memberCount: number;
  contactEmail?: string;
  website?: string;
  instagramHandle?: string;
  foundedYear?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ClubMember {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  email?: string;
  role: MemberRole;
  joinedAt: number;
  sport?: string;
}

export interface JoinRequest {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  email?: string;
  status: "pending" | "approved" | "rejected";
  message?: string;
  createdAt: number;
  updatedAt: number;
}
