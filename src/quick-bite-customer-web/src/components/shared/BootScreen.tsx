"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Server,
  Shield,
  ShoppingBag,
  CreditCard,
  Database,
  Boxes,
  Utensils,
  Activity,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from "lucide-react";

interface BootScreenProps {
  onReady?: () => void;
}

interface ServiceNode {
  id: string;
  name: string;
  apiKey: string;
  tech: string;
  color: string;
  icon: React.ElementType;
  x: number;
  y: number;
}

const SERVICES: ServiceNode[] = [
  {
    id: "identity",
    name: "Identity",
    apiKey: "identity_service",
    tech: ".NET 8",
    color: "from-purple-500 to-indigo-600",
    icon: Shield,
    x: 20,
    y: 20,
  },
  {
    id: "catalog",
    name: "Catalog",
    apiKey: "catalog_service",
    tech: "NestJS",
    color: "from-cyan-400 to-teal-500",
    icon: Database,
    x: 80,
    y: 20,
  },
  {
    id: "order",
    name: "Order",
    apiKey: "order_service",
    tech: ".NET 8",
    color: "from-amber-400 to-orange-500",
    icon: ShoppingBag,
    x: 18,
    y: 80,
  },
  {
    id: "payment",
    name: "Payment",
    apiKey: "payment_service",
    tech: "Java Spring",
    color: "from-emerald-400 to-green-500",
    icon: CreditCard,
    x: 82,
    y: 80,
  },
  {
    id: "inventory",
    name: "Inventory",
    apiKey: "inventory_service",
    tech: "Java Spring",
    color: "from-blue-400 to-indigo-500",
    icon: Boxes,
    x: 50,
    y: 88,
  },
];

export default function BootScreen({ onReady }: BootScreenProps) {
  const [attempts, setAttempts] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>(
    "Đang đánh thức toàn bộ hệ thống Microservices & API Gateway..."
  );
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [litNodes, setLitNodes] = useState<string[]>(["gateway"]);
  const [serviceStatuses, setServiceStatuses] = useState<
    Record<string, "Healthy" | "Degraded" | "Unhealthy" | "Pending">
  >({
    gateway: "Pending",
    identity_service: "Pending",
    order_service: "Pending",
    catalog_service: "Pending",
    inventory_service: "Pending",
    payment_service: "Pending",
  });

  const animationRef = useRef<any>(null);

  // Map serviceKey -> URLs from environment variables (identical to Admin Portal)
  const identityUrl = process.env.NEXT_PUBLIC_IDENTITY_URL || "https://quick-bite-identity.onrender.com";
  const orderUrl = process.env.NEXT_PUBLIC_ORDER_URL || "https://quick-bite-order.onrender.com/api/app";
  const catalogUrl = process.env.NEXT_PUBLIC_CATALOG_URL || "https://quick-bite-catalog.onrender.com";
  const inventoryUrl = process.env.NEXT_PUBLIC_INVENTORY_URL || "https://quick-bite-inventory.onrender.com/api/v1";
  const paymentUrl = process.env.NEXT_PUBLIC_PAYMENT_URL || "https://quick-bite-payment.onrender.com/v1";
  const gatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "https://quick-bite-gw.onrender.com";

  const SERVICE_URLS: Record<string, string[]> = {
    identity_service: [
      identityUrl,
      `${identityUrl}/health`,
      `${identityUrl}/api/health`,
    ].filter(Boolean),
    order_service: [
      orderUrl,
      `${orderUrl}/health`,
      `${orderUrl}/api/app/health`,
    ].filter(Boolean),
    catalog_service: [
      catalogUrl,
      `${catalogUrl}/health`,
      `${catalogUrl}/api/health`,
    ].filter(Boolean),
    inventory_service: [
      inventoryUrl,
      `${inventoryUrl}/health`,
      `${inventoryUrl}/api/v1/health`,
      `${inventoryUrl}/v1/health`,
    ].filter(Boolean),
    payment_service: [
      paymentUrl,
      `${paymentUrl}/health`,
      `${paymentUrl}/v1/health`,
    ].filter(Boolean),
  };

  // 1. Anime.js Topology Motion Effects (Universal v3 & v4 compatibility)
  useEffect(() => {
    let isSubscribed = true;

    import("animejs")
      .then((animeModule: any) => {
        if (!isSubscribed) return;

        const animateFn =
          typeof animeModule.animate === "function"
            ? animeModule.animate
            : typeof animeModule.default === "function"
            ? (target: any, params: any) => animeModule.default({ targets: target, ...params })
            : typeof animeModule === "function"
            ? (target: any, params: any) => animeModule({ targets: target, ...params })
            : null;

        const staggerFn =
          typeof animeModule.stagger === "function"
            ? animeModule.stagger
            : typeof animeModule.default?.stagger === "function"
            ? animeModule.default.stagger
            : (val: number) => (_el: any, i: number) => i * val;

        if (!animateFn) return;

        try {
          // Pulse Gateway
          animationRef.current = animateFn("#gateway-center-node", {
            scale: [0.96, 1.08],
            rotate: [-1, 1],
            direction: "alternate",
            loop: true,
            easing: "easeInOutSine",
            duration: 1300,
          });

          // Particles
          animateFn(".cyber-particle", {
            translateY: [-25, 25],
            translateX: [-25, 25],
            scale: [0.7, 1.2],
            opacity: [0.2, 0.6],
            direction: "alternate",
            loop: true,
            easing: "easeInOutQuad",
            duration: 3500,
            delay: staggerFn(250),
          });

          // Laser lines
          animateFn(".topology-dash-line", {
            strokeDashoffset: [24, 0],
            easing: "linear",
            duration: 1800,
            delay: staggerFn(180),
            loop: true,
          });
        } catch {
          // Ignore animation init errors
        }
      })
      .catch(() => {});

    return () => {
      isSubscribed = false;
      if (animationRef.current && typeof animationRef.current.pause === "function") {
        animationRef.current.pause();
      }
    };
  }, []);

  // 2. Sequential Lighting Animation
  useEffect(() => {
    let active = true;

    const t1 = setTimeout(() => {
      if (active) setLitNodes(["gateway", "identity", "catalog"]);
    }, 800);

    const t2 = setTimeout(() => {
      if (active) setLitNodes(["gateway", "identity", "catalog", "order", "payment", "inventory"]);
    }, 1800);

    return () => {
      active = false;
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // 3. Direct Parallel Pinging to ALL Services + Gateway Polling (Same as Admin Portal)
  useEffect(() => {
    let isCancelled = false;
    let gatewayTimer: ReturnType<typeof setTimeout> | null = null;

    // Trigger server-side wake-up ping across all services
    fetch("/api/system/health/wake-up", { method: "GET", cache: "no-store" }).catch(() => {});

    // Poll Gateway continuously
    const pollGateway = async () => {
      try {
        const res = await fetch("/api/gateway/health", { method: "GET", cache: "no-store" });
        if (!isCancelled && res.ok) {
          const data = await res.json().catch(() => null);
          if (data && (data.status === "Healthy" || data.status === "ok")) {
            setServiceStatuses((prev) => ({ ...prev, gateway: "Healthy" }));
          }
        }
      } catch {
        // Fallback polling
      } finally {
        if (!isCancelled) {
          gatewayTimer = setTimeout(pollGateway, 3000);
        }
      }
    };

    // Direct ping to each service in parallel (wakes sleeping Render containers)
    const pingServiceDirectly = async (serviceKey: string, urls: string[]) => {
      if (!urls || urls.length === 0) {
        setServiceStatuses((prev) => ({ ...prev, [serviceKey]: "Unhealthy" }));
        return;
      }

      setServiceStatuses((prev) => ({ ...prev, [serviceKey]: "Degraded" }));
      let retries = 0;
      const maxRetries = 15;

      while (retries < maxRetries && !isCancelled) {
        for (const url of urls) {
          if (isCancelled) return;
          try {
            const res = await fetch(url, {
              method: "GET",
              headers: { Accept: "application/json, text/plain, */*" },
              signal: AbortSignal.timeout(120000), // Hold connection while Render container wakes up
            });

            if (isCancelled) return;

            // If 200 OK, container is up and healthy!
            if (res.ok) {
              setServiceStatuses((prev) => ({ ...prev, [serviceKey]: "Healthy" }));
              setAttempts((prev) => prev + 1);
              return;
            }
          } catch {
            // Also attempt no-cors ping to ensure Render wakes up container even if CORS is negotiating
            try {
              fetch(url, { method: "GET", mode: "no-cors" }).catch(() => {});
            } catch {}
          }
        }

        if (!isCancelled) {
          await new Promise((r) => setTimeout(r, 6000));
          retries++;
        }
      }

      if (!isCancelled) {
        // Default to Healthy after enough retries to prevent blocking user indefinitely
        setServiceStatuses((prev) => ({ ...prev, [serviceKey]: "Healthy" }));
      }
    };

    const initialDelay = setTimeout(() => {
      if (isCancelled) return;
      pollGateway();
      Object.entries(SERVICE_URLS).forEach(([key, urls]) => {
        pingServiceDirectly(key, urls);
      });
    }, 600);

    return () => {
      isCancelled = true;
      clearTimeout(initialDelay);
      if (gatewayTimer) clearTimeout(gatewayTimer);
    };
  }, []);

  // 4. Watch all services — when all microservices are Healthy, trigger redirect
  useEffect(() => {
    const areMicroservicesHealthy = SERVICES.every((s) => {
      const status = serviceStatuses[s.apiKey];
      return status === "Healthy";
    });

    if (areMicroservicesHealthy && redirectCountdown === null) {
      setStatusMessage("Tất cả microservices đã sẵn sàng! Đang chuyển hướng...");
      setRedirectCountdown(3);
    }
  }, [serviceStatuses, redirectCountdown]);

  // 5. Countdown timer to trigger onReady
  useEffect(() => {
    if (redirectCountdown === null) return;

    if (redirectCountdown <= 0) {
      if (onReady) onReady();
      return;
    }

    const timer = setTimeout(() => {
      setRedirectCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [redirectCountdown, onReady]);

  return (
    <div className="fixed inset-0 bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8 z-50 overflow-hidden font-sans select-none">
      {/* Background Glowing Particles */}
      <div className="cyber-particle absolute top-10 left-10 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="cyber-particle absolute top-1/2 right-10 w-80 h-80 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="cyber-particle absolute bottom-10 left-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between z-10 py-3 px-6 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Utensils className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              QuickBite <span className="text-xs text-orange-400 font-mono font-bold uppercase">Customer App</span>
            </h1>
            <p className="text-xs text-slate-400">Microservice Topology Booting System</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-full text-xs text-slate-300">
            <Activity className="w-4 h-4 text-orange-400 animate-pulse" />
            <span>Đã thức: <strong className="text-white font-mono">{attempts} / 5</strong></span>
          </div>

          <span
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border ${
              redirectCountdown !== null
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 animate-pulse"
                : "bg-orange-500/20 text-orange-300 border-orange-500/50"
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                redirectCountdown !== null ? "bg-emerald-400 animate-ping" : "bg-orange-400 animate-pulse"
              }`}
            />
            {redirectCountdown !== null
              ? `VÀO ỨNG DỤNG (${redirectCountdown}s)`
              : "ĐANG WAKE-UP"}
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-4xl mx-auto my-auto z-10 flex flex-col items-center">
        {/* Topology Diagram Container */}
        <div className="relative w-full max-w-xl h-80 sm:h-96 my-4 bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-4 shadow-2xl flex items-center justify-center">
          {/* SVG Connection Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {SERVICES.map((s) => {
              const isLit = litNodes.includes(s.id);
              return (
                <g key={s.id}>
                  {/* Background Base Line */}
                  <line
                    x1="50%"
                    y1="50%"
                    x2={`${s.x}%`}
                    y2={`${s.y}%`}
                    stroke={isLit ? "rgba(249, 115, 22, 0.4)" : "rgba(51, 65, 85, 0.4)"}
                    strokeWidth="2"
                    strokeDasharray="6 4"
                  />
                  {/* Animated Dash Overlay */}
                  {isLit && (
                    <line
                      className="topology-dash-line"
                      x1="50%"
                      y1="50%"
                      x2={`${s.x}%`}
                      y2={`${s.y}%`}
                      stroke="url(#orange-red-gradient)"
                      strokeWidth="3"
                      strokeDasharray="12 12"
                    />
                  )}
                </g>
              );
            })}
            <defs>
              <linearGradient id="orange-red-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>
          </svg>

          {/* Central API Gateway Node */}
          <div
            id="gateway-center-node"
            className="absolute z-20 w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-orange-500 via-amber-500 to-red-500 p-1 flex flex-col items-center justify-center text-center shadow-2xl transition-transform"
          >
            <div className="w-full h-full bg-slate-950/90 rounded-[22px] flex flex-col items-center justify-center p-2">
              <Server className="w-7 h-7 text-orange-400 mb-1" />
              <span className="text-[11px] font-black tracking-wide text-white uppercase">API Gateway</span>
              <span className="text-[9px] font-mono text-orange-300">Port 5000</span>
            </div>
          </div>

          {/* Microservice Nodes Surround */}
          {SERVICES.map((s) => {
            const Icon = s.icon;
            const isLit = litNodes.includes(s.id);
            const status = serviceStatuses[s.apiKey];

            return (
              <div
                key={s.id}
                style={{ left: `${s.x}%`, top: `${s.y}%` }}
                className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-700 ${
                  isLit ? "opacity-100 scale-100" : "opacity-40 scale-90"
                }`}
              >
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl p-0.5 shadow-xl transition-all duration-300 ${
                    status === "Healthy"
                      ? "bg-gradient-to-tr from-emerald-400 to-teal-500 ring-2 ring-emerald-400/50"
                      : "bg-gradient-to-tr " + s.color
                  }`}
                >
                  <div className="w-full h-full bg-slate-950/90 rounded-[14px] flex flex-col items-center justify-center p-1.5">
                    <Icon className={`w-5 h-5 ${status === "Healthy" ? "text-emerald-400" : "text-slate-200"}`} />
                    <span className="text-[10px] font-bold text-slate-100 mt-1">{s.name}</span>
                  </div>
                </div>

                <div className="mt-1 flex items-center gap-1 bg-slate-900/90 px-2 py-0.5 rounded-md border border-slate-800 shadow-md">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      status === "Healthy"
                        ? "bg-emerald-400 animate-pulse"
                        : status === "Degraded"
                        ? "bg-amber-400 animate-ping"
                        : "bg-slate-500"
                    }`}
                  />
                  <span className="text-[9px] font-mono text-slate-300">
                    {status === "Healthy" ? "Ready" : status === "Degraded" ? "Waking..." : s.tech}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Status Text & Loading Indicator */}
        <div className="mt-4 text-center space-y-2 max-w-md">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-sm font-medium text-slate-200 shadow-lg">
            {redirectCountdown !== null ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <RefreshCw className="w-4 h-4 text-orange-400 animate-spin" />
            )}
            <span>{statusMessage}</span>
          </div>

          <p className="text-xs text-slate-500">
            Do backend Free Tier tự động ngủ đông khi không có request, vui lòng chờ trong giây lát...
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto z-10 text-center py-2 text-xs text-slate-500 font-mono">
        QuickBite Customer Platform &copy; 2026 — Cold Start Mitigation Engine
      </footer>
    </div>
  );
}
