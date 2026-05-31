import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:8080";

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization");
    const guestSessionId = req.headers.get("x-guest-session-id") || "";
    const xForwardedFor = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";

    const res = await fetch(`${BACKEND_URL}/api/ai/quota`, {
      method: "GET",
      headers: {
        ...(token ? { Authorization: token } : {}),
        ...(guestSessionId ? { "x-guest-session-id": guestSessionId } : {}),
        ...(xForwardedFor ? { "x-forwarded-for": xForwardedFor } : {}),
      },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể lấy quota." },
      { status: 500 }
    );
  }
}
