import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:8080";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      messages: ChatMessage[];
      sessionId?: number;
      guestSessionId?: string;
    };

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: "Vui lòng gửi tin nhắn." }, { status: 400 });
    }

    const token = req.headers.get("authorization");
    const guestHeader = req.headers.get("x-guest-session-id");
    const xForwardedFor = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
    const guestSessionId = guestHeader || body.guestSessionId || "";

    const backendRes = await fetch(`${BACKEND_URL}/api/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: token } : {}),
        ...(guestSessionId ? { "x-guest-session-id": guestSessionId } : {}),
        ...(xForwardedFor ? { "x-forwarded-for": xForwardedFor } : {}),
      },
      body: JSON.stringify({
        sessionId: body.sessionId ?? null,
        guestSessionId: guestSessionId || null,
        messages: body.messages,
      }),
      cache: "no-store",
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (error) {
    console.error("[Chat Proxy Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Có lỗi xảy ra khi xử lý yêu cầu AI." },
      { status: 500 }
    );
  }
}
