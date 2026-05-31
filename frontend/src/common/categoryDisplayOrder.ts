/**
 * Thứ tự hiển thị danh mục: Điện thoại → Đồng hồ → Tai nghe → Phụ kiện;
 * danh mục khác xếp sau cùng.
 */
const CATEGORY_DISPLAY_RANK: Record<string, number> = {
  "điện thoại": 0,
  "đồng hồ": 1,
  "tai nghe": 2,
  "phụ kiện": 3,
};

const CATEGORY_ORDER_KEYS = ["điện thoại", "đồng hồ", "tai nghe", "phụ kiện"] as const;

export function categoryDisplayRank(categoryName: string | null | undefined): number {
  const key = (categoryName ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  const direct = CATEGORY_DISPLAY_RANK[key];
  if (direct !== undefined) return direct;
  for (let i = CATEGORY_ORDER_KEYS.length - 1; i >= 0; i--) {
    const needle = CATEGORY_ORDER_KEYS[i];
    if (key.includes(needle)) return CATEGORY_DISPLAY_RANK[needle];
  }
  return CATEGORY_ORDER_KEYS.length;
}

export type ProductCategorySortFields = {
  categoryName?: string | null;
  productName?: string | null;
};

export function compareProductsByCategoryThenName(
  a: ProductCategorySortFields,
  b: ProductCategorySortFields
): number {
  const ra = categoryDisplayRank(a.categoryName);
  const rb = categoryDisplayRank(b.categoryName);
  if (ra !== rb) return ra - rb;
  const ca = (a.categoryName ?? "").toLowerCase();
  const cb = (b.categoryName ?? "").toLowerCase();
  if (ca < cb) return -1;
  if (ca > cb) return 1;
  const na = (a.productName ?? "").toLowerCase();
  const nb = (b.productName ?? "").toLowerCase();
  if (na < nb) return -1;
  if (na > nb) return 1;
  return 0;
}
