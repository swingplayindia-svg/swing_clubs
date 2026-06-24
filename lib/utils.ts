import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(timestamp: number | Date, opts?: Intl.DateTimeFormatOptions): string {
  const d = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", ...opts });
}

export function formatTime(timestamp: number | Date): string {
  const d = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function formatMatchClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export function sportEmoji(sport?: string | null): string {
  if (!sport) return "🏅";
  const map: Record<string, string> = {
    football: "⚽", cricket: "🏏", padel: "🎾",
    pickleball: "🏓", basketball: "🏀", badminton: "🏸",
    tennis: "🎾", hockey: "🏑", volleyball: "🏐",
    rugby: "🏉", swimming: "🏊",
  };
  return map[sport.toLowerCase()] ?? "🏅";
}

export function getFormBadgeColor(result: string): string {
  if (result === "W") return "bg-win/20 text-win border-win/30";
  if (result === "L") return "bg-loss/20 text-loss border-loss/30";
  return "bg-draw/20 text-draw border-draw/30";
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
