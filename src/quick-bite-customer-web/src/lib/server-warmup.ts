// Resilient Server-side Warmup Manager for QuickBite Backend Microservices
// Features:
// 1. One in-flight request per service (zero request storming / hammering)
// 2. Standard browser User-Agent to avoid Cloudflare 429 rate-limiting
// 3. Staggered dispatch & graceful retry on 429 / 502 / 503 / timeouts during cold start
// 4. Stops immediately once a service reports Healthy

export type ServiceStatus = "Standby" | "Priming" | "Healthy" | "Failed";

export interface ServiceWarmupRecord {
  id: string;
  key: string;
  name: string;
  url: string;
  status: ServiceStatus;
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
  data?: any;
  error?: string;
  attempts?: number;
}

export interface BackendWarmupState {
  isInitiated: boolean;
  isAllHealthy: boolean;
  services: Record<string, ServiceWarmupRecord>;
}

declare global {
  // eslint-disable-next-line no-var
  var __quickbite_backend_state: BackendWarmupState | undefined;
}

const identityUrl = process.env.NEXT_PUBLIC_IDENTITY_URL || "https://quick-bite-identity.onrender.com";
const orderUrl = process.env.NEXT_PUBLIC_ORDER_URL || "https://quick-bite-order.onrender.com/api/app";
const catalogUrl = process.env.NEXT_PUBLIC_CATALOG_URL || "https://quick-bite-catalog.onrender.com";
const inventoryUrl = process.env.NEXT_PUBLIC_INVENTORY_URL || "https://quick-bite-inventory.onrender.com/api/v1";
const paymentUrl = process.env.NEXT_PUBLIC_PAYMENT_URL || "https://quick-bite-payment.onrender.com/v1";
const gatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "https://quick-bite-gw.onrender.com";

const TARGET_SERVICES: Array<{ id: string; key: string; name: string; url: string }> = [
  { id: "gateway", key: "gateway", name: "API Gateway", url: `${gatewayUrl}/health` },
  { id: "identity", key: "identity_service", name: "Identity Service", url: `${identityUrl}/health` },
  { id: "order", key: "order_service", name: "Order Service", url: `${orderUrl}/health` },
  { id: "catalog", key: "catalog_service", name: "Catalog Service", url: `${catalogUrl}/health` },
  { id: "payment", key: "payment_service", name: "Payment Service", url: `${paymentUrl}/health` },
  { id: "inventory", key: "inventory_service", name: "Inventory Service", url: `${inventoryUrl}/health` },
];

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function initializeState(): BackendWarmupState {
  if (globalThis.__quickbite_backend_state) {
    return globalThis.__quickbite_backend_state;
  }

  const initialServices: Record<string, ServiceWarmupRecord> = {};
  TARGET_SERVICES.forEach((svc) => {
    initialServices[svc.key] = {
      id: svc.id,
      key: svc.key,
      name: svc.name,
      url: svc.url,
      status: "Standby",
      attempts: 0,
    };
  });

  const state: BackendWarmupState = {
    isInitiated: false,
    isAllHealthy: false,
    services: initialServices,
  };

  globalThis.__quickbite_backend_state = state;
  return state;
}

export function getBackendWarmupState(): BackendWarmupState {
  const state = initializeState();
  state.isAllHealthy = Object.values(state.services).every((s) => s.status === "Healthy");
  return state;
}

/**
 * Probes a single service with sequential retry if Cold-Start / 429 / 502 occurs.
 * Strictly maintains at most ONE request in-flight for this service.
 */
async function probeServiceWithRetry(
  target: { id: string; key: string; name: string; url: string },
  state: BackendWarmupState
): Promise<void> {
  const record = state.services[target.key];
  if (record.status === "Healthy") {
    return; // Already healthy, do not touch
  }

  const maxAttempts = 15; // Up to 60s total wait window for Render cold start

  record.startedAt = Date.now();
  record.status = "Priming";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    record.attempts = attempt;

    try {
      const res = await fetch(target.url, {
        method: "GET",
        headers: {
          Accept: "application/json, text/plain, */*",
          "User-Agent": BROWSER_USER_AGENT,
        },
        signal: AbortSignal.timeout(35000), // 35s per probe attempt
        cache: "no-store",
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = res.ok ? { status: "Healthy" } : { status: "Unhealthy" };
      }

      record.data = data;

      // Check success condition:
      // 1. Gateway: HTTP 200 is Healthy (even if downstream services are still waking up)
      // 2. Microservices: HTTP 200 with standard healthy/ok/up indicators
      if (res.ok || res.status === 200) {
        const rawStatus = (data?.status || data?.data?.status || (res.ok ? "Healthy" : "")).toString().toLowerCase();
        const isUpOrHealthy =
          rawStatus === "healthy" ||
          rawStatus === "ok" ||
          rawStatus === "up" ||
          target.id === "gateway" || // Gateway process itself is running
          data?.success === true;

        if (isUpOrHealthy) {
          record.status = "Healthy";
          record.completedAt = Date.now();
          record.durationMs = record.completedAt - (record.startedAt || record.completedAt);
          record.error = undefined;
          console.log(
            `[Warmup] Service ${target.name} is HEALTHY in attempt #${attempt} (${record.durationMs}ms)`
          );
          return; // STOP IMMEDIATELY: Service is ready!
        }
      }

      // If HTTP 429 (Cloudflare rate limit) or 502/503 (Render booting container)
      console.warn(
        `[Warmup] Service ${target.name} responded HTTP ${res.status} (attempt ${attempt}/${maxAttempts}). Waiting to retry...`
      );
      record.error = `HTTP ${res.status}`;
    } catch (err: any) {
      record.error = err.message || "Connection timeout";
      console.warn(
        `[Warmup] Service ${target.name} probe error: ${record.error} (attempt ${attempt}/${maxAttempts})`
      );
    }

    // Wait 3.5 seconds before the next sequential probe
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 3500));
    }
  }

  // If all attempts exhausted
  if (record.status !== "Healthy") {
    record.status = "Failed";
    record.completedAt = Date.now();
    console.error(`[Warmup] Service ${target.name} failed after ${maxAttempts} attempts: ${record.error}`);
  }
}

/**
 * Dispatches warmup workers with staggered initial delay to prevent Cloudflare burst 429s.
 */
export function startSingleFlightWarmup(): void {
  const state = initializeState();

  if (state.isInitiated) {
    return;
  }

  state.isInitiated = true;
  console.log(`[Warmup] Launching resilient backend warmup for ${TARGET_SERVICES.length} services...`);

  // Stagger launch by 400ms between services to avoid simultaneous burst
  TARGET_SERVICES.forEach((target, index) => {
    setTimeout(() => {
      probeServiceWithRetry(target, state).finally(() => {
        state.isAllHealthy = Object.values(state.services).every((s) => s.status === "Healthy");
      });
    }, index * 400);
  });
}

/**
 * Re-triggers probing only for services that are currently in 'Failed' state.
 * Never re-queries services that are already 'Healthy'.
 */
export function ensureWarmupProgress(): void {
  const state = initializeState();

  if (!state.isInitiated) {
    startSingleFlightWarmup();
    return;
  }

  TARGET_SERVICES.forEach((target, index) => {
    const record = state.services[target.key];
    if (record && record.status === "Failed") {
      setTimeout(() => {
        probeServiceWithRetry(target, state).finally(() => {
          state.isAllHealthy = Object.values(state.services).every((s) => s.status === "Healthy");
        });
      }, index * 300);
    }
  });
}
