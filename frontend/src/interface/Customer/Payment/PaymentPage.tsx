"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Package,
  CheckCircle2,
  XCircle,
  Truck,
  ShieldCheck,
  Wallet,
  ShoppingBag,
  ArrowRight,
  Info,
} from "lucide-react";

import { orderService, type OrderDto } from "@/services/orderService";
import { bankTransferService } from "@/services/bankTransferService";
import { productService, type ProductDto } from "@/services/productService";
import { clearCheckoutDraft, readCheckoutDraft, type CheckoutDraft } from "@/common/checkoutDraft";
import { emitCartUpdated, getActiveCartStorageKey } from "@/common/cartClient";
import { cartService } from "@/services/cartService";
import { customerAccountService } from "@/services/customerAccountService";
import BankTransferQr from "@/components/customer/BankTransferQr";
import { useAppNotification } from "@/providers/AppNotificationProvider";
import { resolveImageUrl } from "@/common/resolveImageUrl";

type User = {
  id: string;
};

function readCustomerId(): number | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const user = JSON.parse(raw) as Partial<User>;
    const id = user?.id ? Number(user.id) : NaN;
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
}

function toNumberSafe(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : 0;
}

function getDraftItemOriginalPrice(
  it: CheckoutDraft["items"][number],
  product?: ProductDto
): number | null {
  const raw = (it as { originalPrice?: unknown })?.originalPrice;
  const fromDraft = typeof raw === "string" || typeof raw === "number" ? Number(raw) : NaN;
  if (Number.isFinite(fromDraft) && fromDraft > 0) return fromDraft;

  const variantId = (it as { productVariantId?: unknown })?.productVariantId;
  const safeVariantId =
    typeof variantId === "string" || typeof variantId === "number" ? Number(variantId) : NaN;

  if (product && Number.isFinite(safeVariantId) && safeVariantId > 0) {
    const colors = product.productColors || [];
    for (const c of colors) {
      const variants = c.variants || [];
      const v = variants.find((x) => Number(x.variantId) === safeVariantId);
      if (v && v.originalPrice != null) {
        const n = Number(v.originalPrice);
        if (Number.isFinite(n) && n > 0) return n;
      }
    }
  }

  if (product && product.originalBasePrice != null) {
    const n = Number(product.originalBasePrice);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showStatus } = useAppNotification();

  const [loading, setLoading] = React.useState(true);
  const [paying, setPaying] = React.useState<"COD" | "BANK_TRANSFER" | null>(null);
  const [success, setSuccess] = React.useState<"COD" | "BANK_TRANSFER" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<CheckoutDraft | null>(null);
  const [createdOrder, setCreatedOrder] = React.useState<OrderDto | null>(null);
  const [productMap, setProductMap] = React.useState<Record<number, ProductDto>>({});

  const [receiverName, setReceiverName] = React.useState("");
  const [receiverPhone, setReceiverPhone] = React.useState("");
  const [shippingAddress, setShippingAddress] = React.useState("");

  // Check if orderId exists in query params
  const orderIdParam = searchParams.get("orderId");

  React.useEffect(() => {
    const customerId = readCustomerId();
    if (!customerId) {
      setLoading(false);
      setError("Vui lòng đăng nhập để thanh toán.");
      return;
    }

    // Case 1: Continue payment with orderId
    if (orderIdParam) {
      const orderId = Number(orderIdParam);
      if (!Number.isFinite(orderId) || orderId <= 0) {
        setLoading(false);
        setError("Mã đơn hàng không hợp lệ.");
        return;
      }

      // Fetch order and QR info from orderId
      (async () => {
        setLoading(true);
        setError(null);
        try {
          // Fetch order details
          const orderData = await orderService.getById(orderId);

          // Verify ownership
          if (orderData.customerId != null && Number(orderData.customerId) !== customerId) {
            setError("Bạn không có quyền truy cập đơn hàng này.");
            setLoading(false);
            return;
          }

          // Check if payment method is Bank Transfer
          if (orderData.paymentMethod !== "BANK_TRANSFER") {
            setError("Đơn hàng này không sử dụng phương thức chuyển khoản ngân hàng.");
            setLoading(false);
            return;
          }

          // Check if order is already paid
          if (orderData.paymentStatus === "PAID") {
            setError("Đơn hàng này đã được thanh toán.");
            setLoading(false);
            return;
          }

          // Check if order is cancelled
          if (orderData.orderStatus === "CANCELLED") {
            setError("Không thể thanh toán cho đơn hàng đã bị hủy.");
            setLoading(false);
            return;
          }

          // Fetch QR info
          const qr = await bankTransferService.getQRInfo(orderId);

          // Set state to render QR page
          setCreatedOrder(orderData);
          setQrInfo(qr);
          setSuccess("BANK_TRANSFER");
          setLoading(false);
        } catch (e: any) {
          console.error("Error loading payment data:", e);
          setError(e?.message || "Không thể tải thông tin thanh toán. Vui lòng thử lại.");
          setLoading(false);
        }
      })();

      return; // Stop here, don't continue with checkout flow
    }

    // Case 2: Normal checkout flow (no orderId)
    const checkoutDraft = readCheckoutDraft();
    if (!checkoutDraft || !checkoutDraft.items || checkoutDraft.items.length === 0) {
      setLoading(false);
      setError("Không có dữ liệu thanh toán. Vui lòng chọn sản phẩm và thử lại.");
      return;
    }

    setDraft(checkoutDraft);
    setLoading(false);
    setError(null);

    (async () => {
      try {
        const profile = await customerAccountService.getById(customerId);
        if (profile) {
          setReceiverName((prev) => prev || profile.fullName || "");
          setReceiverPhone((prev) => prev || profile.phone || "");
          setShippingAddress((prev) => prev || profile.address || "");
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      }
    })();
  }, [orderIdParam]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const ids = Array.from(
        new Set((draft?.items || []).map((it) => Number(it.productId)).filter((x) => Number.isFinite(x) && x > 0))
      );
      if (ids.length === 0) {
        if (mounted) setProductMap({});
        return;
      }

      const pairs = await Promise.all(
        ids.map(async (id) => {
          try {
            const p = await productService.getById(id);
            return [id, p] as const;
          } catch {
            return null;
          }
        })
      );

      if (!mounted) return;
      const next: Record<number, ProductDto> = {};
      for (const pair of pairs) {
        if (!pair) continue;
        next[pair[0]] = pair[1];
      }
      setProductMap(next);
    })();
    return () => {
      mounted = false;
    };
  }, [draft?.items]);

  const total = React.useMemo(() => {
    if (!draft?.items) return 0;
    return draft.items.reduce((sum, it) => sum + toNumberSafe(it.price) * toNumberSafe(it.quantity), 0);
  }, [draft]);

  const totalOriginalPrice = React.useMemo(() => {
    if (!draft?.items) return 0;
    return draft.items.reduce((sum, it) => {
      const originalPrice = getDraftItemOriginalPrice(it, productMap[Number(it.productId)]);
      const currentPrice = toNumberSafe(it.price);
      const quantity = toNumberSafe(it.quantity);
      // Use original price if available, otherwise use current price
      const price = originalPrice && originalPrice > 0 ? originalPrice : currentPrice;
      return sum + price * quantity;
    }, 0);
  }, [draft, productMap]);

  const totalDiscount = React.useMemo(() => {
    if (!draft?.items) return 0;
    return draft.items.reduce((sum, it) => {
      const originalPrice = getDraftItemOriginalPrice(it, productMap[Number(it.productId)]);
      if (!originalPrice) return sum;
      const currentPrice = toNumberSafe(it.price);
      const quantity = toNumberSafe(it.quantity);
      const discount = (originalPrice - currentPrice) * quantity;
      return sum + (discount > 0 ? discount : 0);
    }, 0);
  }, [draft, productMap]);

  async function removeCheckedOutItemsFromCart(checkoutDraft: CheckoutDraft) {
    if (checkoutDraft.source !== "cart") return;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const userRaw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    const isLoggedIn = Boolean(token && userRaw);

    if (isLoggedIn) {
      const items = checkoutDraft.items || [];
      for (const it of items) {
        try {
          await cartService.removeItem({
            productId: Number(it.productId),
            productColorId: it.productColorId ?? null,
            productVariantId: it.productVariantId ?? null,
          });
        } catch {}
      }
      try {
        const dto = await cartService.getMyCart();
        emitCartUpdated(dto.totalQuantity);
      } catch {}
      return;
    }

    const removeKeySet = new Set((checkoutDraft.items || []).map((it) => String(it.cartItemKey || "")));
    if (removeKeySet.size === 0) return;
    try {
      const raw = localStorage.getItem(getActiveCartStorageKey());
      const parsed = raw ? (JSON.parse(raw) as unknown[]) : [];
      const safe = Array.isArray(parsed) ? parsed : [];
      const toKey = (it: Record<string, unknown>) =>
        `${it.productId}-${it.productColorId ?? "null"}-${it.productVariantId ?? "null"}-${it.ramGb ?? "null"}-${it.storageGb ?? "null"}`;
      const next = safe.filter((it) => !removeKeySet.has(toKey(it as Record<string, unknown>)));
      localStorage.setItem(getActiveCartStorageKey(), JSON.stringify(next));
      const totalQuantity = next.reduce<number>(
        (sum, it) => sum + Math.max(0, Number((it as Record<string, unknown>).quantity) || 0),
        0
      );
      emitCartUpdated(totalQuantity);
    } catch {}
  }

  async function createOrderFromDraft(customerId: number, checkoutDraft: CheckoutDraft, paymentMethod: string) {
    if (!receiverName || !receiverPhone || !shippingAddress) {
      throw new Error("Vui lòng nhập đầy đủ thông tin giao hàng.");
    }

    // Validate: variantId is required by backend
    const invalidItems = checkoutDraft.items.filter(it => !it.productVariantId);
    if (invalidItems.length > 0) {
      throw new Error("Một số sản phẩm thiếu thông tin variant. Vui lòng thêm lại vào giỏ hàng.");
    }

    const created = await orderService.create({
      customerId,
      receiverName,
      receiverPhone,
      shippingAddress,
      items: checkoutDraft.items.map((it) => ({
        productId: it.productId,
        variantId: it.productVariantId!, // Backend yêu cầu @NotNull
        colorName: it.productColor ?? undefined,
        quantity: Number(it.quantity || 1),
        imageUrl: it.imageUrl ?? undefined,
      })),
      paymentMethod,
    });
    return created;
  }

  async function payCod() {
    const customerId = readCustomerId();
    if (!customerId || !draft) return;
    setPaying("COD");
    setError(null);
    try {
      const created = await createOrderFromDraft(customerId, draft, "COD");
      await orderService.payCod(created.orderId, customerId);
      setCreatedOrder(created);
      await removeCheckedOutItemsFromCart(draft);
      clearCheckoutDraft();
      setSuccess("COD");
      // Cuộn lên đầu trang sau khi thanh toán thành công
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : "Không thể thanh toán COD.";
      // Improve stock error message
      if (errorMsg.includes("Insufficient stock")) {
        setError("Sản phẩm đã hết hàng hoặc không đủ số lượng. Vui lòng kiểm tra lại giỏ hàng.");
      } else {
        setError(errorMsg);
      }
    } finally {
      setPaying(null);
    }
  }

  const [qrInfo, setQrInfo] = React.useState<{
    orderCode: string;
    amount: number;
    qrUrl: string;
    accountName: string;
    accountNumber: string;
    bankBin: string;
  } | null>(null);

  async function payBankTransfer() {
    const customerId = readCustomerId();
    if (!customerId || !draft) return;
    setPaying("BANK_TRANSFER");
    setError(null);
    try {
      const created = await createOrderFromDraft(customerId, draft, "BANK_TRANSFER");
      const qr = await bankTransferService.getQRInfo(created.orderId);

      setCreatedOrder(created);
      setQrInfo(qr);

      await removeCheckedOutItemsFromCart(draft);
      clearCheckoutDraft();
      setSuccess("BANK_TRANSFER");
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : "Không thể khởi tạo thanh toán.";
      // Improve stock error message
      if (errorMsg.includes("Insufficient stock")) {
        setError("Sản phẩm đã hết hàng hoặc không đủ số lượng. Vui lòng kiểm tra lại giỏ hàng.");
      } else {
        setError(errorMsg);
      }
    } finally {
      setPaying(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  if (success === "BANK_TRANSFER" && createdOrder && qrInfo) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 px-1 py-4 sm:space-y-6 sm:px-0 sm:py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm sm:rounded-3xl sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 sm:h-16 sm:w-16">
            <CheckCircle2 className="h-7 w-7 sm:h-8 sm:w-8" />
          </div>
          <h1 className="mt-4 text-lg font-black text-slate-900 sm:text-2xl dark:text-white">
            Đơn hàng #{createdOrder.orderCode} đã được tạo!
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Vui lòng chuyển khoản và tải ảnh hóa đơn để chúng tôi xác nhận đơn hàng của bạn.
          </p>
        </div>

        <BankTransferQr
          orderId={createdOrder.orderId}
          orderCode={qrInfo.orderCode}
          amount={qrInfo.amount}
          qrUrl={qrInfo.qrUrl}
          accountName={qrInfo.accountName}
          accountNumber={qrInfo.accountNumber}
          bankBin={qrInfo.bankBin}
          orderStatus={createdOrder.orderStatus || undefined}
          paymentStatus={createdOrder.paymentStatus || undefined}
          paymentMethod={createdOrder.paymentMethod || undefined}
          onSuccess={() => {
            showStatus(
              "Đã gửi xác nhận",
              "Admin sẽ kiểm tra và duyệt đơn hàng của bạn sớm nhất.",
              "success"
            );
            router.push(`/order/${createdOrder.orderId}`);
          }}
        />

        <div className="text-center">
          <Link
            href={`/order/${createdOrder.orderId}`}
            className="text-sm font-bold text-purple-600 hover:underline"
          >
            Theo dõi trạng thái đơn hàng tại đây
          </Link>
        </div>
      </div>
    );
  }

  if (success === "COD") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl"
        >
          <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-2xl shadow-emerald-500/10 sm:rounded-[3rem] sm:p-12 dark:border-emerald-500/20 dark:bg-slate-900/50">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 sm:h-24 sm:w-24">
              <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12" />
            </div>
            <h1 className="mt-6 text-2xl font-black text-slate-900 sm:mt-8 sm:text-3xl dark:text-white">
              Đặt hàng thành công!
            </h1>
            <p className="mt-3 text-base font-medium text-slate-500 sm:text-lg dark:text-slate-400">
              Cảm ơn bạn đã tin tưởng. Đơn hàng của bạn đang được xử lý và sẽ sớm được giao tới địa chỉ của bạn.
            </p>

            <div className="mt-6 rounded-2xl bg-slate-50 p-4 sm:mt-8 sm:p-6 dark:bg-slate-800">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400">Mã đơn hàng</div>
              <div className="mt-1 break-all text-xl font-black text-purple-600 sm:text-2xl">
                #{String(createdOrder?.orderCode || createdOrder?.orderId)}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-center text-sm font-bold text-slate-600 dark:text-slate-300">
                <Truck className="h-4 w-4 shrink-0" />
                <span>Phương thức:</span>
                <span className="text-emerald-600">Thanh toán khi nhận hàng (COD)</span>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:gap-4">
              <Link
                href="/order"
                className="flex-1 rounded-2xl bg-slate-900 px-6 py-3.5 text-center text-sm font-black text-white transition hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-900"
              >
                Xem đơn hàng
              </Link>
              <Link
                href="/product"
                className="flex-1 rounded-2xl bg-purple-600 px-6 py-3.5 text-center text-sm font-black text-white shadow-xl shadow-purple-500/20 transition hover:bg-purple-700 active:scale-95"
              >
                Tiếp tục mua sắm
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 overflow-x-hidden py-1 animate-page sm:space-y-8 sm:py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/cart"
          className="group flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-purple-600"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 transition-all group-hover:bg-purple-600 group-hover:text-white group-hover:ring-purple-600 dark:bg-slate-900 dark:ring-slate-700">
            <ChevronLeft className="h-4 w-4" />
          </div>
          <span className="truncate">Quay lại giỏ hàng</span>
        </Link>
        <div className="flex w-fit items-center gap-2 rounded-full bg-purple-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-purple-600 dark:bg-purple-500/10">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          Thanh toán an toàn
        </div>
      </div>

      {/* Mobile order summary — shown first on small screens */}
      <div className="rounded-2xl customer-card-surface border border-zinc-500/70 bg-zinc-800/55 p-4 ring-1 ring-zinc-500/35 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Tổng thanh toán</span>
          <span className="text-xl font-black text-purple-400">{formatVnd(total)}</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">{(draft?.items || []).length} sản phẩm · Miễn phí vận chuyển</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 lg:gap-10">
        <div className="min-w-0 space-y-6 lg:col-span-2 lg:space-y-8">
          <div className="rounded-2xl customer-card-surface border border-zinc-500/70 bg-zinc-800/55 p-4 ring-1 ring-zinc-500/35 shadow-lg shadow-black/15 sm:rounded-[2.5rem] sm:p-6 lg:p-8">
            <h3 className="mb-4 flex items-center gap-2 text-base font-black text-white sm:mb-6 sm:text-lg">
              <Truck className="h-5 w-5 shrink-0 text-purple-400" />
              Thông tin nhận hàng
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
              <div className="space-y-2 sm:col-span-1">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Họ tên người nhận</label>
                <input
                  type="text"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full rounded-xl border-slate-600/50 bg-slate-900/50 px-4 py-3 text-sm font-medium text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 sm:rounded-2xl sm:px-5 sm:py-4"
                />
              </div>
              <div className="space-y-2 sm:col-span-1">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Số điện thoại</label>
                <input
                  type="tel"
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                  placeholder="0987654321"
                  className="w-full rounded-xl border-slate-600/50 bg-slate-900/50 px-4 py-3 text-sm font-medium text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 sm:rounded-2xl sm:px-5 sm:py-4"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Địa chỉ giao hàng</label>
                <textarea
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Số 1, Đường ABC, Quận XYZ, TP. HCM"
                  rows={3}
                  className="w-full resize-none rounded-xl border-slate-600/50 bg-slate-900/50 px-4 py-3 text-sm font-medium text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 sm:rounded-2xl sm:px-5 sm:py-4"
                />
              </div>
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
              Phương thức thanh toán
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-400 sm:mt-2 sm:text-base lg:text-lg">
              Vui lòng chọn hình thức thanh toán phù hợp nhất với bạn.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200/30 bg-rose-500/10 p-4 text-sm font-bold text-rose-300">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <span className="min-w-0 break-words">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
            <button
              type="button"
              onClick={payBankTransfer}
              disabled={paying != null}
              className={`group relative flex w-full flex-col items-start rounded-2xl border-2 p-5 text-left transition-all sm:rounded-[2.5rem] sm:p-6 ${
                paying === "BANK_TRANSFER"
                  ? "border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/20"
                  : "border-zinc-600/50 bg-zinc-800/40 hover:border-purple-400/50"
              }`}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg sm:mb-6 sm:h-14 sm:w-14 sm:rounded-2xl">
                <Wallet className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <h3 className="text-lg font-black text-white sm:text-xl">Chuyển khoản ngân hàng</h3>
              <p className="mt-1 text-xs font-medium text-slate-400 sm:mt-2 sm:text-sm">
                Thanh toán VietQR thủ công, hệ thống sẽ đối soát và xác nhận.
              </p>
              <div className="mt-5 flex w-full items-center justify-between sm:mt-8">
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Khuyên dùng</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300">
                  {paying === "BANK_TRANSFER" ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-transparent" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={payCod}
              disabled={paying != null}
              className={`group relative flex w-full flex-col items-start rounded-2xl border-2 p-5 text-left transition-all sm:rounded-[2.5rem] sm:p-6 ${
                paying === "COD"
                  ? "border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/20"
                  : "border-zinc-600/50 bg-zinc-800/40 hover:border-purple-400/50"
              }`}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg sm:mb-6 sm:h-14 sm:w-14 sm:rounded-2xl">
                <Package className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <h3 className="text-lg font-black text-white sm:text-xl">Khi nhận hàng</h3>
              <p className="mt-1 text-xs font-medium text-slate-400 sm:mt-2 sm:text-sm">
                Thanh toán bằng tiền mặt khi nhân viên giao hàng (COD).
              </p>
              <div className="mt-5 flex w-full items-center justify-between sm:mt-8">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tiền mặt</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700/50 text-slate-300">
                  {paying === "COD" ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                </div>
              </div>
            </button>
          </div>

          <div className="rounded-2xl customer-card-surface border border-zinc-500/70 bg-zinc-800/55 p-4 ring-1 ring-zinc-500/35 sm:rounded-[2.5rem] sm:p-6 lg:p-8">
            <h3 className="mb-4 flex items-center gap-2 text-base font-black text-white sm:mb-6 sm:text-lg">
              <ShoppingBag className="h-5 w-5 shrink-0 text-purple-400" />
              Sản phẩm thanh toán
            </h3>
            <div className="divide-y divide-zinc-700/50">
              {(draft?.items || []).map((it, idx) => {
                const lineTotal = toNumberSafe(it.price) * toNumberSafe(it.quantity);
                const original = getDraftItemOriginalPrice(it, productMap[Number(it.productId)]);
                return (
                  <div key={idx} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl border border-zinc-600/50 bg-zinc-900/50 sm:aspect-[9/16] sm:h-auto sm:w-16">
                        <img
                          src={resolveImageUrl(it.imageUrl || productMap[Number(it.productId)]?.productMainImage)}
                          className="h-full w-full object-contain"
                          alt=""
                        />
                      </div>
                      <div className="min-w-0 flex-1 sm:hidden">
                        <h4 className="line-clamp-2 text-sm font-black text-white">{it.productName}</h4>
                        <p className="mt-1 text-sm font-black text-purple-400">{formatVnd(lineTotal)}</p>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 hidden sm:block">
                      <h4 className="truncate text-sm font-black text-white">{it.productName}</h4>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded-lg bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                          {it.productColor || "N/A"}
                        </span>
                        {it.ramGb != null && (
                          <span className="rounded-lg bg-zinc-700/50 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                            RAM {it.ramGb}GB
                          </span>
                        )}
                        {it.storageGb != null && (
                          <span className="rounded-lg bg-zinc-700/50 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                            {it.storageGb}GB
                          </span>
                        )}
                        <span className="rounded-lg bg-zinc-700/50 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                          x{it.quantity}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 sm:hidden">
                      <span className="rounded-lg bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                        {it.productColor || "N/A"}
                      </span>
                      {it.ramGb != null && (
                        <span className="rounded-lg bg-zinc-700/50 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                          RAM {it.ramGb}GB
                        </span>
                      )}
                      {it.storageGb != null && (
                        <span className="rounded-lg bg-zinc-700/50 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                          {it.storageGb}GB
                        </span>
                      )}
                      <span className="rounded-lg bg-zinc-700/50 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                        SL: {it.quantity}
                      </span>
                    </div>
                    <div className="hidden shrink-0 text-right sm:block">
                      <div className="text-sm font-black text-purple-400">{formatVnd(lineTotal)}</div>
                      <div className="text-[10px] font-bold text-slate-500">{formatVnd(toNumberSafe(it.price))} / SP</div>
                      {original != null && original > toNumberSafe(it.price) && (
                        <div className="text-[10px] text-slate-600 line-through">{formatVnd(original)}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="hidden lg:col-span-1 lg:block">
          <div className="sticky top-24 space-y-6">
            <div className="overflow-hidden rounded-[2.5rem] customer-card-surface border border-zinc-500/70 bg-zinc-800/55 shadow-2xl shadow-black/20 ring-1 ring-zinc-500/35">
              <div className="bg-gradient-to-r from-indigo-700 to-purple-700 p-6 text-center text-white">
                <h3 className="text-lg font-black tracking-tight">Chi tiết đơn hàng</h3>
              </div>
              <div className="space-y-6 p-6 lg:p-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-400">Giá gốc</span>
                    <span className="font-bold text-white">{formatVnd(totalOriginalPrice)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-400">Phí vận chuyển</span>
                    <span className="font-bold text-emerald-400">Miễn phí</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-400">Giảm giá</span>
                    <span className="font-bold text-rose-400">- {formatVnd(totalDiscount)}</span>
                  </div>
                </div>
                <div className="h-px bg-zinc-700/50" />
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-400">Tổng cộng</div>
                  <div className="text-2xl font-black text-purple-400 lg:text-3xl">{formatVnd(total)}</div>
                </div>
                <div className="rounded-2xl bg-indigo-500/10 p-4">
                  <div className="flex gap-3 text-[10px] leading-relaxed text-indigo-200">
                    <Info className="h-4 w-4 shrink-0" />
                    <p className="font-bold">
                      Bằng việc bấm thanh toán, bạn đồng ý với các điều khoản và chính sách mua hàng của chúng tôi.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
