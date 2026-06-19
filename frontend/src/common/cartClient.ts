"use client";

import { cartService } from "@/services/cartService";

export const CART_UPDATED_EVENT = "customer-cart-updated";
export const CART_STORAGE_KEY_PREFIX = "cart";
export const CART_STORAGE_KEY_GUEST = `${CART_STORAGE_KEY_PREFIX}:guest`;
const LEGACY_CART_KEYS = ["Cart", "cartItems", "customer_cart", "customer-cart"];

type CartLine = {
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  productVariantId: number | null;
  productColorId: number | null;
  ramGb: number | null;
  storageGb: number | null;
  colorName: string | null;
  imageUrl: string | null;
};

function safeParseCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as CartLine[]) : [];
  } catch {
    return [];
  }
}

function safeParseUserId(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    const id = (parsed as { id?: unknown } | null)?.id;
    return typeof id === "string" && id.trim() ? id.trim() : null;
  } catch {
    return null;
  }
}

export function getActiveCartStorageKey(): string {
  if (typeof window === "undefined") return CART_STORAGE_KEY_GUEST;
  
  // Only use user cart key if BOTH token and user exist
  // This prevents reading old user's cart after logout/token expiration
  const token = window.localStorage.getItem("token");
  const userId = safeParseUserId(window.localStorage.getItem("user"));
  
  return (token && userId) ? `${CART_STORAGE_KEY_PREFIX}:user:${userId}` : CART_STORAGE_KEY_GUEST;
}

function readCartFromAnyKey(): { key: string; cart: CartLine[] } {
  if (typeof window === "undefined") return { key: CART_STORAGE_KEY_GUEST, cart: [] };

  const activeKey = getActiveCartStorageKey();
  const active = safeParseCart(window.localStorage.getItem(activeKey));
  
  // Check if user is authenticated (both token and user must exist)
  const token = window.localStorage.getItem("token");
  const userId = safeParseUserId(window.localStorage.getItem("user"));
  
  // If user is logged in, ONLY use their specific cart key
  // Do NOT fallback to legacy keys to prevent cart mixing between users
  if (token && userId) {
    return { key: activeKey, cart: active };
  }
  
  // For guest users (no token or no user), check legacy keys for backward compatibility
  if (active.length > 0) return { key: activeKey, cart: active };

  const oldPrimary = safeParseCart(window.localStorage.getItem("cart"));
  if (oldPrimary.length > 0) return { key: "cart", cart: oldPrimary };

  for (const k of LEGACY_CART_KEYS) {
    const c = safeParseCart(window.localStorage.getItem(k));
    if (c.length > 0) return { key: k, cart: c };
  }

  return { key: activeKey, cart: active };
}

function migrateCartToActive(fromKey: string, cart: CartLine[]) {
  if (typeof window === "undefined") return;
  if (!cart || cart.length === 0) return;
  const activeKey = getActiveCartStorageKey();
  if (fromKey === activeKey) return;
  try {
    window.localStorage.setItem(activeKey, JSON.stringify(cart));
  } catch {
    // ignore
  }
}

export function getLocalCartTotalQuantity(): number {
  if (typeof window === "undefined") return 0;
  
  // Always read cart from localStorage, regardless of auth state
  // This prevents losing cart data during token verification or auth state changes
  const { key, cart } = readCartFromAnyKey();
  migrateCartToActive(key, cart);
  return cart.reduce((sum, item) => sum + Math.max(0, Number(item?.quantity) || 0), 0);
}

export function emitCartUpdated(totalQuantity?: number) {
  if (typeof window === "undefined") return;
  const detail = { totalQuantity: totalQuantity ?? getLocalCartTotalQuantity() };
  console.log(`[${new Date().toISOString()}] cartClient.ts:emitCartUpdated`, {
    file: 'cartClient.ts',
    function: 'emitCartUpdated',
    totalQuantity: detail.totalQuantity
  });
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT, { detail }));
}

export function addProductToLocalCart(item: CartLine): number {
  if (typeof window === "undefined") return 0;
  const { key, cart } = readCartFromAnyKey();
  migrateCartToActive(key, cart);
  const idx = cart.findIndex(
    (x) => {
      const sameProduct = x?.productId === item.productId;
      const sameColor = (x?.productColorId ?? null) === (item.productColorId ?? null);
      const sameVariant = (x?.productVariantId ?? null) === (item.productVariantId ?? null);
      if (!sameProduct || !sameColor || !sameVariant) return false;
      if ((item.productVariantId ?? null) != null) return true;
      return (x?.ramGb ?? null) === (item.ramGb ?? null) && (x?.storageGb ?? null) === (item.storageGb ?? null);
    }
  );
  if (idx >= 0) {
    const updated = { ...cart[idx], quantity: Number(cart[idx]?.quantity || 0) + item.quantity };
    cart.splice(idx, 1);
    cart.unshift(updated);
  } else {
    cart.unshift(item);
  }
  window.localStorage.setItem(getActiveCartStorageKey(), JSON.stringify(cart));
  const total = cart.reduce((sum, line) => sum + Math.max(0, Number(line?.quantity) || 0), 0);
  emitCartUpdated(total);
  return total;
}

export async function addProductToCart(item: CartLine): Promise<number> {
  if (typeof window === "undefined") return 0;
  const token = window.localStorage.getItem("token");
  const userRaw = window.localStorage.getItem("user");
  const userId = safeParseUserId(userRaw);

  // Guest / chưa đăng nhập: fallback localStorage như hiện tại
  if (!token || !userId) {
    return addProductToLocalCart(item);
  }

  // Đã đăng nhập: lưu về server theo tài khoản
  try {
    const dto = await cartService.addItem({
      productId: item.productId,
      productColorId: item.productColorId,
      productVariantId: item.productVariantId,
      quantity: item.quantity,
    });
    
    // Also update localStorage to keep in sync with server
    const activeKey = getActiveCartStorageKey();
    const serverCart = (dto.items || []).map((it: any) => ({
      productId: Number(it.productId),
      productName: String(it.productName || ""),
      price: Number(it.price || 0),
      quantity: Number(it.quantity || 1),
      productVariantId: it.productVariantId ?? null,
      productColorId: it.productColorId ?? null,
      ramGb: it.ramGb ?? null,
      storageGb: it.storageGb ?? null,
      colorName: it.colorName ?? null,
      imageUrl: it.imageUrl ?? null,
    }));
    console.log(`[${new Date().toISOString()}] cartClient.ts:addProductToCart - BEFORE setItem`, {
      file: 'cartClient.ts',
      function: 'addProductToCart',
      key: activeKey,
      value: JSON.stringify(serverCart),
      itemCount: serverCart.length
    });
    window.localStorage.setItem(activeKey, JSON.stringify(serverCart));
    console.log(`[${new Date().toISOString()}] cartClient.ts:addProductToCart - AFTER setItem`, {
      key: activeKey,
      stored: window.localStorage.getItem(activeKey)
    });
    
    emitCartUpdated(dto.totalQuantity);
    return dto.totalQuantity;
  } catch (e: any) {
    const msg = String(e?.message || "").toLowerCase();
    if (msg.includes("token") || msg.includes("hợp lệ") || msg.includes("đăng nhập") || msg.includes("hết hạn")) {
      window.localStorage.removeItem("token");
      window.localStorage.removeItem("user");
      window.dispatchEvent(new Event("userUpdated"));
      return addProductToLocalCart(item);
    }
    throw e;
  }
}

function pickVisibleCartAnchor(): HTMLElement | null {
  const anchors = Array.from(document.querySelectorAll<HTMLElement>("[data-cart-icon-anchor]"));
  if (anchors.length === 0) return null;
  for (const anchor of anchors) {
    const rect = anchor.getBoundingClientRect();
    const style = window.getComputedStyle(anchor);
    const visible = rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    if (visible) return anchor;
  }
  return anchors[0] ?? null;
}

export function flyProductToCart(sourceEl: HTMLElement, imageUrl?: string | null) {
  if (typeof window === "undefined") return;
  const targetEl = pickVisibleCartAnchor();
  if (!targetEl) return;

  const sourceRect = sourceEl.getBoundingClientRect();
  const targetRect = targetEl.getBoundingClientRect();

  const startX = sourceRect.left + sourceRect.width / 2;
  const startY = sourceRect.top + sourceRect.height / 2;
  const endX = targetRect.left + targetRect.width / 2;
  const endY = targetRect.top + targetRect.height / 2;

  const flyer = document.createElement("div");
  flyer.style.position = "fixed";
  flyer.style.left = `${startX - 20}px`;
  flyer.style.top = `${startY - 20}px`;
  flyer.style.width = "40px";
  flyer.style.height = "40px";
  flyer.style.borderRadius = "9999px";
  flyer.style.zIndex = "9999";
  flyer.style.pointerEvents = "none";
  flyer.style.boxShadow = "0 8px 20px rgba(0,0,0,0.25)";
  flyer.style.background = imageUrl
    ? `center / cover no-repeat url("${String(imageUrl).replace(/"/g, '\\"')}")`
    : "linear-gradient(135deg, #06b6d4, #d946ef)";
  flyer.style.transform = "translate3d(0,0,0) scale(1)";
  flyer.style.opacity = "1";
  flyer.style.transition =
    "transform 700ms cubic-bezier(0.22, 0.75, 0.2, 1), opacity 700ms ease, width 700ms ease, height 700ms ease";

  document.body.appendChild(flyer);

  const deltaX = endX - startX;
  const deltaY = endY - startY;
  requestAnimationFrame(() => {
    flyer.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.3)`;
    flyer.style.opacity = "0.25";
    flyer.style.width = "24px";
    flyer.style.height = "24px";
  });

  window.setTimeout(() => {
    flyer.remove();
  }, 760);
}
