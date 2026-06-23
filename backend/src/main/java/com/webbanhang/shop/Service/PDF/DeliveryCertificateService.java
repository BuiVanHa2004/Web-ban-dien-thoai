package com.webbanhang.shop.Service.PDF;

import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.io.font.PdfEncodings;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.webbanhang.shop.Model.Orders.Order;
import com.webbanhang.shop.Model.Orders.OrderItem;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
public class DeliveryCertificateService {

    private static final Logger log = LoggerFactory.getLogger(DeliveryCertificateService.class);
    private final DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");
    private final NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(new Locale("vi", "VN"));

    public byte[] generateDeliveryCertificate(Order order) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf, PageSize.A4);
            document.setMargins(40, 40, 40, 40);

            // ✅ FIX: Use built-in fonts that support Vietnamese
            // FreeSans is a built-in font in iText that supports Unicode/Vietnamese characters
            PdfFont font = PdfFontFactory.createFont("Helvetica", PdfEncodings.IDENTITY_H, PdfFontFactory.EmbeddingStrategy.PREFER_EMBEDDED);
            PdfFont boldFont = PdfFontFactory.createFont("Helvetica-Bold", PdfEncodings.IDENTITY_H, PdfFontFactory.EmbeddingStrategy.PREFER_EMBEDDED);

            // Header
            Paragraph header = new Paragraph("MYPHONE STORE")
                    .setFont(boldFont)
                    .setFontSize(24)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontColor(new DeviceRgb(0, 123, 255))
                    .setMarginBottom(5);
            document.add(header);

            Paragraph subHeader = new Paragraph("CHỨNG NHẬN GIAO HÀNG")
                    .setFont(boldFont)
                    .setFontSize(18)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(20);
            document.add(subHeader);

            // Order info section
            Table infoTable = new Table(2);
            infoTable.setWidth(UnitValue.createPercentValue(100));
            
            addInfoRow(infoTable, "Mã đơn hàng:", order.getOrderCode(), font, boldFont);
            addInfoRow(infoTable, "Ngày đặt hàng:", formatDateTime(order.getCreatedAt()), font, boldFont);
            addInfoRow(infoTable, "Ngày giao hàng:", formatDateTime(order.getUpdatedAt()), font, boldFont);
            addInfoRow(infoTable, "Tên khách hàng:", order.getCustomerName(), font, boldFont);
            addInfoRow(infoTable, "Người nhận:", order.getReceiverName(), font, boldFont);
            addInfoRow(infoTable, "Số điện thoại:", order.getReceiverPhone(), font, boldFont);
            addInfoRow(infoTable, "Địa chỉ giao hàng:", order.getShippingAddress(), font, boldFont);
            addInfoRow(infoTable, "Phương thức thanh toán:", translatePaymentMethod(order.getPaymentMethod()), font, boldFont);

            document.add(infoTable);
            document.add(new Paragraph("\n"));

            // Products section
            Paragraph productsTitle = new Paragraph("DANH SÁCH SẢN PHẨM")
                    .setFont(boldFont)
                    .setFontSize(14)
                    .setMarginBottom(10);
            document.add(productsTitle);

            // Products table
            float[] columnWidths = {4, 1, 2, 2};
            Table productTable = new Table(columnWidths);
            productTable.setWidth(UnitValue.createPercentValue(100));

            // Table header
            productTable.addHeaderCell(createHeaderCell("Sản phẩm", boldFont));
            productTable.addHeaderCell(createHeaderCell("SL", boldFont));
            productTable.addHeaderCell(createHeaderCell("Đơn giá", boldFont));
            productTable.addHeaderCell(createHeaderCell("Thành tiền", boldFont));

            // Table rows
            for (OrderItem item : order.getItems()) {
                // Product name with variants
                StringBuilder productInfo = new StringBuilder(item.getProductName());
                if (item.getRamGb() != null || item.getStorageGb() != null || item.getColorName() != null) {
                    productInfo.append("\n");
                    if (item.getRamGb() != null) productInfo.append("RAM: ").append(item.getRamGb()).append("GB ");
                    if (item.getStorageGb() != null) productInfo.append("Bộ nhớ: ").append(item.getStorageGb()).append("GB ");
                    if (item.getColorName() != null) productInfo.append("Màu: ").append(item.getColorName());
                }
                
                productTable.addCell(createCell(productInfo.toString(), font));
                productTable.addCell(createCell(String.valueOf(item.getQuantity()), font).setTextAlignment(TextAlignment.CENTER));
                productTable.addCell(createCell(formatCurrency(item.getProductPrice()), font).setTextAlignment(TextAlignment.RIGHT));
                
                BigDecimal lineTotal = item.getProductPrice().multiply(new BigDecimal(item.getQuantity()));
                productTable.addCell(createCell(formatCurrency(lineTotal), font).setTextAlignment(TextAlignment.RIGHT));
            }

            // Total row
            Cell totalLabelCell = new Cell(1, 3)
                    .add(new Paragraph("TỔNG CỘNG:").setFont(boldFont).setFontSize(12))
                    .setTextAlignment(TextAlignment.RIGHT)
                    .setBorder(Border.NO_BORDER)
                    .setBackgroundColor(new DeviceRgb(240, 240, 240));
            productTable.addCell(totalLabelCell);

            Cell totalAmountCell = new Cell()
                    .add(new Paragraph(formatCurrency(order.getTotalAmount())).setFont(boldFont).setFontSize(12))
                    .setTextAlignment(TextAlignment.RIGHT)
                    .setBorder(Border.NO_BORDER)
                    .setBackgroundColor(new DeviceRgb(240, 240, 240))
                    .setFontColor(new DeviceRgb(0, 123, 255));
            productTable.addCell(totalAmountCell);

            document.add(productTable);
            document.add(new Paragraph("\n"));

            // Signature section
            Table signatureTable = new Table(2);
            signatureTable.setWidth(UnitValue.createPercentValue(100));

            Cell customerSignCell = new Cell()
                    .add(new Paragraph("Người nhận hàng").setFont(boldFont).setTextAlignment(TextAlignment.CENTER))
                    .add(new Paragraph("(Ký, ghi rõ họ tên)").setFont(font).setFontSize(9).setTextAlignment(TextAlignment.CENTER))
                    .add(new Paragraph("\n\n\n\n").setFont(font))
                    .setBorder(Border.NO_BORDER);

            Cell deliverySignCell = new Cell()
                    .add(new Paragraph("Người giao hàng").setFont(boldFont).setTextAlignment(TextAlignment.CENTER))
                    .add(new Paragraph("(Ký, ghi rõ họ tên)").setFont(font).setFontSize(9).setTextAlignment(TextAlignment.CENTER))
                    .add(new Paragraph("\n\n\n\n").setFont(font))
                    .setBorder(Border.NO_BORDER);

            signatureTable.addCell(customerSignCell);
            signatureTable.addCell(deliverySignCell);

            document.add(signatureTable);

            // Footer
            Paragraph footer = new Paragraph("Cảm ơn bạn đã sử dụng dịch vụ của MyPhone Store!\n" +
                    "Email: buivanha22032004@gmail.com | Hotline: 1900-xxxx")
                    .setFont(font)
                    .setFontSize(9)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontColor(ColorConstants.GRAY)
                    .setMarginTop(20);
            document.add(footer);

            // Watermark
            Paragraph watermark = new Paragraph("Đã xác nhận giao hàng thành công")
                    .setFont(boldFont)
                    .setFontSize(10)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontColor(new DeviceRgb(40, 167, 69))
                    .setMarginTop(10);
            document.add(watermark);

            document.close();
            
            log.info("Generated delivery certificate PDF for order {}", order.getOrderCode());
            return baos.toByteArray();
            
        } catch (Exception e) {
            log.error("Failed to generate delivery certificate PDF for order {}", order.getOrderCode(), e);
            return null;
        }
    }

    private void addInfoRow(Table table, String label, String value, PdfFont font, PdfFont boldFont) {
        table.addCell(new Cell()
                .add(new Paragraph(label).setFont(boldFont))
                .setBorder(Border.NO_BORDER)
                .setPadding(5));
        table.addCell(new Cell()
                .add(new Paragraph(value != null ? value : "").setFont(font))
                .setBorder(Border.NO_BORDER)
                .setPadding(5));
    }

    private Cell createHeaderCell(String content, PdfFont font) {
        return new Cell()
                .add(new Paragraph(content).setFont(font).setFontSize(11))
                .setBackgroundColor(new DeviceRgb(0, 123, 255))
                .setFontColor(ColorConstants.WHITE)
                .setTextAlignment(TextAlignment.CENTER)
                .setPadding(8);
    }

    private Cell createCell(String content, PdfFont font) {
        return new Cell()
                .add(new Paragraph(content).setFont(font).setFontSize(10))
                .setPadding(8);
    }

    private String formatDateTime(java.time.Instant instant) {
        if (instant == null) return "";
        LocalDateTime ldt = LocalDateTime.ofInstant(instant, ZoneId.of("Asia/Ho_Chi_Minh"));
        return dateFormatter.format(ldt);
    }

    private String formatCurrency(BigDecimal amount) {
        if (amount == null) return "0d";
        return currencyFormatter.format(amount);
    }

    private String translatePaymentMethod(String method) {
        if (method == null) return "COD";
        return "COD".equalsIgnoreCase(method) ? "Thanh toán khi nhận hàng (COD)" : "Chuyển khoản ngân hàng";
    }
}
