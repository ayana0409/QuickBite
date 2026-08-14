import { NextResponse } from "next/server";

export async function GET() {
  const gatewayUrl =
    process.env.NEXT_PUBLIC_API_GATEWAY_URL || "https://quickbite-gateway.onrender.com";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${gatewayUrl}/health`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json().catch(() => ({ status: "Healthy" }));
      return NextResponse.json(data);
    }

    return NextResponse.json(
      { status: "Waking", message: "Backend is warming up" },
      { status: 200 }
    );
  } catch {
    // Return status 200 with waking state to avoid frontend red error logs during cold start
    return NextResponse.json(
      { status: "Waking", message: "Cold start in progress" },
      { status: 200 }
    );
  }
}
