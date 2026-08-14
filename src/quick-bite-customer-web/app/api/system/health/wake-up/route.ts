import { NextResponse } from "next/server";

const SERVICE_URLS = [
  process.env.NEXT_PUBLIC_IDENTITY_URL ? `${process.env.NEXT_PUBLIC_IDENTITY_URL}/health` : "https://quick-bite-identity.onrender.com/health",
  process.env.NEXT_PUBLIC_ORDER_URL ? `${process.env.NEXT_PUBLIC_ORDER_URL}/health` : "https://quick-bite-order.onrender.com/api/app/health",
  process.env.NEXT_PUBLIC_CATALOG_URL ? `${process.env.NEXT_PUBLIC_CATALOG_URL}/health` : "https://quick-bite-catalog.onrender.com/health",
  process.env.NEXT_PUBLIC_INVENTORY_URL ? `${process.env.NEXT_PUBLIC_INVENTORY_URL}/health` : "https://quick-bite-inventory.onrender.com/api/v1/health",
  process.env.NEXT_PUBLIC_PAYMENT_URL ? `${process.env.NEXT_PUBLIC_PAYMENT_URL}/health` : "https://quick-bite-payment.onrender.com/v1/health",
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ? `${process.env.NEXT_PUBLIC_API_GATEWAY_URL}/health` : "https://quick-bite-gw.onrender.com/health",
];

export async function GET() {
  // Fire server-side wakeup requests to all downstream services in parallel
  const pingPromises = SERVICE_URLS.map(async (url) => {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      });
      return { url, ok: res.ok, status: res.status };
    } catch (e: any) {
      return { url, ok: false, error: e.message };
    }
  });

  const results = await Promise.allSettled(pingPromises);
  return NextResponse.json({
    status: "PingDispatched",
    results: results.map((r) => (r.status === "fulfilled" ? r.value : { error: "Failed" })),
  });
}
