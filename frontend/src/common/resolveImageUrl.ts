const API_URL = (process.env.NEXT_PUBLIC_URL || "http://localhost:8080").replace(/\/$/, "");

/**
 * Resolves an image URL: returns as-is if already absolute,
 * otherwise prepends the API base URL.
 */
export function resolveImageUrl(url?: string | null): string | undefined {
  if (!url || url === "") return undefined;
  if (url.startsWith("http")) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${API_URL}${path}`;
}
