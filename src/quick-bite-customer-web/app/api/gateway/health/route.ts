import { NextResponse } from "next/server";

export async function GET() {
  const gatewayUrl =
    process.env.NEXT_PUBLIC_API_GATEWAY_URL || "https://quick-bite-gw.onrender.com";

  try {
    const controller = new AbortController();
    // Allow up to 90 seconds for Render container cold start
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    const response = await fetch(`${gatewayUrl}/health`, {
      method: "GET",
      headers: {
        Accept: "application/json, text/plain, */*",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (response.ok || response.status === 200 || response.status === 204) {
      const data = await response.json().catch(() => ({ status: "Healthy" }));
      return NextResponse.json(data && data.status ? data : { status: "Healthy" });
    }

    return NextResponse.json(
      { status: "Waking", message: "Gateway is warming up" },
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
