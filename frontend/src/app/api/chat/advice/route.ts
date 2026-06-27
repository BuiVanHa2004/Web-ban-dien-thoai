import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:8080";

function getOrCreateGuestSessionId(req: NextRequest): string {
  // Try to get from header first
  const headerSessionId = req.headers.get("x-guest-session-id");
  if (headerSessionId) return headerSessionId;
  
  // Generate new one if not exists
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { 
      message?: string; 
      topK?: number;
      guestSessionId?: string;
      sessionId?: number | null;
    };
    const message = (body?.message || "").trim();
    const topK = body?.topK;
    const guestSessionId = body?.guestSessionId || getOrCreateGuestSessionId(req);
    const sessionId = body?.sessionId;

    if (!message) {
      return NextResponse.json({ error: "Vui lòng gửi tin nhắn." }, { status: 400 });
    }

    const token = req.headers.get("authorization");
    const xForwardedFor = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    const backendRes = await fetch(`${BACKEND_URL}/api/ai/advice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": xForwardedFor,
        ...(token ? { Authorization: token } : {}),
      },
      body: JSON.stringify({ 
        message, 
        topK: typeof topK === "number" ? topK : null,
        guestSessionId,
        sessionId: sessionId || null,
      }),
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
