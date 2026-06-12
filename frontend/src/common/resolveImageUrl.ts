const API_URL = (process.env.NEXT_PUBLIC_URL || "http://localhost:8080").replace(/\/$/, "");

/**
 * Resolves an image URL: returns as-is if already absolute with correct domain,
 * replaces localhost URLs with the real API URL, otherwise prepends the API base URL.
 */
export function resolveImageUrl(url?: string | null): string | undefined {
  if (!url || url === "") return undefined;
  // Replace any localhost references with the real backend URL
  if (url.includes("localhost:8080") || url.includes("localhost:9000")) {
    return url.replace(/https?:\/\/localhost:\d+/, API_URL);
  }
  if (url.startsWith("http")) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${API_URL}${path}`;
}
