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

            // Use standard fonts that work reliably across all systems
            PdfFont font = PdfFontFactory.createFont("Helvetica");
            PdfFont boldFont = PdfFontFactory.createFont("Helvetica-Bold");

            // Header
            Paragraph header = new Paragraph("MYPHONE STORE")
                    .setFont(boldFont)
                    .setFontSize(24)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontColor(new DeviceRgb(0, 123, 255))
                    .setMarginBottom(5);
            document.add(header);

            Paragraph subHeader = new Paragraph("CHUNG NHAN GIAO HANG")
                    .setFont(boldFont)
                    .setFontSize(18)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(20);
            document.add(subHeader);

            // Order info section
            Table infoTable = new Table(2);
            infoTable.setWidth(UnitValue.createPercentValue(100));
            
            addInfoRow(infoTable, "Ma don hang:", order.getOrderCode(), font, boldFont);
            addInfoRow(infoTable, "Ngay dat hang:", formatDateTime(order.getCreatedAt()), font, boldFont);
            addInfoRow(infoTable, "Ngay giao hang:", formatDateTime(order.getUpdatedAt()), font, boldFont);
            addInfoRow(infoTable, "Ten khach hang:", order.getCustomerName(), font, boldFont);
            addInfoRow(infoTable, "Nguoi nhan:", order.getReceiverName(), font, boldFont);
            addInfoRow(infoTable, "So dien thoai:", order.getReceiverPhone(), font, boldFont);
            addInfoRow(infoTable, "Dia chi giao hang:", order.getShippingAddress(), font, boldFont);
            addInfoRow(infoTable, "Phuong thuc thanh toan:", translatePaymentMethod(order.getPaymentMethod()), font, boldFont);

            document.add(infoTable);
            document.add(new Paragraph("\n"));

            // Products section
            Paragraph productsTitle = new Paragraph("DANH SACH SAN PHAM")
                    .setFont(boldFont)
                    .setFontSize(14)
                    .setMarginBottom(10);
            document.add(productsTitle);

            // Products table
            float[] columnWidths = {4, 1, 2, 2};
            Table productTable = new Table(columnWidths);
            productTable.setWidth(UnitValue.createPercentValue(100));

            // Table header
            productTable.addHeaderCell(createHeaderCell("San pham", boldFont));
            productTable.addHeaderCell(createHeaderCell("SL", boldFont));
            productTable.addHeaderCell(createHeaderCell("Don gia", boldFont));
            productTable.addHeaderCell(createHeaderCell("Thanh tien", boldFont));

            // Table rows
            for (OrderItem item : order.getItems()) {
                // Product name with variants
                StringBuilder productInfo = new StringBuilder(item.getProductName());
                if (item.getRamGb() != null || item.getStorageGb() != null || item.getColorName() != null) {
                    productInfo.append("\n");
                    if (item.getRamGb() != null) productInfo.append("RAM: ").append(item.getRamGb()).append("GB ");
                    if (item.getStorageGb() != null) productInfo.append("Bo nho: ").append(item.getStorageGb()).append("GB ");
                    if (item.getColorName() != null) productInfo.append("Mau: ").append(item.getColorName());
                }
                
                productTable.addCell(createCell(productInfo.toString(), font));
                productTable.addCell(createCell(String.valueOf(item.getQuantity()), font).setTextAlignment(TextAlignment.CENTER));
                productTable.addCell(createCell(formatCurrency(item.getProductPrice()), font).setTextAlignment(TextAlignment.RIGHT));
                
                BigDecimal lineTotal = item.getProductPrice().multiply(new BigDecimal(item.getQuantity()));
                productTable.addCell(createCell(formatCurrency(lineTotal), font).setTextAlignment(TextAlignment.RIGHT));
            }

            // Total row
            Cell totalLabelCell = new Cell(1, 3)
                    .add(new Paragraph("TONG CONG:").setFont(boldFont).setFontSize(12))
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
                    .add(new Paragraph("Nguoi nhan hang").setFont(boldFont).setTextAlignment(TextAlignment.CENTER))
                    .add(new Paragraph("(Ky, ghi ro ho ten)").setFont(font).setFontSize(9).setTextAlignment(TextAlignment.CENTER))
                    .add(new Paragraph("\n\n\n\n").setFont(font))
                    .setBorder(Border.NO_BORDER);

            Cell deliverySignCell = new Cell()
                    .add(new Paragraph("Nguoi giao hang").setFont(boldFont).setTextAlignment(TextAlignment.CENTER))
                    .add(new Paragraph("(Ky, ghi ro ho ten)").setFont(font).setFontSize(9).setTextAlignment(TextAlignment.CENTER))
                    .add(new Paragraph("\n\n\n\n").setFont(font))
                    .setBorder(Border.NO_BORDER);

            signatureTable.addCell(customerSignCell);
            signatureTable.addCell(deliverySignCell);

            document.add(signatureTable);

            // Footer
            Paragraph footer = new Paragraph("Cam on ban da su dung dich vu cua MyPhone Store!\n" +
                    "Email: buivanha22032004@gmail.com | Hotline: 1900-xxxx")
                    .setFont(font)
                    .setFontSize(9)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontColor(ColorConstants.GRAY)
                    .setMarginTop(20);
            document.add(footer);

            // Watermark
            Paragraph watermark = new Paragraph("Da xac nhan giao hang thanh cong")
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
        return "COD".equalsIgnoreCase(method) ? "Thanh toan khi nhan hang (COD)" : "Chuyen khoan ngan hang";
    }
}
