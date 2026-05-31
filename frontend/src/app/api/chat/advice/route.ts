import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:8080";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { message?: string; topK?: number };
    const message = (body?.message || "").trim();
    const topK = body?.topK;

    if (!message) {
      return NextResponse.json({ error: "Vui lòng gửi tin nhắn." }, { status: 400 });
    }

    const token = req.headers.get("authorization");

    const backendRes = await fetch(`${BACKEND_URL}/api/ai/advice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: token } : {}),
      },
      body: JSON.stringify({ message, topK: typeof topK === "number" ? topK : null }),
      cache: "no-store",
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (error) {
    console.error("[Chat Advice Proxy Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Có lỗi xảy ra khi xử lý yêu cầu AI." },
      { status: 500 }
    );
  }
}
