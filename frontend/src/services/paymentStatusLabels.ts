/**
 * Utility to translate status codes to Vietnamese labels
 */

export const translatePaymentStatus = (status?: string | null): string => {
  if (!status) return "N/A";
  
  const statusMap: Record<string, string> = {
    // Payment Status
    "UNPAID": "Chưa thanh toán",
    "PENDING": "Chờ xử lý thanh toán",
    "WAITING_CONFIRM": "Chờ xác nhận thanh toán",
    "PAID": "Đã thanh toán",
    "FAILED": "Thất bại",
    
    // Order Status
    "PENDING_CONFIRM": "Chờ xác nhận đơn",
    "PENDING_PAYMENT_CONFIRMATION": "Chờ xác nhận thanh toán",
    "CONFIRMED": "Đã xác nhận",
    "SHIPPING": "Đang giao hàng",
    "PENDING_PICKUP": "Chờ lấy hàng",
    "DELIVERED": "Đã giao hàng",
    "CANCELLED": "Đã hủy",

    // Bank reconcile status
    "AUTO_MATCHED": "Khớp tự động",
    "MANUAL_MATCHED": "Khớp thủ công",

    // Other
    "BANK_TRANSFER": "Chuyển khoản ngân hàng",
    "COD": "Thanh toán khi nhận hàng",
  };

  return statusMap[status] || status;
};

/** Nhãn tiếng Việt đầy đủ cho cột Trạng thái xử lý (minh chứng VietQR). */
export const translatePaymentAttemptStatus = (status?: string | null): string => {
  if (!status) return "Không xác định";

  const attemptMap: Record<string, string> = {
    PENDING: "Chờ khách gửi minh chứng",
    WAITING_CONFIRM: "Chờ xác nhận thanh toán",
    PROCESSING: "Đang được xử lý",
    MATCHED: "Đã duyệt khớp lệnh",
    SUCCESS: "Thanh toán thành công",
    REJECTED: "Đã từ chối thanh toán",
  };

  return attemptMap[status] || translatePaymentStatus(status);
};
