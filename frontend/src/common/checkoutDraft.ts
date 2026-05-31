"use client";

export type CheckoutDraftItem = {
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  productColorId?: number | null;
  productVariantId?: number | null;
  productColor?: string | null;
  ramGb?: number | null;
  storageGb?: number | null;
  imageUrl?: string | null;
  cartItemKey?: string;
};

export type CheckoutDraft = {
  source: "cart" | "buy_now";
  items: CheckoutDraftItem[];
  createdAt: number;
};

const CHECKOUT_DRAFT_KEY = "checkout_draft";

export function writeCheckoutDraft(draft: CheckoutDraft) {
  try {
    sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // ignore
  }
}

export function readCheckoutDraft(): CheckoutDraft | null {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CheckoutDraft;
    if (!parsed || !Array.isArray(parsed.items) || parsed.items.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCheckoutDraft() {
  try {
    sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
  } catch {
    // ignore
  }
}
