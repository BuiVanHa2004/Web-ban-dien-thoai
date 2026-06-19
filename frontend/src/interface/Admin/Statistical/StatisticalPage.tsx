"use client";

import React from "react";
import { useRouter } from "next/navigation";
import ExcelJS from "exceljs";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCcw,
  FileDown,
  History,
  FileText,
  ChevronDown,
  Calendar,
} from "lucide-react";
import { RoundedDatePicker } from "@/components/admin/RoundedDatePicker";
import {
  statisticalService,
  type SummaryStatisticalDto,
  type MonthlyRevenueDto,
  type OrderStatusCountDto,
  type TopProductSoldDto,
} from "@/services/statisticalService";
import { brandService, type BrandDto } from "@/services/brandService";
import { categoryService, type CategoryDto } from "@/services/categoryService";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];
(pdfMake as any).vfs = (pdfFonts as any).vfs;
(pdfMake as any).fonts = {
  Arial: {
    normal: "Roboto-Regular.ttf",
    bold: "Roboto-Medium.ttf",
    italics: "Roboto-Italic.ttf",
    bolditalics: "Roboto-MediumItalic.ttf",
  },
};

const STATUS_MAP: Record<string, string> = {
  PENDING_CONFIRM: "Chờ xác nhận",
  PENDING_PAYMENT_CONFIRMATION: "Chờ xác nhận thanh toán",
  CONFIRMED: "Đã xác nhận",
  SHIPPING: "Đang giao hàng",
  PENDING_PICKUP: "Chờ lấy hàng",
  PENDING_SHIPPING: "Chờ giao hàng",
  DELIVERED: "Đã giao hàng",
  CANCELLED: "Đã hủy",
};

export default function StatisticalPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [summary, setSummary] = React.useState<SummaryStatisticalDto | null>(null);
  const [monthlyRevenue, setMonthlyRevenue] = React.useState<MonthlyRevenueDto[]>([]);
  const [statusDist, setStatusDist] = React.useState<OrderStatusCountDto[]>([]);
  const [topProducts, setTopProducts] = React.useState<TopProductSoldDto[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [isClient, setIsClient] = React.useState(false);
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [brands, setBrands] = React.useState<BrandDto[]>([]);
  const [categories, setCategories] = React.useState<CategoryDto[]>([]);
  const [selectedBrandId, setSelectedBrandId] = React.useState<string>("all");
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>("all");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = React.useState<string>("all");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [openDropdown, setOpenDropdown] = React.useState<null | "brand" | "category" | "payment">(null);
  const dropdownContainerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setIsClient(true);
    const userRaw = localStorage.getItem("user");
    if (userRaw) {
      try {
        const user = JSON.parse(userRaw);
        setUserRole(user.role?.toUpperCase() || null);
      } catch {
        // ignore
      }
    }
  }, []);



  const currentFilter = React.useMemo(() => {
    const brandId = selectedBrandId === "all" ? undefined : Number(selectedBrandId);
    const categoryId = selectedCategoryId === "all" ? undefined : Number(selectedCategoryId);
    const paymentMethod = selectedPaymentMethod === "all" ? undefined : selectedPaymentMethod;
    
    // Only include dates if both are selected
    const hasValidDates = startDate && endDate;
    
    return { 
      brandId, 
      categoryId, 
      paymentMethod,
      startDate: hasValidDates ? startDate : undefined,
      endDate: hasValidDates ? endDate : undefined,
    };
  }, [selectedBrandId, selectedCategoryId, selectedPaymentMethod, startDate, endDate]);

  const selectedBrandLabel = React.useMemo(() => {
    if (selectedBrandId === "all") return "Tất cả thương hiệu";
    return brands.find((b) => String(b.brandId) === selectedBrandId)?.brandName || "Không xác định";
  }, [brands, selectedBrandId]);

  const selectedCategoryLabel = React.useMemo(() => {
    if (selectedCategoryId === "all") return "Tất cả danh mục";
    return categories.find((c) => String(c.categoryId) === selectedCategoryId)?.categoryName || "Không xác định";
  }, [categories, selectedCategoryId]);

  const selectedPaymentMethodLabel = React.useMemo(() => {
    if (selectedPaymentMethod === "all") return "Tất cả PT thanh toán";
    return selectedPaymentMethod === "COD" ? "Thanh toán COD" : "Chuyển khoản (Ngân hàng)";
  }, [selectedPaymentMethod]);
  const hasMonthlyData = monthlyRevenue.some((item) => Number(item.orderCount) > 0 || Number(item.revenue) > 0);
  const hasStatusData = statusDist.some((item) => Number(item.count) > 0);
  const hasTopProductsData = topProducts.some((item) => Number(item.quantitySold) > 0);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumData, monthlyData, statusData, topData] = await Promise.all([
        statisticalService.getSummary(currentFilter),
        statisticalService.getMonthlyRevenue(6, currentFilter),
        statisticalService.getStatusDistribution(currentFilter),
        statisticalService.getTopProductsSold(50, currentFilter),
      ]);
      setSummary(sumData);
      setMonthlyRevenue(monthlyData);
      setStatusDist(statusData);
      setTopProducts(topData);
    } catch (err: any) {
      console.error(err);
      setError("Không thể tải dữ liệu thống kê. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  }, [currentFilter]);

  React.useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [brandData, categoryData] = await Promise.all([
          brandService.getAll(),
          categoryService.getAll(),
        ]);
        setBrands(brandData || []);
        setCategories(categoryData || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchFilterOptions();
  }, []);

  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!dropdownContainerRef.current) return;
      if (!dropdownContainerRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  React.useEffect(() => {
    // Only fetch if:
    // 1. No dates selected (both empty) OR
    // 2. Both dates selected (both filled)
    const shouldFetch = (!startDate && !endDate) || (startDate && endDate);
    
    if (shouldFetch) {
      fetchData();
    }
  }, [fetchData, startDate, endDate]);

  const formatVnd = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  const formatCompactNumber = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 }).format(val);
  };

  const handleExportExcel = async () => {
    if (!summary) return;

    const PAYMENT_STATUS_LABELS: Record<string, string> = {
      PAID: "Đã thanh toán",
      UNPAID: "Chưa thanh toán",
      WAITING_CONFIRM: "Chờ xác nhận",
      PENDING: "Đang xử lý",
      REFUNDED: "Đã hoàn tiền",
      FAILED: "Thất bại",
      CANCELLED: "Đã hủy",
      UNKNOWN: "Không xác định"
    };

    // 1. Prepare Filter Data
    const filterData = [
      { "Bộ lọc": "Thương hiệu", "Giá trị": selectedBrandLabel },
      { "Bộ lọc": "Danh mục", "Giá trị": selectedCategoryLabel },
      { "Bộ lọc": "Phương thức thanh toán", "Giá trị": selectedPaymentMethodLabel },
      ...(startDate || endDate ? [{ 
        "Bộ lọc": "Thời gian", 
        "Giá trị": `${startDate ? `Từ ngày ${new Date(startDate).toLocaleDateString('vi-VN')}` : ''}${startDate && endDate ? ' - ' : ''}${endDate ? `Đến ngày ${new Date(endDate).toLocaleDateString('vi-VN')}` : ''}`
      }] : []),
      { "Bộ lọc": "Thời gian xuất", "Giá trị": new Date().toLocaleString("vi-VN") },
    ];

    // 2. Prepare Summary Data
    const summaryData = [
      { "Chỉ số": "Tổng doanh thu", "Giá trị": summary.totalRevenue },
      { "Chỉ số": "Tổng đơn hàng", "Giá trị": summary.totalOrders },
      { "Chỉ số": "Tổng khách hàng", "Giá trị": summary.totalCustomers },
      { "Chỉ số": "Tổng sản phẩm", "Giá trị": summary.totalProducts },
    ];

    // 3. Order Status Distribution
    const orderStatusData = statusDist.map(s => ({
      "Trạng thái đơn hàng": STATUS_MAP[s.status] || s.status,
      "Số lượng đơn": s.count
    }));

    // 4. Payment Status Distribution
    const paymentStatusData = Object.entries(summary.paymentStatusDistribution || {}).map(([key, val]) => ({
      "Trạng thái thanh toán": PAYMENT_STATUS_LABELS[key] || key,
      "Số lượng đơn": val
    }));

    // 5. Payment Method Distribution
    const paymentMethodData = Object.entries(summary.paymentMethodDistribution || {}).map(([key, val]) => ({
      "Phương thức thanh toán": key === "COD" ? "Thanh toán khi nhận hàng (COD)" : (key === "BANK_TRANSFER" ? "Chuyển khoản ngân hàng" : key),
      "Số lượng đơn": val
    }));

    // 6. All Products Sold Data
    const productsData = topProducts.map((p, idx) => ({
      "Hạng": idx + 1,
      "Mã SP": p.productId,
      "Tên sản phẩm": p.productName,
      "Số lượng đã bán": p.quantitySold,
    }));

    // 7. Monthly Revenue Data
    const monthlyData = monthlyRevenue.map(m => ({
      "Tháng": m.month,
      "Doanh thu": m.revenue,
      "Số đơn hàng": m.orderCount,
    }));

    const workbook = new ExcelJS.Workbook();
    const generatedAt = new Date().toLocaleString("vi-VN");

    const addStyledSheet = (
      sheetName: string,
      title: string,
      headers: string[],
      rows: Array<Array<string | number>>,
      headerColor: string
    ) => {
      const ws = workbook.addWorksheet(sheetName);
      ws.addRow(["BÁO CÁO THỐNG KÊ"]);
      ws.addRow([title]);
      ws.addRow([`Thời gian xuất: ${generatedAt}`]);
      ws.addRow([]);
      ws.addRow(headers);
      rows.forEach((row) => ws.addRow(row));

      const lastCol = headers.length;
      ws.mergeCells(1, 1, 1, lastCol);
      ws.mergeCells(2, 1, 2, lastCol);
      ws.mergeCells(3, 1, 3, lastCol);

      const titleCell = ws.getCell(1, 1);
      titleCell.font = { name: "Arial", bold: true, size: 15, color: { argb: "FF1D4ED8" } };
      titleCell.alignment = { horizontal: "center" };

      const subTitleCell = ws.getCell(2, 1);
      subTitleCell.font = { name: "Arial", bold: true, size: 12, color: { argb: "FF0F172A" } };
      subTitleCell.alignment = { horizontal: "center" };

      ws.getCell(3, 1).font = { name: "Arial", size: 10, color: { argb: "FF475569" } };

      const headerRow = ws.getRow(5);
      headerRow.eachCell((cell) => {
        cell.font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: headerColor } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });

      for (let r = 6; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        row.eachCell((cell, c) => {
          cell.font = { name: "Arial", size: 10, color: { argb: "FF0F172A" } };
          cell.alignment = { vertical: "middle", horizontal: c === 1 ? "left" : "right" };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };
        });
        if (r % 2 === 0) {
          row.eachCell((cell) => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
          });
        }
      }

      headers.forEach((h, idx) => {
        const maxLen = Math.max(
          h.length,
          ...rows.map((row) => String(row[idx] ?? "").length)
        );
        ws.getColumn(idx + 1).width = Math.min(45, Math.max(14, maxLen + 3));
      });
    };

    addStyledSheet("Bộ lọc", "Bộ lọc đang áp dụng", ["Bộ lọc", "Giá trị"], filterData.map((r) => [r["Bộ lọc"], r["Giá trị"]]), "FF3B82F6");
    addStyledSheet("Tổng quan", "Tổng quan", ["Chỉ số", "Giá trị"], [
      ["Tổng doanh thu", formatVnd(Number(summary.totalRevenue) || 0)],
      ["Tổng đơn hàng", summary.totalOrders],
      ["Tổng khách hàng", summary.totalCustomers],
      ["Tổng sản phẩm", summary.totalProducts],
    ], "FF10B981");
    addStyledSheet("Doanh thu tháng", "Doanh thu theo tháng", ["Tháng", "Doanh thu", "Số đơn hàng"], monthlyData.map((r) => [r["Tháng"], formatVnd(Number(r["Doanh thu"]) || 0), r["Số đơn hàng"]]), "FF6366F1");
    addStyledSheet("Sản phẩm bán ra", "Sản phẩm bán ra", ["Hạng", "Mã SP", "Tên sản phẩm", "Số lượng đã bán"], productsData.map((r) => [r["Hạng"], r["Mã SP"], r["Tên sản phẩm"], r["Số lượng đã bán"]]), "FFF59E0B");
    addStyledSheet("TT đơn hàng", "Trạng thái đơn hàng", ["Trạng thái đơn hàng", "Số lượng đơn"], orderStatusData.map((r) => [r["Trạng thái đơn hàng"], r["Số lượng đơn"]]), "FFEF4444");
    addStyledSheet("TT thanh toán", "Trạng thái thanh toán", ["Trạng thái thanh toán", "Số lượng đơn"], paymentStatusData.map((r) => [r["Trạng thái thanh toán"], r["Số lượng đơn"]]), "FF8B5CF6");
    addStyledSheet("PT thanh toán", "Phương thức thanh toán", ["Phương thức thanh toán", "Số lượng đơn"], paymentMethodData.map((r) => [r["Phương thức thanh toán"], r["Số lượng đơn"]]), "FF06B6D4");

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BaoCao_ThongKe_${new Date().toISOString().split("T")[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    if (!summary) return;
    const generatedAt = new Date().toLocaleString("vi-VN");
    const content = [
      { text: "BÁO CÁO THỐNG KÊ", style: "title" },
      { text: `Thời gian xuất: ${generatedAt}`, style: "meta", margin: [0, 2, 0, 10] },

      { text: "Bộ lọc đang áp dụng", style: "sectionTitleBlue" },
      {
        layout: "blueTable",
        table: {
          headerRows: 1,
          widths: ["*", "*"],
          body: [
            ["Bộ lọc", "Giá trị"],
            ["Thương hiệu", selectedBrandLabel],
            ["Danh mục", selectedCategoryLabel],
            ["Phương thức", selectedPaymentMethodLabel],
            ...(startDate || endDate ? [[
              "Thời gian", 
              `${startDate ? `Từ ngày ${new Date(startDate).toLocaleDateString('vi-VN')}` : ''}${startDate && endDate ? ' - ' : ''}${endDate ? `Đến ngày ${new Date(endDate).toLocaleDateString('vi-VN')}` : ''}`
            ]] : []),
          ],
        },
      },

      { text: "Tổng quan", style: "sectionTitleGreen", margin: [0, 12, 0, 6] },
      {
        layout: "emeraldTable",
        table: {
          headerRows: 1,
          widths: ["*", "*"],
          body: [
            ["Chỉ số", "Giá trị"],
            ["Tổng doanh thu", formatVnd(summary.totalRevenue || 0)],
            ["Tổng đơn hàng", String(summary.totalOrders || 0)],
            ["Tổng khách hàng", String(summary.totalCustomers || 0)],
            ["Tổng sản phẩm", String(summary.totalProducts || 0)],
          ],
        },
      },

      { text: "Doanh thu theo tháng", style: "sectionTitleViolet", margin: [0, 12, 0, 6] },
      {
        layout: "violetTable",
        table: {
          headerRows: 1,
          widths: ["auto", "*", "auto"],
          body: [
            ["Tháng", "Doanh thu", "Số đơn"],
            ...monthlyRevenue.map((m) => [m.month, formatVnd(Number(m.revenue) || 0), String(m.orderCount)]),
          ],
        },
      },

      { text: "Sản phẩm bán ra", style: "sectionTitleAmber", margin: [0, 12, 0, 6] },
      {
        layout: "amberTable",
        table: {
          headerRows: 1,
          widths: ["auto", "*", "auto"],
          body: [
            ["Hạng", "Tên sản phẩm", "Số lượng đã bán"],
            ...topProducts.slice(0, 20).map((p, idx) => [String(idx + 1), p.productName, String(p.quantitySold)]),
          ],
        },
      },

      { text: "Trạng thái đơn hàng", style: "sectionTitleRose", margin: [0, 12, 0, 6] },
      {
        layout: "roseTable",
        table: {
          headerRows: 1,
          widths: ["*", "auto"],
          body: [
            ["Trạng thái đơn hàng", "Số lượng"],
            ...statusDist.map((s) => [STATUS_MAP[s.status] || s.status, String(s.count)]),
          ],
        },
      },

      { text: "Phương thức thanh toán", style: "sectionTitleCyan", margin: [0, 12, 0, 6] },
      {
        layout: "cyanTable",
        table: {
          headerRows: 1,
          widths: ["*", "auto"],
          body: [
            ["Phương thức thanh toán", "Số lượng"],
            ...Object.entries(summary.paymentMethodDistribution || {}).map(([key, val]) => [
              key === "COD" ? "Thanh toán khi nhận hàng (COD)" : (key === "BANK_TRANSFER" ? "Chuyển khoản ngân hàng" : key),
              String(val)
            ]),
          ],
        },
      },
    ];

    (pdfMake as any).createPdf({
      pageSize: "A4",
      pageMargins: [28, 28, 28, 28],
      content,
      defaultStyle: {
        font: "Arial",
        fontSize: 10,
      },
      styles: {
        title: { fontSize: 16, bold: true, color: "#1D4ED8" },
        meta: { fontSize: 9, color: "#475569" },
        sectionTitleBlue: { fontSize: 12, bold: true, color: "#1D4ED8" },
        sectionTitleGreen: { fontSize: 12, bold: true, color: "#059669" },
        sectionTitleViolet: { fontSize: 12, bold: true, color: "#7C3AED" },
        sectionTitleAmber: { fontSize: 12, bold: true, color: "#D97706" },
        sectionTitleRose: { fontSize: 12, bold: true, color: "#E11D48" },
        sectionTitleCyan: { fontSize: 12, bold: true, color: "#0891B2" },
        tableHeader: { color: "#FFFFFF", bold: true },
      },
    } as any, {
      blueTable: {
        hLineColor: () => "#DBEAFE",
        vLineColor: () => "#DBEAFE",
        fillColor: (rowIndex: number) => (rowIndex === 0 ? "#2563EB" : rowIndex % 2 === 0 ? "#EFF6FF" : null),
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: () => 6,
        paddingBottom: () => 6,
      },
      emeraldTable: {
        hLineColor: () => "#D1FAE5",
        vLineColor: () => "#D1FAE5",
        fillColor: (rowIndex: number) => (rowIndex === 0 ? "#059669" : rowIndex % 2 === 0 ? "#ECFDF5" : null),
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: () => 6,
        paddingBottom: () => 6,
      },
      violetTable: {
        hLineColor: () => "#EDE9FE",
        vLineColor: () => "#EDE9FE",
        fillColor: (rowIndex: number) => (rowIndex === 0 ? "#7C3AED" : rowIndex % 2 === 0 ? "#F5F3FF" : null),
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: () => 6,
        paddingBottom: () => 6,
      },
      amberTable: {
        hLineColor: () => "#FEF3C7",
        vLineColor: () => "#FEF3C7",
        fillColor: (rowIndex: number) => (rowIndex === 0 ? "#D97706" : rowIndex % 2 === 0 ? "#FFFBEB" : null),
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: () => 6,
        paddingBottom: () => 6,
      },
      roseTable: {
        hLineColor: () => "#FFE4E6",
        vLineColor: () => "#FFE4E6",
        fillColor: (rowIndex: number) => (rowIndex === 0 ? "#E11D48" : rowIndex % 2 === 0 ? "#FFF1F2" : null),
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: () => 6,
        paddingBottom: () => 6,
      },
      cyanTable: {
        hLineColor: () => "#CFFAFE",
        vLineColor: () => "#CFFAFE",
        fillColor: (rowIndex: number) => (rowIndex === 0 ? "#0891B2" : rowIndex % 2 === 0 ? "#ECFEFF" : null),
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: () => 6,
        paddingBottom: () => 6,
      },
      // fallback table style
      lightColor: {
        hLineColor: () => "#E2E8F0",
        vLineColor: () => "#E2E8F0",
        fillColor: (rowIndex: number) => (rowIndex === 0 ? "#DBEAFE" : rowIndex % 2 === 0 ? "#F8FAFC" : null),
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: () => 6,
        paddingBottom: () => 6,
      },
    } as any).download(`BaoCao_ThongKe_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  if (loading || !isClient) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Đang xử lý dữ liệu thống kê...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        .recharts-wrapper,
        .recharts-surface,
        .recharts-sector,
        .recharts-curve,
        .recharts-tooltip-wrapper {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
          -webkit-tap-highlight-color: transparent;
        }
        *:focus {
          outline: none !important;
        }
        svg {
          outline: none !important;
          border: none !important;
        }
      ` }} />
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="space-y-5"
      >
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-slate-800 ring-1 ring-slate-200/70 shadow-sm backdrop-blur-xl transition-all duration-500 ease-out dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
            <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_18px_rgba(34,211,238,0.55)]" />
            Thống kê
          </div>
          <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">
            Thống kê & Doanh thu
          </h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
            Tổng quan tình hình kinh doanh, doanh thu và các chỉ số quan trọng.
          </p>
        </div>

        <div ref={dropdownContainerRef} className="flex flex-col gap-3 md:items-end">
          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            {userRole === "ADMIN" && (
              <>
            {/* Removed Bank Reconciliation button as requested */}
              </>
            )}
            <button
              onClick={() => fetchData()}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:shadow cursor-pointer dark:bg-white/5 dark:text-slate-300 dark:ring-white/10 dark:hover:bg-white/10"
            >
              <RefreshCcw className="h-4 w-4" />
              Làm mới
            </button>
          </div>

          {userRole === "ADMIN" && (
            <div className="flex flex-wrap items-center gap-3 md:justify-end">
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-rose-600/20 transition-all hover:bg-rose-500 hover:shadow-lg cursor-pointer dark:bg-rose-500/20 dark:text-rose-200 dark:ring-rose-500/30 dark:hover:bg-rose-500/30"
                onClick={handleExportPdf}
              >
                <FileText className="h-4 w-4" />
                Xuất PDF
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-emerald-600/20 transition-all hover:bg-emerald-500 hover:shadow-lg cursor-pointer dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-500/30 dark:hover:bg-emerald-500/30"
                onClick={handleExportExcel}
              >
                <FileDown className="h-4 w-4" />
                Xuất Excel
              </button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown((v) => (v === "brand" ? null : "brand"))}
                className="flex h-11 min-w-[190px] cursor-pointer items-center justify-between gap-3 rounded-2xl bg-slate-100 px-3 text-left text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
              >
                <span className="truncate">{selectedBrandLabel}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-300" />
              </button>
              {openDropdown === "brand" ? (
                <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg animate-popover dark:border-white/10 dark:bg-slate-950">
                  <div className="max-h-56 overflow-auto p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBrandId("all");
                        setOpenDropdown(null);
                      }}
                      className="flex w-full cursor-pointer items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
                    >
                      Tất cả thương hiệu
                    </button>
                    {brands.map((brand) => (
                      <button
                        key={brand.brandId}
                        type="button"
                        onClick={() => {
                          setSelectedBrandId(String(brand.brandId));
                          setOpenDropdown(null);
                        }}
                        className={
                          "flex w-full cursor-pointer items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-white/10 " +
                          (selectedBrandId === String(brand.brandId)
                            ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100"
                            : "text-slate-700 dark:text-slate-200")
                        }
                      >
                        {brand.brandName}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown((v) => (v === "category" ? null : "category"))}
                className="flex h-11 min-w-[190px] cursor-pointer items-center justify-between gap-3 rounded-2xl bg-slate-100 px-3 text-left text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
              >
                <span className="truncate">{selectedCategoryLabel}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-300" />
              </button>
              {openDropdown === "category" ? (
                <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg animate-popover dark:border-white/10 dark:bg-slate-950">
                  <div className="max-h-56 overflow-auto p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategoryId("all");
                        setOpenDropdown(null);
                      }}
                      className="flex w-full cursor-pointer items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
                    >
                      Tất cả danh mục
                    </button>
                    {categories.map((category) => (
                      <button
                        key={category.categoryId}
                        type="button"
                        onClick={() => {
                          setSelectedCategoryId(String(category.categoryId));
                          setOpenDropdown(null);
                        }}
                        className={
                          "flex w-full cursor-pointer items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-white/10 " +
                          (selectedCategoryId === String(category.categoryId)
                            ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100"
                            : "text-slate-700 dark:text-slate-200")
                        }
                      >
                        {category.categoryName}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown((v) => (v === "payment" ? null : "payment"))}
                className="flex h-11 min-w-[190px] cursor-pointer items-center justify-between gap-3 rounded-2xl bg-slate-100 px-3 text-left text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
              >
                <span className="truncate">{selectedPaymentMethodLabel}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-300" />
              </button>
              {openDropdown === "payment" ? (
                <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg animate-popover dark:border-white/10 dark:bg-slate-950">
                  <div className="max-h-56 overflow-auto p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPaymentMethod("all");
                        setOpenDropdown(null);
                      }}
                      className={
                        "flex w-full cursor-pointer items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-white/10 " +
                        (selectedPaymentMethod === "all"
                          ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100"
                          : "text-slate-700 dark:text-slate-200")
                      }
                    >
                      Tất cả PT thanh toán
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPaymentMethod("COD");
                        setOpenDropdown(null);
                      }}
                      className={
                        "flex w-full cursor-pointer items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-white/10 " +
                        (selectedPaymentMethod === "COD"
                          ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100"
                          : "text-slate-700 dark:text-slate-200")
                      }
                    >
                      Thanh toán COD
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPaymentMethod("BANK_TRANSFER");
                        setOpenDropdown(null);
                      }}
                      className={
                        "flex w-full cursor-pointer items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-white/10 " +
                        (selectedPaymentMethod === "BANK_TRANSFER"
                          ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100"
                          : "text-slate-700 dark:text-slate-200")
                      }
                    >
                      Chuyển khoản (Ngân hàng)
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Date Range Picker */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <RoundedDatePicker
                value={startDate}
                max={endDate || undefined}
                onChange={(date) => {
                  if (!date) {
                    setStartDate("");
                    setEndDate("");
                    return;
                  }
                  setStartDate(date);
                  if (endDate && date > endDate) {
                    setEndDate("");
                  }
                }}
                placeholder="Từ ngày"
              />
              
              <span className="hidden sm:block text-slate-400 font-medium">đến</span>
              
              <RoundedDatePicker
                value={endDate}
                min={startDate || undefined}
                onChange={(date) => {
                  if (!date) {
                    setStartDate("");
                    setEndDate("");
                    return;
                  }
                  if (!startDate) {
                    return;
                  }
                  if (date >= startDate) {
                    setEndDate(date);
                  }
                }}
                disabled={!startDate}
                placeholder="Đến ngày"
              />
              
              {/* Action Buttons */}
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="h-11 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-bold text-slate-700 transition-colors dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200"
                >
                  Xóa tất cả
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Tổng doanh thu",
            value: formatVnd(summary?.totalRevenue || 0),
            icon: DollarSign,
            color: "text-emerald-600",
            bg: "bg-emerald-500/10",
            trend: "12.5%",
            trendUp: true,
          },
          {
            label: "Tổng đơn hàng",
            value: summary?.totalOrders || 0,
            icon: ShoppingCart,
            color: "text-blue-600",
            bg: "bg-blue-500/10",
            trend: "8.2%",
            trendUp: true,
          },
          {
            label: "Khách hàng",
            value: summary?.totalCustomers || 0,
            icon: Users,
            color: "text-purple-600",
            bg: "bg-purple-500/10",
            trend: "5.1%",
            trendUp: true,
          },
          {
            label: "Sản phẩm",
            value: summary?.totalProducts || 0,
            icon: Package,
            color: "text-orange-600",
            bg: "bg-orange-500/10",
            trend: "12%",
            trendUp: true,
          },
        ].map((item, i) => (
          <div
            key={i}
            className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer dark:border-white/10 dark:bg-slate-900/50 dark:hover:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <div className={`rounded-2xl ${item.bg} p-3 transition-transform duration-500 group-hover:scale-110`}>
                <item.icon className={`h-6 w-6 ${item.color}`} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold ${item.trendUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                {item.trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {item.trendUp ? "Tăng " : "Giảm "}{item.trend}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
              <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {item.value}
              </h3>
            </div>
            <div className="absolute -bottom-4 -right-4 h-24 w-24 bg-gradient-to-br from-transparent to-slate-100 opacity-50 transition-opacity group-hover:opacity-100 dark:to-white/5" />
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Main Revenue Chart */}
        <div className="lg:col-span-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/50">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Doanh thu 6 tháng gần nhất</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Dữ liệu doanh thu theo tháng</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Doanh thu</span>
              </div>
            </div>
          </div>
          <div className="h-80 w-full outline-none border-none">
            {hasMonthlyData ? (
              <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none', border: 'none' }}>
                <AreaChart data={monthlyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} style={{ outline: 'none', border: 'none' }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => formatCompactNumber(val)}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      borderRadius: "16px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      backdropFilter: "blur(8px)"
                    }}
                    formatter={(val: any) => [formatVnd(Number(val) || 0), "Doanh thu"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    animationDuration={1500}
                    className="cursor-pointer"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 dark:border-white/10 dark:bg-white/5">
                <div className="w-full max-w-xs rounded-2xl border border-slate-200/80 bg-white/80 p-5 text-center shadow-sm dark:border-white/10 dark:bg-slate-900/60">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-500/15 dark:text-emerald-300">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Chưa có dữ liệu doanh thu
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Chưa phát sinh doanh thu theo bộ lọc hiện tại.
                  </p>
                  <div className="mt-4 space-y-2">
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10" />
                    <div className="h-2 w-4/5 rounded-full bg-slate-100 dark:bg-white/10" />
                    <div className="h-2 w-2/3 rounded-full bg-slate-100 dark:bg-white/10" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order Status Pie Chart */}
        <div className="lg:col-span-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/50">
          <div className="mb-8">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tỷ lệ trạng thái đơn hàng</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Phân phối các đơn hàng theo trạng thái</p>
          </div>
          <div className="h-80 w-full outline-none border-none">
            {hasStatusData ? (
              <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none', border: 'none' }}>
                <PieChart style={{ outline: 'none', border: 'none' }}>
                  <Pie
                    data={statusDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="count"
                    nameKey="status"
                    animationBegin={0}
                    animationDuration={1500}
                  >
                    {statusDist.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} className="cursor-pointer outline-none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      borderRadius: "16px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      backdropFilter: "blur(8px)"
                    }}
                    formatter={(val: any, name: any) => [val, STATUS_MAP[name] || name]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    align="center"
                    formatter={(val) => <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{STATUS_MAP[val] || val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 dark:border-white/10 dark:bg-white/5">
                <div className="w-full max-w-xs rounded-2xl border border-slate-200/80 bg-white/80 p-5 text-center shadow-sm dark:border-white/10 dark:bg-slate-900/60">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-violet-50 text-violet-500 dark:bg-violet-500/15 dark:text-violet-300">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Chưa có trạng thái đơn hàng
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Chưa có đơn hàng phù hợp với bộ lọc hiện tại.
                  </p>
                  <div className="mt-4 space-y-2">
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10" />
                    <div className="h-2 w-4/5 rounded-full bg-slate-100 dark:bg-white/10" />
                    <div className="h-2 w-3/5 rounded-full bg-slate-100 dark:bg-white/10" />
                  </div>
                </div>
              </div>
            )}
          </div>
          {hasStatusData && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              {statusDist.slice(0, 4).map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{STATUS_MAP[item.status] || item.status}</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{item.count} đơn</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Top Products */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:order-2 lg:col-span-3 dark:border-white/10 dark:bg-slate-900/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sản phẩm bán chạy</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Top 5 sản phẩm có doanh số cao nhất</p>
            </div>
            <Package className="h-5 w-5 text-slate-400" />
          </div>
          <div className="max-h-[400px] overflow-y-auto pr-2 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-white/10 scrollbar-track-transparent">
            {hasTopProductsData ? (
              (() => {
                const displayProducts = topProducts.slice(0, 5);
                const maxSold = Math.max(...displayProducts.map(p => Number(p.quantitySold) || 1), 1);
                return displayProducts.map((product, idx) => {
                  const soldCount = Number(product.quantitySold) || 0;
                  const percentage = (soldCount / maxSold) * 100;

                  return (
                    <div key={idx} className="group relative cursor-pointer">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400 transition-colors group-hover:bg-blue-500 group-hover:text-white">
                            <Package className="h-4 w-4" />
                          </div>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white transition-colors group-hover:text-blue-500">
                            {product.productName}
                          </h4>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{soldCount}</span>
                          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-tight">đã bán</span>
                        </div>
                      </div>
                      {/* Progress Bar Container */}
                      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-blue-500 to-indigo-600 transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                });
              })()
            ) : (
              <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 dark:border-white/10 dark:bg-white/5">
                <div className="w-full max-w-xs rounded-2xl border border-slate-200/80 bg-white/80 p-5 text-center shadow-sm dark:border-white/10 dark:bg-slate-900/60">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-500 dark:bg-blue-500/15 dark:text-blue-300">
                    <Package className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Chưa có sản phẩm bán chạy
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Chưa phát sinh đơn hàng theo bộ lọc hiện tại.
                  </p>
                  <div className="mt-4 space-y-2">
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10" />
                    <div className="h-2 w-4/5 rounded-full bg-slate-100 dark:bg-white/10" />
                    <div className="h-2 w-3/5 rounded-full bg-slate-100 dark:bg-white/10" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sales by Category / Month Details */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:order-1 lg:col-span-4 dark:border-white/10 dark:bg-slate-900/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Đơn hàng theo tháng</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Số lượng đơn hàng thực hiện</p>
            </div>
            <ShoppingCart className="h-5 w-5 text-slate-400" />
          </div>
          <div className="h-64 w-full outline-none border-none">
            {hasMonthlyData ? (
              <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none', border: 'none' }}>
                <BarChart data={monthlyRevenue} style={{ outline: 'none', border: 'none' }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(59, 130, 246, 0.1)', radius: 8 }}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      borderRadius: "16px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      backdropFilter: "blur(8px)"
                    }}
                    formatter={(val: any) => [val, "Số đơn hàng"]}
                  />
                  <Bar
                    dataKey="orderCount"
                    fill="#3b82f6"
                    radius={[6, 6, 0, 0]}
                    barSize={32}
                    animationDuration={1500}
                  >
                    {monthlyRevenue.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === monthlyRevenue.length - 1 ? "#3b82f6" : "#cbd5e1"}
                        className="transition-all duration-300 hover:fill-blue-400 cursor-pointer"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 dark:border-white/10 dark:bg-white/5">
                <div className="w-full max-w-xs rounded-2xl border border-slate-200/80 bg-white/80 p-5 text-center shadow-sm dark:border-white/10 dark:bg-slate-900/60">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-500 dark:bg-blue-500/15 dark:text-blue-300">
                    <BarChart className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Chưa có dữ liệu đơn hàng theo tháng
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Dữ liệu theo tháng sẽ hiển thị khi có đơn phù hợp bộ lọc.
                  </p>
                  <div className="mt-4 space-y-2">
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10" />
                    <div className="h-2 w-4/5 rounded-full bg-slate-100 dark:bg-white/10" />
                    <div className="h-2 w-3/5 rounded-full bg-slate-100 dark:bg-white/10" />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Tháng hiện tại</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-slate-300" />
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Các tháng trước</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
    </>
  );
}
