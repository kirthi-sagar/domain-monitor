import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(d: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-US", opts ?? { year: "numeric", month: "short", day: "numeric" }).format(date);
}

export function daysUntil(d: string | Date | null | undefined): number | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  const ms = date.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function expirySeverity(days: number | null): "ok" | "warn" | "crit" | "expired" | "unknown" {
  if (days === null) return "unknown";
  if (days < 0) return "expired";
  if (days <= 7) return "crit";
  if (days <= 30) return "warn";
  return "ok";
}
