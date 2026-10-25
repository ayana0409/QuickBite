import { NextResponse } from "next/server";

const formatPingUrl = (url?: string) => (url ? `${url.trim().replace(/\/+$/, '')}/` : null);

const SERVICE_URLS = [
  formatPingUrl(process.env.NEXT_PUBLIC_IDENTITY_URL),
  formatPingUrl(process.env.NEXT_PUBLIC_ORDER_URL),
  formatPingUrl(process.env.NEXT_PUBLIC_CATALOG_URL),
  formatPingUrl(process.env.NEXT_PUBLIC_INVENTORY_URL),
  formatPingUrl(process.env.NEXT_PUBLIC_PAYMENT_URL),
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ? `${process.env.NEXT_PUBLIC_API_GATEWAY_URL.trim().replace(/\/+$/, '')}/health` : null,
].filter(Boolean) as string[];

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
