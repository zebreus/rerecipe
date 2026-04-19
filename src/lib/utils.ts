import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function round(n: number, decimals = 2): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

export function statusColor(
  status: string
): string {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "in-progress":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "planned":
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    case "failed":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "abandoned":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }
}

/** Generate a timestamped export filename from a project name. */
export function exportFilename(projectName: string): string {
  const safeName = projectName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "project";
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  return `${safeName}-${timestamp}.json`;
}

/** Validate imported JSON and return a descriptive error or null if valid. */
export function describeImportError(text: string): string | null {
  try {
    const parsed = JSON.parse(text);
    const requiredFields = ["project", "ingredients", "formulas", "protocols", "trials", "targetProduct"];
    const missing = requiredFields.filter((f) => !(f in parsed));
    if (missing.length > 0) {
      return `Import failed. Missing required field(s): ${missing.map((f) => `'${f}'`).join(", ")}.`;
    }
    return null;
  } catch {
    return "Import failed. The input is not valid JSON.";
  }
}
