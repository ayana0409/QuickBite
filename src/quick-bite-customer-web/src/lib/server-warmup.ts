// Server-side Singleton Warmup Manager for QuickBite Backend Microservices
// Guarantees EXACTLY ONE request per service with a 90s connection hold, avoiding request storming.

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
}

export interface BackendWarmupState {
  isInitiated: boolean;
  isAllHealthy: boolean;
  services: Record<string, ServiceWarmupRecord>;
}

// Global declaration for Node.js process singleton
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
  const allHealthy = Object.values(state.services).every((s) => s.status === "Healthy");
  state.isAllHealthy = allHealthy;
  return state;
}

/**
 * Dispatches exactly ONE single-flight request to each backend service.
 * Holds the connection up to 90 seconds to allow Render free tier to spin up.
 * Never retries or hammers endpoints.
 */
export function startSingleFlightWarmup(): void {
  const state = initializeState();

  if (state.isInitiated) {
    // Already running or completed, strictly enforce single execution
    return;
  }

  state.isInitiated = true;
  const startTime = Date.now();
  console.log(`[SingleFlightWarmup] Initializing single-request backend warmup for ${TARGET_SERVICES.length} services...`);

  TARGET_SERVICES.forEach((target) => {
    const record = state.services[target.key];
    record.status = "Priming";
    record.startedAt = Date.now();

    // Fire single request with long 90s connection retention
    fetch(target.url, {
      method: "GET",
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent": "QuickBite-SingleFlight-Warmup/1.0",
      },
      signal: AbortSignal.timeout(90000), // Hold connection open for Render cold start
      cache: "no-store",
    })
      .then(async (res) => {
        const completedAt = Date.now();
        record.completedAt = completedAt;
        record.durationMs = completedAt - (record.startedAt || startTime);

        let data: any = null;
        try {
          data = await res.json();
        } catch {
          data = res.ok ? { status: "Healthy" } : { status: "Unhealthy" };
        }

        record.data = data;

        const rawStatus = (data?.status || (res.ok ? "Healthy" : "Unhealthy")).toString().toLowerCase();
        const rawEntries = data?.entries || data?.data?.entries || {};
        const hasUnhealthyEntry = Object.values(rawEntries).some((e: any) => {
          const st = (e?.status || "").toString().toLowerCase();
          return st === "unhealthy" || st === "degraded" || st === "faulted" || st === "down";
        });

        const isHealthy =
          (res.ok || res.status === 200) &&
          (rawStatus === "healthy" || rawStatus === "ok" || rawStatus === "up") &&
          !hasUnhealthyEntry;

        if (isHealthy) {
          record.status = "Healthy";
          console.log(`[SingleFlightWarmup] Service ${target.name} [${target.key}] is HEALTHY in ${record.durationMs}ms`);
        } else {
          record.status = "Failed";
          record.error = `HTTP ${res.status}: ${rawStatus}`;
          console.warn(`[SingleFlightWarmup] Service ${target.name} returned non-healthy status: ${rawStatus}`);
        }
      })
      .catch((err) => {
        const completedAt = Date.now();
        record.completedAt = completedAt;
        record.durationMs = completedAt - (record.startedAt || startTime);
        record.status = "Failed";
        record.error = err.message || "Connection failed or timed out";
        console.error(`[SingleFlightWarmup] Service ${target.name} connection error: ${record.error}`);
      })
      .finally(() => {
        state.isAllHealthy = Object.values(state.services).every((s) => s.status === "Healthy");
      });
  });
}
