const API_URL = (process.env.NEXT_PUBLIC_URL || "http://localhost:8080").replace(/\/$/, "");

// Backblaze B2 bucket name — dùng để trích objectName từ URL trực tiếp
const B2_BUCKET_NAME = process.env.NEXT_PUBLIC_B2_BUCKET_NAME || "myphone-datn";

/**
 * Resolves an image URL:
 * - blob: URLs (local preview) → return as-is
 * - localhost URLs → replace với real backend URL
 * - Old Render URLs → replace với current backend URL
 * - Backblaze B2 direct URLs → proxy qua backend /api/files/ vì bucket là private
 * - relative paths → prepend API base URL
 * - already absolute → return as-is
 */
export function resolveImageUrl(url?: string | null): string | undefined {
  if (!url || url === "") return undefined;

  // Blob URLs (local preview) — giữ nguyên
  if (url.startsWith("blob:")) return url;

  // Replace old Render domain with current backend
  if (url.includes("datn-backend-d0et.onrender.com")) {
    const fixedUrl = url.replace("https://datn-backend-d0et.onrender.com", API_URL);
    console.log('[resolveImageUrl] Old Render URL detected, replacing:', url, '→', fixedUrl);
    return fixedUrl;
  }

  // Replace any localhost references with the real backend URL
  if (url.includes("localhost:8080") || url.includes("localhost:9000")) {
    return url.replace(/https?:\/\/localhost:\d+/, API_URL);
  }

  // Convert Backblaze B2 direct URL → backend proxy
  // Pattern: https://f005.backblazeb2.com/file/<bucket>/<objectName>
  const b2Match = url.match(/https?:\/\/f\d+\.backblazeb2\.com\/file\/[^/]+\/(.+)/);
  if (b2Match) {
    const proxyUrl = `${API_URL}/api/files/${b2Match[1]}`;
    console.log('[resolveImageUrl] B2 URL detected, converting to proxy:', url, '→', proxyUrl);
    return proxyUrl;
  }

  // Already absolute URL (https:// or http://)
  if (url.startsWith("http")) {
    console.log('[resolveImageUrl] Absolute URL, returning as-is:', url);
    return url;
  }
  
  // Relative path - prepend API URL
  const path = url.startsWith("/") ? url : `/${url}`;
  const finalUrl = `${API_URL}${path}`;
  console.log('[resolveImageUrl] Relative URL detected, prepending API_URL:', url, '→', finalUrl);
  return finalUrl;
}
