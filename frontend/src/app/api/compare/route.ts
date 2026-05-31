import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const BACKEND_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:8080";

type ProductData = {
  productId: number;
  productName: string;
  currentPrice: number;
  basePrice: number;
  categoryName?: string | null;
  brandName?: string | null;
  productDescribe?: string | null;
  productColors?: Array<{
    colorName: string;
    variants?: Array<{
      ramGb?: number | null;
      storageGb?: number | null;
      finalPrice?: number | null;
      originalPrice?: number | null;
    }>;
  }>;
  productSpecs?: Array<{
    chip?: string | null;
    screen?: string | null;
    battery?: string | null;
    cameraFront?: string | null;
    cameraRear?: string | null;
    operatingSystem?: string | null;
    refreshRate?: string | null;
    fastCharge?: string | null;
    support5g?: boolean | null;
    nfc?: boolean | null;
    size?: string | null;
    weight?: string | null;
    material?: string | null;
    waterResistance?: string | null;
    chargingPort?: string | null;
    sim?: string | null;
    warranty?: string | null;
  } | null>;
};

function parseBatteryMah(value?: string | null): number {
  if (!value) return 0;
  const m = value.replace(/\./g, "").match(/(\d{3,5})\s*m?ah/i);
  return m ? Number(m[1]) : 0;
}

function parseFastChargeWatt(value?: string | null): number {
  if (!value) return 0;
  const m = value.replace(",", ".").match(/(\d+(?:\.\d+)?)\s*w/i);
  return m ? Number(m[1]) : 0;
}

function formatProduct(p: ProductData): string {
  const spec = (p.productSpecs || []).filter(Boolean)[0];
  const colors = (p.productColors || [])
    .map((c) => {
      const vars = (c.variants || [])
        .map((v) => `Màu ${c.colorName} - RAM ${v.ramGb ?? "?"}GB - Bộ nhớ ${v.storageGb ?? "?"}GB - Giá ${(v.finalPrice ?? v.originalPrice ?? 0).toLocaleString("vi-VN")}đ`)
        .join("; ");
      return `  - ${vars || `Màu ${c.colorName}: không có variant`}`;
    })
    .join("\n");

  const specLines = spec
    ? [
        `  Chip: ${spec.chip || "?"}`,
        `  Màn hình: ${spec.screen || "?"}`,
        `  Pin: ${spec.battery || "?"}`,
        `  Sạc nhanh: ${spec.fastCharge || "?"}`,
        `  Camera sau: ${spec.cameraRear || "?"}`,
        `  Camera trước: ${spec.cameraFront || "?"}`,
        `  Tần số quét: ${spec.refreshRate || "?"}`,
        `  Hệ điều hành: ${spec.operatingSystem || "?"}`,
        `  5G: ${spec.support5g ? "Có" : spec.support5g === false ? "Không" : "?"}`,
        `  NFC: ${spec.nfc ? "Có" : spec.nfc === false ? "Không" : "?"}`,
        `  Kích thước: ${spec.size || "?"}`,
        `  Trọng lượng: ${spec.weight || "?"}`,
        `  Chất liệu: ${spec.material || "?"}`,
        `  Chống nước: ${spec.waterResistance || "?"}`,
        `  Cổng sạc: ${spec.chargingPort || "?"}`,
        `  SIM: ${spec.sim || "?"}`,
        `  Bảo hành: ${spec.warranty || "?"}`,
      ].join("\n")
    : "  (Không có thông số chi tiết)";

  return `📱 [ID:${p.productId}] ${p.productName}
  Hãng: ${p.brandName || "?"} | Danh mục: ${p.categoryName || "?"}
  Giá hiện tại: ${p.currentPrice.toLocaleString("vi-VN")}đ
${colors}
${specLines}`;
}

function pickBestBatteryProduct(products: ProductData[]): ProductData | null {
  if (!products.length) return null;
  return [...products].sort((a, b) => {
    const specA = (a.productSpecs || []).filter(Boolean)[0];
    const specB = (b.productSpecs || []).filter(Boolean)[0];
    const scoreA = parseBatteryMah(specA?.battery) * 1000 + parseFastChargeWatt(specA?.fastCharge);
    const scoreB = parseBatteryMah(specB?.battery) * 1000 + parseFastChargeWatt(specB?.fastCharge);
    return scoreB - scoreA;
  })[0];
}

function normalizeProductLinks(text: string): string {
  let output = text;
  // Fix escaped markdown links: [name]\(/product/8) -> [name](/product/8)
  output = output.replace(/\]\\\(/g, "](");
  // Fix missing closing parenthesis: [name](/product/8 -> [name](/product/8)
  output = output.replace(/(\[[^\]]+\]\(\/product\/\d+)(?!\))/g, "$1)");
  return output;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { productIds: number[] };
    const { productIds } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length < 2 || productIds.length > 5) {
      return NextResponse.json({ error: "Vui lòng chọn 2-5 sản phẩm để so sánh." }, { status: 400 });
    }

    // Fetch each product from backend
    const productPromises = productIds.map(async (id) => {
      const res = await fetch(`${BACKEND_URL}/api/products/${id}`, {
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) return null;
      return (await res.json()) as ProductData;
    });

    const products = (await Promise.all(productPromises)).filter(Boolean) as ProductData[];

    if (products.length < 2) {
      return NextResponse.json({ error: "Không tìm thấy đủ sản phẩm để so sánh." }, { status: 400 });
    }

    const productTexts = products.map(formatProduct).join("\n\n---\n\n");

    const systemPrompt = `Bạn là chuyên gia tư vấn điện thoại của MyPhone Store.

Khách hàng muốn SO SÁNH các sản phẩm dưới đây theo các mục:
1) 💰 Giá cả rẻ nhất của các sản phẩm
2) 📸 Camera
3) 🎮 Hiệu năng & Gaming
4) 🔋 Pin & Sạc
5) 📱 Màn hình
6) 🏆 Điện thoại tốt nhất trong các máy đã chọn

QUY TẮC BẮT BUỘC:
- Trả lời ĐẦY ĐỦ, rõ ràng, không cắt cụt nội dung giữa chừng.
- KHÔNG dùng ký hiệu \`###\`.
- Mỗi mục chỉ nêu ý chính, không lan man.
- Ở mục 💰 Giá cả, mỗi sản phẩm phải ghi giá đi kèm biến thể cụ thể: màu + RAM + bộ nhớ.
- Ở mục 📸 Camera, mỗi sản phẩm phải nêu rõ cả camera sau và camera trước.
- Ở mục 📱 Màn hình, mỗi sản phẩm phải nêu kích thước/mô tả màn hình và tần số quét.
- Ở mỗi mục phải có:
  + Dòng so sánh ngắn theo từng sản phẩm (bullet).
  + Một dòng "Tốt nhất mục này: [Tên sản phẩm](/product/ID) - lý do ngắn".
- Riêng mục 🔋 Pin & Sạc, BẮT BUỘC phải có đúng dòng "Tốt nhất mục này: ...".
- Sau tất cả các mục, bắt buộc có phần "Kết luận cuối cùng" và chọn đúng 1 sản phẩm tốt nhất tổng thể:
  + "Sản phẩm tốt nhất tổng thể: [Tên sản phẩm](/product/ID) - lý do ngắn".
  + Thêm một câu chốt tự nhiên: "Trong các máy đã chọn, máy đáng mua nhất là [Tên sản phẩm](/product/ID)."
- Phải hoàn thành đầy đủ toàn bộ 6 mục và phần "Kết luận cuối cùng" trước khi kết thúc câu trả lời.

QUY TẮC LIÊN KẾT:
- Khi nhắc đến tên sản phẩm, LUÔN dùng markdown link dạng [Tên sản phẩm](/product/ID), ID lấy từ [ID:...] trong dữ liệu.

QUY TẮC DỮ LIỆU:
- Chỉ dựa trên dữ liệu được cung cấp.
- Nếu thiếu thông số, ghi rõ "chưa có thông tin".
- Trả lời bằng tiếng Việt.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `So sánh chi tiết ${products.length} sản phẩm sau:\n\n${productTexts}`,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      max_tokens: 2200,
      top_p: 0.9,
    });

    let reply =
      chatCompletion.choices?.[0]?.message?.content ??
      "Xin lỗi, tôi không thể so sánh lúc này.";

    const hasBatterySection = /pin\s*&\s*sạc/i.test(reply);
    const hasBestInBatterySection = /pin\s*&\s*sạc[\s\S]*?tốt nhất mục này\s*:/i.test(reply);
    if (hasBatterySection && !hasBestInBatterySection) {
      const bestBatteryProduct = pickBestBatteryProduct(products);
      if (bestBatteryProduct) {
        reply = `${reply}\n- Tốt nhất mục này: [${bestBatteryProduct.productName}](/product/${bestBatteryProduct.productId}) - pin và sạc nhỉnh hơn trong các máy đã chọn.`;
      }
    }

    reply = normalizeProductLinks(reply);

    return NextResponse.json({ reply, products });
  } catch (error) {
    console.error("[Groq Compare Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Có lỗi xảy ra." },
      { status: 500 }
    );
  }
}
