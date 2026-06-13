const API_URL = (process.env.NEXT_PUBLIC_URL || "http://localhost:8080").replace(/\/$/, "");

// Backblaze B2 bucket name — dùng để trích objectName từ URL trực tiếp
const B2_BUCKET_NAME = process.env.NEXT_PUBLIC_B2_BUCKET_NAME || "myphone-datn";

/**
 * Resolves an image URL:
 * - localhost URLs → replace với real backend URL
 * - Backblaze B2 direct URLs (f*.backblazeb2.com/file/<bucket>/<objectName>)
 *   → proxy qua backend /api/files/<objectName> vì bucket là private
 * - relative paths → prepend API base URL
 * - already absolute with correct domain → return as-is
 */
export function resolveImageUrl(url?: string | null): string | undefined {
  if (!url || url === "") return undefined;

  // Replace any localhost references with the real backend URL
  if (url.includes("localhost:8080") || url.includes("localhost:9000")) {
    return url.replace(/https?:\/\/localhost:\d+/, API_URL);
  }

  // Convert Backblaze B2 direct URL → backend proxy
  // Pattern: https://f005.backblazeb2.com/file/<bucket>/<objectName>
  const b2Match = url.match(/https?:\/\/f\d+\.backblazeb2\.com\/file\/[^/]+\/(.+)/);
  if (b2Match) {
    return `${API_URL}/api/files/${b2Match[1]}`;
  }

  if (url.startsWith("http")) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${API_URL}${path}`;
}
