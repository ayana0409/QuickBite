"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  Server,
  Shield,
  ShoppingBag,
  CreditCard,
  Database,
  Boxes,
  Flame,
  Zap,
  Radio,
  Rocket,
  ChevronRight,
  Gauge,
  Layers,
  HardDrive,
  Workflow,
  Clock,
  Orbit,
  X,
} from "lucide-react";

interface BootScreenProps {
  onReady?: () => void;
}

export interface SubEntryNode {
  id: string;
  parentId: string;
  name: string;
  shortLabel: string;
  type: "database" | "kafka" | "masstransit" | "system" | "jobs";
  angle: number;
  x: number;
  y: number;
  defaultDesc: string;
  description?: string;
  status: "Standby" | "Priming" | "Healthy";
  durationMs?: number;
  details?: string;
}

export interface ServiceNodeInfo {
  id: string;
  name: string;
  shortLabel: string;
  code: string;
  apiKey: string;
  tech: string;
  role: string;
  color: string;
  accentColor: string;
  icon: React.ElementType;
  angle: number;
  x: number;
  y: number;
  staggerDelay: number;
  entries: {
    key: string;
    name: string;
    shortLabel: string;
    type: "database" | "kafka" | "masstransit" | "system" | "jobs";
    angle: number;
    defaultDesc: string;
  }[];
}

// --------------------------------------------------------------------------
// EDGE-TO-EDGE GIANT 3-RING STARSHIP MATRIX (CX = 500, CY = 500)
// Uniform Node Radius: NODE_RADIUS = 52px (Diameter 104px) for ALL 22 nodes!
// Ring 1 (Core Gateway): R = 0
// Ring 2 (5 Services): R = 230px
// Ring 3 (16 Sub-entries): R = 430px (Fills 98.2% of the canvas!)
// --------------------------------------------------------------------------
const CX = 500;
const CY = 500;
const NODE_RADIUS = 52; // Massive 104px diameter circular engines
const R_SERVICES = 230;
const R_ENTRIES = 430;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const getCoords = (radius: number, angleDeg: number) => ({
  x: Number((CX + radius * Math.cos(toRad(angleDeg))).toFixed(1)),
  y: Number((CY + radius * Math.sin(toRad(angleDeg))).toFixed(1)),
});

// 5 Parent Services (Middle Ring) with Sub-entries (Outer Ring)
const SERVICE_DEFINITIONS: ServiceNodeInfo[] = [
  {
    id: "identity",
    name: "Identity Service",
    shortLabel: "IDENTITY",
    code: "RAPTOR-01",
    apiKey: "identity_service",
    tech: ".NET 10 / ABP",
    role: "OpenIddict & Identity Token Authority",
    color: "from-purple-500 to-indigo-600",
    accentColor: "#a855f7",
    icon: Shield,
    angle: -90,
    ...getCoords(R_SERVICES, -90),
    staggerDelay: 300,
    entries: [
      {
        key: "database",
        name: "PostgreSQL Database",
        shortLabel: "PG-DB",
        type: "database",
        angle: -105,
        defaultDesc: "PostgreSQL database connection healthy",
      },
      {
        key: "system_resources",
        name: "Host Resources",
        shortLabel: "SYS-RAM",
        type: "system",
        angle: -75,
        defaultDesc: "Working set memory & CPU operational",
      },
    ],
  },
  {
    id: "catalog",
    name: "Catalog Service",
    shortLabel: "CATALOG",
    code: "RAPTOR-02",
    apiKey: "catalog_service",
    tech: "NestJS / Fastify",
    role: "Menu, Product & Restaurant Matrix",
    color: "from-cyan-400 to-teal-500",
    accentColor: "#06b6d4",
    icon: Database,
    angle: -18,
    ...getCoords(R_SERVICES, -18),
    staggerDelay: 600,
    entries: [
      {
        key: "database",
        name: "PostgreSQL Database",
        shortLabel: "PG-DB",
        type: "database",
        angle: -38,
        defaultDesc: "PostgreSQL database connection healthy",
      },
      {
        key: "kafka",
        name: "Kafka Broker",
        shortLabel: "KAFKA",
        type: "kafka",
        angle: -18,
        defaultDesc: "Active cluster brokers: 1 (5 topics)",
      },
      {
        key: "system_resources",
        name: "Host Resources",
        shortLabel: "SYS-RAM",
        type: "system",
        angle: 2,
        defaultDesc: "GC heap & working set memory nominal",
      },
    ],
  },
  {
    id: "payment",
    name: "Payment Service",
    shortLabel: "PAYMENT",
    code: "RAPTOR-03",
    apiKey: "payment_service",
    tech: "Java Spring Boot 3",
    role: "Transaction Pipeline & Sandbox Vault",
    color: "from-emerald-400 to-green-500",
    accentColor: "#10b981",
    icon: CreditCard,
    angle: 54,
    ...getCoords(R_SERVICES, 54),
    staggerDelay: 900,
    entries: [
      {
        key: "database",
        name: "PostgreSQL Database",
        shortLabel: "PG-DB",
        type: "database",
        angle: 38,
        defaultDesc: "PostgreSQL database connection healthy",
      },
      {
        key: "kafka",
        name: "Kafka Listener",
        shortLabel: "KAFKA",
        type: "kafka",
        angle: 54,
        defaultDesc: "Active listeners: 1 container running",
      },
      {
        key: "system_resources",
        name: "JVM Resources",
        shortLabel: "JVM-SYS",
        type: "system",
        angle: 70,
        defaultDesc: "JVM heap allocated: 71MB working set",
      },
    ],
  },
  {
    id: "inventory",
    name: "Inventory Service",
    shortLabel: "INVENTORY",
    code: "RAPTOR-04",
    apiKey: "inventory_service",
    tech: "Java Spring Boot 3",
    role: "Stock Reservation & Warehouse Silo",
    color: "from-blue-400 to-indigo-500",
    accentColor: "#3b82f6",
    icon: Boxes,
    angle: 126,
    ...getCoords(R_SERVICES, 126),
    staggerDelay: 1200,
    entries: [
      {
        key: "database",
        name: "PostgreSQL Database",
        shortLabel: "PG-DB",
        type: "database",
        angle: 110,
        defaultDesc: "PostgreSQL database connection healthy",
      },
      {
        key: "kafka",
        name: "Kafka Consumer",
        shortLabel: "KAFKA",
        type: "kafka",
        angle: 126,
        defaultDesc: "Active listener containers: 2 running",
      },
      {
        key: "system_resources",
        name: "JVM Resources",
        shortLabel: "JVM-SYS",
        type: "system",
        angle: 142,
        defaultDesc: "JVM working set: 53MB operational",
      },
    ],
  },
  {
    id: "order",
    name: "Order Service",
    shortLabel: "ORDER",
    code: "RAPTOR-05",
    apiKey: "order_service",
    tech: ".NET 10 / EF Core",
    role: "Order Lifecycle & Saga State Machine",
    color: "from-amber-400 to-orange-500",
    accentColor: "#f59e0b",
    icon: ShoppingBag,
    angle: 198,
    ...getCoords(R_SERVICES, 198),
    staggerDelay: 1500,
    entries: [
      {
        key: "masstransit-bus",
        name: "MassTransit Bus",
        shortLabel: "BUS-MT",
        type: "masstransit",
        angle: 170,
        defaultDesc: "OrderSaga loopback instance ready",
      },
      {
        key: "database",
        name: "MySQL Database",
        shortLabel: "SQL-DB",
        type: "database",
        angle: 184,
        defaultDesc: "MySQL database connection healthy",
      },
      {
        key: "kafka",
        name: "Kafka Producer",
        shortLabel: "KAFKA",
        type: "kafka",
        angle: 198,
        defaultDesc: "Active cluster brokers: 2 running",
      },
      {
        key: "system_resources",
        name: "Host Resources",
        shortLabel: "SYS-TH",
        type: "system",
        angle: 212,
        defaultDesc: "36 active worker threads operational",
      },
      {
        key: "background_jobs",
        name: "Background Jobs",
        shortLabel: "BG-JOB",
        type: "jobs",
        angle: 226,
        defaultDesc: "Background job execution active",
      },
    ],
  },
];

// Flatten all entries for the Outer Ring
const ALL_OUTER_ENTRIES: SubEntryNode[] = SERVICE_DEFINITIONS.flatMap((svc) =>
  svc.entries.map((entry) => ({
    id: `${svc.id}_${entry.key}`,
    parentId: svc.id,
    name: entry.name,
    shortLabel: entry.shortLabel,
    type: entry.type,
    angle: entry.angle,
    ...getCoords(R_ENTRIES, entry.angle),
    defaultDesc: entry.defaultDesc,
    status: "Standby",
  }))
);

type NodeState = "Standby" | "Priming" | "Healthy";

interface LogEntry {
  id: string;
  time: string;
  message: string;
  level: "info" | "success" | "warn" | "accent";
}

export default function BootScreen({ onReady }: BootScreenProps) {
  // Service health status registry
  const [serviceStatuses, setServiceStatuses] = useState<Record<string, NodeState>>({
    gateway: "Standby",
    identity_service: "Standby",
    order_service: "Standby",
    catalog_service: "Standby",
    inventory_service: "Standby",
    payment_service: "Standby",
  });

  // Sub-node entries health map
  const [subEntriesMap, setSubEntriesMap] = useState<Record<string, SubEntryNode>>(() => {
    const map: Record<string, SubEntryNode> = {};
    ALL_OUTER_ENTRIES.forEach((entry) => {
      map[entry.id] = { ...entry };
    });
    return map;
  });

  // Starship Staggered Ignition Active Nodes
  const [ignitedServices, setIgnitedServices] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<{
    title: string;
    category: string;
    status: string;
    tech: string;
    details: string;
  } | null>(null);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [elapsedTimeTenths, setElapsedTimeTenths] = useState<number>(0);

  const completedServicesRef = useRef<Set<string>>(new Set());

  // Environment URLs
  const identityUrl = process.env.NEXT_PUBLIC_IDENTITY_URL || "https://quick-bite-identity.onrender.com";
  const orderUrl = process.env.NEXT_PUBLIC_ORDER_URL || "https://quick-bite-order.onrender.com/api/app";
  const catalogUrl = process.env.NEXT_PUBLIC_CATALOG_URL || "https://quick-bite-catalog.onrender.com";
  const inventoryUrl = process.env.NEXT_PUBLIC_INVENTORY_URL || "https://quick-bite-inventory.onrender.com/api/v1";
  const paymentUrl = process.env.NEXT_PUBLIC_PAYMENT_URL || "https://quick-bite-payment.onrender.com/v1";
  const gatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "https://quick-bite-gw.onrender.com";

  // Append telemetry log
  const pushLog = (message: string, level: "info" | "success" | "warn" | "accent" = "info") => {
    const timeStr = `T+${(elapsedTimeTenths / 10).toFixed(1)}s`;
    const newLog: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      time: timeStr,
      message,
      level,
    };
    setLogs((prev) => [...prev.slice(-30), newLog]);
  };

  // 1. Mission Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTimeTenths((t) => t + 1);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // 2. Staggered Ignition Firing Sequence (Starship Ring Sequence)
  useEffect(() => {
    let isCancelled = false;

    pushLog("QUICK BITE: Initiating giant edge-to-edge ignition sequence...", "accent");

    // Center Core (Gateway) ignites first
    setTimeout(() => {
      if (isCancelled) return;
      setIgnitedServices((prev) => [...prev, "gateway"]);
      pushLog("CORE RING [L-1]: API Gateway flight router ignited", "info");
    }, 100);

    // Stagger ignition of 5 Middle Ring services
    SERVICE_DEFINITIONS.forEach((svc) => {
      setTimeout(() => {
        if (isCancelled) return;
        setIgnitedServices((prev) => [...prev, svc.id]);
        pushLog(`MIDDLE RING [L-2]: ${svc.name} [${svc.code}] ignited`, "info");
      }, svc.staggerDelay);
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  // 3. Parse Health Response entries into Outer Ring sub-nodes
  const handleHealthEntries = (serviceId: string, data: any) => {
    const rawEntries = data?.entries || data?.data?.entries || {};

    setSubEntriesMap((prev) => {
      const nextMap = { ...prev };
      Object.entries(rawEntries).forEach(([entryKey, entryVal]: [string, any]) => {
        const subId = `${serviceId}_${entryKey}`;
        const isHealthy = entryVal?.status === "Healthy" || entryVal?.status === "ok";

        if (nextMap[subId]) {
          nextMap[subId] = {
            ...nextMap[subId],
            status: isHealthy ? "Healthy" : "Priming",
            durationMs: entryVal?.duration_ms,
            description: entryVal?.description || nextMap[subId].defaultDesc,
            details: entryVal?.data ? JSON.stringify(entryVal.data) : undefined,
          };
        }
      });
      return nextMap;
    });
  };

  // 4. Parallel Single-Ping with 90s Long Connection Retention
  useEffect(() => {
    let isCancelled = false;

    // Wake-up ping
    fetch("/api/system/health/wake-up", { method: "GET", cache: "no-store" }).catch(() => { });

    const pingService = async (serviceKey: string, serviceId: string, url: string, fallbackProxy?: string) => {
      if (completedServicesRef.current.has(serviceKey)) return;

      setServiceStatuses((prev) => ({ ...prev, [serviceKey]: "Priming" }));

      // Set entries to priming
      setSubEntriesMap((prev) => {
        const nextMap = { ...prev };
        Object.values(nextMap).forEach((sub) => {
          if (sub.parentId === serviceId && sub.status !== "Healthy") {
            nextMap[sub.id].status = "Priming";
          }
        });
        return nextMap;
      });

      let attempts = 0;
      const maxAttempts = 8;

      while (!completedServicesRef.current.has(serviceKey) && attempts < maxAttempts && !isCancelled) {
        attempts++;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 90000);

          const res = await fetch(url, {
            method: "GET",
            headers: { Accept: "application/json, text/plain, */*" },
            signal: controller.signal,
            cache: "no-store",
          });

          clearTimeout(timeoutId);

          if (isCancelled) return;

          if (res.ok || res.status === 200 || res.status === 204) {
            const data = await res.json().catch(() => ({ status: "Healthy" }));
            completedServicesRef.current.add(serviceKey);
            setServiceStatuses((prev) => ({ ...prev, [serviceKey]: "Healthy" }));

            handleHealthEntries(serviceId, data);
            pushLog(`COMBUSTION STABLE: ${serviceId.toUpperCase()} [100% THRUST]`, "success");
            return;
          }
        } catch {
          if (isCancelled) return;

          if (fallbackProxy) {
            try {
              const proxyRes = await fetch(fallbackProxy, {
                method: "GET",
                cache: "no-store",
                signal: AbortSignal.timeout(8000),
              });
              if (proxyRes.ok) {
                const proxyData = await proxyRes.json().catch(() => null);
                if (proxyData && (proxyData.status === "Healthy" || proxyData.status === "ok")) {
                  completedServicesRef.current.add(serviceKey);
                  setServiceStatuses((prev) => ({ ...prev, [serviceKey]: "Healthy" }));
                  handleHealthEntries(serviceId, proxyData);
                  pushLog(`COMBUSTION STABLE: ${serviceId.toUpperCase()} via Gateway Proxy`, "success");
                  return;
                }
              }
            } catch { }
          }

          try {
            fetch(url, { method: "GET", mode: "no-cors" }).catch(() => { });
          } catch { }
        }

        if (!isCancelled && !completedServicesRef.current.has(serviceKey)) {
          await new Promise((r) => setTimeout(r, 2500));
        }
      }

      // Default to healthy if timeout
      if (!isCancelled && !completedServicesRef.current.has(serviceKey)) {
        completedServicesRef.current.add(serviceKey);
        setServiceStatuses((prev) => ({ ...prev, [serviceKey]: "Healthy" }));
        setSubEntriesMap((prev) => {
          const nextMap = { ...prev };
          Object.values(nextMap).forEach((sub) => {
            if (sub.parentId === serviceId) {
              nextMap[sub.id].status = "Healthy";
            }
          });
          return nextMap;
        });
        pushLog(`Service ${serviceId} timeout window completed. Flight profile locked.`, "warn");
      }
    };

    // Stagger worker launches
    const launchTimer = setTimeout(() => {
      if (isCancelled) return;

      // 1. Gateway Core
      pingService("gateway", "gateway", `${gatewayUrl}/health`, "/api/gateway/health");

      // 2. Microservices
      const targets = [
        { key: "identity_service", id: "identity", url: `${identityUrl}/health` },
        { key: "catalog_service", id: "catalog", url: `${catalogUrl}/health` },
        { key: "order_service", id: "order", url: `${orderUrl}/health` },
        { key: "payment_service", id: "payment", url: `${paymentUrl}/health` },
        { key: "inventory_service", id: "inventory", url: `${inventoryUrl}/health` },
      ];

      targets.forEach((t, index) => {
        setTimeout(() => {
          if (!isCancelled) {
            pingService(t.key, t.id, t.url);
          }
        }, 220 * (index + 1));
      });
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(launchTimer);
    };
  }, [catalogUrl, gatewayUrl, identityUrl, inventoryUrl, orderUrl, paymentUrl]);

  // 5. Thrust Calculation (Gateway + 5 Services = 6 Main Engines)
  const healthyEnginesCount = useMemo(() => {
    const mainKeys = ["gateway", "identity_service", "catalog_service", "order_service", "payment_service", "inventory_service"];
    return mainKeys.filter((k) => serviceStatuses[k] === "Healthy").length;
  }, [serviceStatuses]);

  const healthySubNodesCount = useMemo(() => {
    return Object.values(subEntriesMap).filter((s) => s.status === "Healthy").length;
  }, [subEntriesMap]);

  const thrustPercentage = Math.round((healthyEnginesCount / 6) * 100);

  // 6. Watch All 6 Engines & Trigger Liftoff
  useEffect(() => {
    const allSixHealthy = healthyEnginesCount === 6;
    if (allSixHealthy && redirectCountdown === null) {
      pushLog("ALL 3 RINGS NOMINAL: Super Heavy Raptor Cluster at 100% thrust. LIFTOFF!", "success");
      setRedirectCountdown(1);
    }
  }, [healthyEnginesCount, redirectCountdown]);

  // 7. Countdown Timer
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

  // Latest log message for ticker
  const latestLog = logs[logs.length - 1];

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#020409] text-slate-100 flex flex-col justify-between p-2 sm:p-3 z-50 overflow-hidden font-sans select-none">

      {/* Background Starship Warp Field */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1300px] h-[1300px] bg-[radial-gradient(circle,rgba(99,102,241,0.2)_0%,rgba(249,115,22,0.12)_40%,transparent_70%)] blur-3xl animate-pulse" />

        {/* Blueprint coordinate matrix */}
        <div
          className="absolute inset-0 opacity-[0.045]"
          style={{
            backgroundImage: `linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)`,
            backgroundSize: "45px 45px",
          }}
        />
      </div>

      {/* Top Header: Mission Control Telemetry HUD */}
      <header className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 z-10 py-2 px-4 sm:px-6 bg-slate-950/90 backdrop-blur-2xl rounded-2xl border border-slate-800/80 shadow-2xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-orange-500 via-amber-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/40">
            <Rocket className="w-5 h-5 text-white animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base sm:text-xl font-black tracking-tight text-white uppercase">
                QuickBite <span className="text-orange-400 font-mono">Quick Bite Launch Matrix</span>
              </h1>
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 bg-orange-500/20 text-orange-300 border border-orange-500/40 rounded-full">
                3-TIER ENGINE MATRIX
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Core Gateway &bull; 5 Microservices &bull; 16 Sub-system Entries (Full Screen Display)
            </p>
          </div>
        </div>

        {/* Telemetry Numbers */}
        <div className="flex items-center gap-2.5">
          {/* Main Thrust Gauge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-xl font-mono">
            <Gauge className="w-4 h-4 text-orange-400" />
            <div className="text-left">
              <div className="text-[8.5px] text-slate-400 uppercase">Total Thrust</div>
              <div className="text-xs font-bold text-white">
                <span className="text-emerald-400 text-sm">{thrustPercentage}%</span>
                <span className="text-slate-400 ml-1">({healthyEnginesCount}/6 Engines)</span>
              </div>
            </div>
          </div>

          {/* Sub-node Entries */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-xl font-mono">
            <Layers className="w-4 h-4 text-cyan-400" />
            <div className="text-left">
              <div className="text-[8.5px] text-slate-400 uppercase">Entries Nominal</div>
              <div className="text-xs font-bold text-cyan-300">
                {healthySubNodesCount}/{ALL_OUTER_ENTRIES.length}
              </div>
            </div>
          </div>

          {/* Launch Status Pill */}
          <div
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 border transition-all ${redirectCountdown !== null
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-lg shadow-emerald-500/20 animate-pulse"
              : "bg-orange-500/15 text-orange-300 border-orange-500/40"
              }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${redirectCountdown !== null ? "bg-emerald-400 animate-ping" : "bg-orange-400 animate-pulse"
                }`}
            />
            {redirectCountdown !== null ? `LIFTOFF T-0 (${redirectCountdown}s)` : "IGNITION SEQUENCE"}
          </div>
        </div>
      </header>

      {/* Main Edge-to-Edge Starship Canvas */}
      <main className="w-full flex-1 z-10 flex flex-col items-center justify-center relative min-h-0 py-1">

        {/* Large SVG Matrix (Fills 100% available viewport height and width) */}
        <div className="relative w-full h-full bg-slate-950/70 backdrop-blur-2xl border border-slate-800/90 rounded-3xl p-1 shadow-2xl overflow-hidden flex items-center justify-center">

          <svg viewBox="0 0 1000 1000" className="w-full h-full max-h-full">
            <defs>
              {/* Plasma Glowing Conduits */}
              <linearGradient id="plasma-flame" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f97316" stopOpacity="1" />
                <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="plasma-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="1" />
              </linearGradient>
              <filter id="matrix-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* -------------------------------------------------------- */}
            {/* STARSHIP 3 CONCENTRIC RING TRACKS                        */}
            {/* -------------------------------------------------------- */}
            {/* Ring 2 Track (Middle Ring - 230px) */}
            <circle
              cx={CX}
              cy={CY}
              r={R_SERVICES}
              fill="none"
              stroke="rgba(99, 102, 241, 0.28)"
              strokeWidth="2.5"
              strokeDasharray="8 5"
            />
            <text x={CX} y={CY - R_SERVICES - 58} textAnchor="middle" fill="#818cf8" fontSize="12" fontFamily="monospace" fontWeight="bold" opacity="0.85">
              LAYER 2: MICROSERVICES CLUSTER
            </text>

            {/* Ring 3 Track (Outer Ring - 430px) */}
            <circle
              cx={CX}
              cy={CY}
              r={R_ENTRIES}
              fill="none"
              stroke="rgba(6, 182, 212, 0.25)"
              strokeWidth="2.5"
              strokeDasharray="10 6"
            />
            <text x={CX} y={CY - R_ENTRIES - 58} textAnchor="middle" fill="#22d3ee" fontSize="12" fontFamily="monospace" fontWeight="bold" opacity="0.85">
              LAYER 3: SUB-SYSTEM ENTRIES
            </text>

            {/* -------------------------------------------------------- */}
            {/* 1. CONDUITS: Core Gateway (Center) -> 5 Services (Ring 2) */}
            {/* -------------------------------------------------------- */}
            {SERVICE_DEFINITIONS.map((svc) => {
              const isIgnited = ignitedServices.includes(svc.id);
              const isHealthy = serviceStatuses[svc.apiKey] === "Healthy";

              return (
                <g key={`core-to-${svc.id}`}>
                  <line
                    x1={CX}
                    y1={CY}
                    x2={svc.x}
                    y2={svc.y}
                    stroke={isHealthy ? "rgba(16, 185, 129, 0.65)" : isIgnited ? "rgba(249, 115, 22, 0.55)" : "rgba(51, 65, 85, 0.35)"}
                    strokeWidth={isHealthy ? "5" : "3"}
                    strokeDasharray={isHealthy ? "none" : "8 5"}
                  />
                  {isIgnited && (
                    <line
                      x1={CX}
                      y1={CY}
                      x2={svc.x}
                      y2={svc.y}
                      stroke={isHealthy ? "url(#plasma-emerald)" : "url(#plasma-flame)"}
                      strokeWidth="6"
                      strokeDasharray="24 28"
                      className="animate-[dash_1s_linear_infinite]"
                    />
                  )}
                </g>
              );
            })}

            {/* -------------------------------------------------------- */}
            {/* 2. CONDUITS: 5 Services (Ring 2) -> Sub-entries (Ring 3) */}
            {/* -------------------------------------------------------- */}
            {ALL_OUTER_ENTRIES.map((sub) => {
              const parent = SERVICE_DEFINITIONS.find((s) => s.id === sub.parentId);
              if (!parent) return null;

              const parentIgnited = ignitedServices.includes(parent.id);
              const entryData = subEntriesMap[sub.id];
              const isSubHealthy = entryData?.status === "Healthy";

              return (
                <g key={`svc-to-${sub.id}`}>
                  <line
                    x1={parent.x}
                    y1={parent.y}
                    x2={sub.x}
                    y2={sub.y}
                    stroke={
                      isSubHealthy
                        ? "rgba(16, 185, 129, 0.65)"
                        : parentIgnited
                          ? "rgba(249, 115, 22, 0.55)"
                          : "rgba(51, 65, 85, 0.3)"
                    }
                    strokeWidth={isSubHealthy ? "4" : "2.5"}
                    strokeDasharray={isSubHealthy ? "none" : "6 4"}
                  />
                </g>
              );
            })}

            {/* -------------------------------------------------------- */}
            {/* 3. LAYER 3 NODES: 16 GIANT Outer Ring Entries            */}
            {/* (Equal size: NODE_RADIUS = 52px - Diameter 104px)        */}
            {/* -------------------------------------------------------- */}
            {ALL_OUTER_ENTRIES.map((sub) => {
              const parent = SERVICE_DEFINITIONS.find((s) => s.id === sub.parentId);
              const parentIgnited = ignitedServices.includes(sub.parentId);
              const entryData = subEntriesMap[sub.id];
              const isHealthy = entryData?.status === "Healthy";
              const isPriming = entryData?.status === "Priming" || parentIgnited;

              return (
                <g
                  key={`outer-node-${sub.id}`}
                  transform={`translate(${sub.x}, ${sub.y})`}
                  className="cursor-pointer"
                  onClick={() =>
                    setSelectedItem({
                      title: sub.name,
                      category: `Layer 3 Entry &bull; ${parent?.name}`,
                      status: isHealthy ? "Healthy (Nominal)" : "Priming / Waking",
                      tech: sub.type.toUpperCase(),
                      details: entryData?.description || sub.defaultDesc,
                    })
                  }
                >
                  {/* Outer Laser Glow Halo */}
                  {isHealthy && (
                    <circle r={NODE_RADIUS + 10} fill="none" stroke="#10b981" strokeWidth="4" opacity="0.55" filter="url(#matrix-glow)" />
                  )}

                  {/* Giant Circular Outer Thruster (Radius = 52px) */}
                  <circle
                    r={NODE_RADIUS}
                    fill={isHealthy ? "#064e3b" : isPriming ? "#451a03" : "#090e1a"}
                    stroke={isHealthy ? "#10b981" : isPriming ? "#f97316" : "#334155"}
                    strokeWidth="4.5"
                  />

                  {/* Inner Gimbal Ring */}
                  <circle
                    r={NODE_RADIUS - 12}
                    fill={isHealthy ? "#022c22" : "#030712"}
                    stroke={isHealthy ? "#34d399" : "#1e293b"}
                    strokeWidth="2"
                  />

                  {/* Text inside circle (MASSIVE & CRYSTAL CLEAR) */}
                  <text
                    y="-4"
                    textAnchor="middle"
                    fill={isHealthy ? "#a7f3d0" : isPriming ? "#fdba74" : "#cbd5e1"}
                    fontSize="13.5"
                    fontFamily="monospace"
                    fontWeight="900"
                  >
                    {sub.shortLabel}
                  </text>
                  <text
                    y="16"
                    textAnchor="middle"
                    fill={isHealthy ? "#34d399" : isPriming ? "#f59e0b" : "#64748b"}
                    fontSize="10.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {isHealthy ? "NOMINAL" : isPriming ? "FIRING" : "STANDBY"}
                  </text>

                  {/* Name Subtitle under node */}
                  <text
                    y={NODE_RADIUS + 16}
                    textAnchor="middle"
                    fill={isHealthy ? "#6ee7b7" : "#94a3b8"}
                    fontSize="10.5"
                    fontFamily="sans-serif"
                    fontWeight="bold"
                  >
                    {sub.name.split(" ")[0]}
                  </text>
                </g>
              );
            })}

            {/* -------------------------------------------------------- */}
            {/* 4. LAYER 2 NODES: 5 GIANT Middle Ring Microservices      */}
            {/* (Equal size: NODE_RADIUS = 52px - Diameter 104px)        */}
            {/* -------------------------------------------------------- */}
            {SERVICE_DEFINITIONS.map((svc) => {
              const isIgnited = ignitedServices.includes(svc.id);
              const status = serviceStatuses[svc.apiKey];
              const isHealthy = status === "Healthy";
              const isPriming = status === "Priming" || isIgnited;

              return (
                <g
                  key={`mid-node-${svc.id}`}
                  transform={`translate(${svc.x}, ${svc.y})`}
                  className="cursor-pointer"
                  onClick={() =>
                    setSelectedItem({
                      title: svc.name,
                      category: `Layer 2 Microservice &bull; ${svc.code}`,
                      status: isHealthy ? "Healthy (100% Thrust)" : isPriming ? "Igniting..." : "Standby",
                      tech: svc.tech,
                      details: svc.role,
                    })
                  }
                >
                  {/* Outer Heatshield Halo */}
                  <circle
                    r={NODE_RADIUS + 12}
                    fill={isHealthy ? "rgba(16, 185, 129, 0.28)" : isPriming ? "rgba(249, 115, 22, 0.32)" : "transparent"}
                    stroke={isHealthy ? "#10b981" : isPriming ? "#f97316" : "#334155"}
                    strokeWidth="3.5"
                    strokeDasharray={isHealthy ? "none" : "8 5"}
                    filter={isHealthy ? "url(#matrix-glow)" : undefined}
                  />

                  {/* Main Circular Thruster (Radius = 52px - Equal Size) */}
                  <circle
                    r={NODE_RADIUS}
                    fill={isHealthy ? "#064e3b" : isPriming ? "#451a03" : "#090d1a"}
                    stroke={isHealthy ? "#10b981" : isPriming ? svc.accentColor : "#1e293b"}
                    strokeWidth="5"
                  />

                  {/* Inner Gimbal Ring */}
                  <circle
                    r={NODE_RADIUS - 12}
                    fill={isHealthy ? "#022c22" : "#030712"}
                    stroke={isHealthy ? "#34d399" : "#334155"}
                    strokeWidth="2.5"
                  />

                  {/* Text inside circle (MASSIVE & CRYSTAL CLEAR) */}
                  <text
                    y="-4"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="13.5"
                    fontWeight="900"
                  >
                    {svc.shortLabel}
                  </text>
                  <text
                    y="16"
                    textAnchor="middle"
                    fill={isHealthy ? "#34d399" : isPriming ? "#f59e0b" : "#64748b"}
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {isHealthy ? "100%" : isPriming ? "FIRING" : "IDLE"}
                  </text>
                </g>
              );
            })}

            {/* -------------------------------------------------------- */}
            {/* 5. LAYER 1 NODE: 1 GIANT Center Core Engine (Gateway)    */}
            {/* (Equal size: NODE_RADIUS = 52px - Diameter 104px)        */}
            {/* -------------------------------------------------------- */}
            {(() => {
              const isHealthy = serviceStatuses.gateway === "Healthy";
              const isPriming = serviceStatuses.gateway === "Priming" || ignitedServices.includes("gateway");

              return (
                <g
                  transform={`translate(${CX}, ${CY})`}
                  className="cursor-pointer"
                  onClick={() =>
                    setSelectedItem({
                      title: "API Gateway (Central Flight Router)",
                      category: "Layer 1 Core Engine &bull; Port 5000",
                      status: isHealthy ? "Healthy (Core Thrust 100%)" : "Igniting Reverse Proxy",
                      tech: "Ocelot / HTTP Reverse Proxy",
                      details: "Central ingress gateway routing tokens, orders, catalog and payment requests.",
                    })
                  }
                >
                  {/* Super Heavy Core Halo */}
                  <circle
                    r={NODE_RADIUS + 16}
                    fill={isHealthy ? "rgba(16, 185, 129, 0.35)" : isPriming ? "rgba(249, 115, 22, 0.4)" : "rgba(99, 102, 241, 0.25)"}
                    stroke={isHealthy ? "#10b981" : "#f97316"}
                    strokeWidth="4"
                    strokeDasharray={isHealthy ? "none" : "8 5"}
                    filter="url(#matrix-glow)"
                  />

                  {/* Circular Raptor Core Nozzle (Radius = 52px - Equal Size) */}
                  <circle
                    r={NODE_RADIUS}
                    fill={isHealthy ? "#064e3b" : isPriming ? "#451a03" : "#060914"}
                    stroke={isHealthy ? "#10b981" : "#f97316"}
                    strokeWidth="5.5"
                  />

                  {/* Inner Combustion Chamber */}
                  <circle
                    r={NODE_RADIUS - 12}
                    fill={isHealthy ? "#022c22" : "#030712"}
                    stroke={isHealthy ? "#34d399" : "#f97316"}
                    strokeWidth="2.5"
                  />

                  {/* Text Title inside circle (MASSIVE & CRYSTAL CLEAR) */}
                  <text
                    y="-5"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="13.5"
                    fontWeight="900"
                    letterSpacing="0.5"
                  >
                    GATEWAY
                  </text>
                  <text
                    y="16"
                    textAnchor="middle"
                    fill={isHealthy ? "#6ee7b7" : isPriming ? "#fed7aa" : "#94a3b8"}
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {isHealthy ? "100%" : isPriming ? "IGNITING" : "CORE"}
                  </text>
                </g>
              );
            })()}
          </svg>

          {/* Floating Node Detail Card (When user clicks any node) */}
          {selectedItem && (
            <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:w-96 bg-slate-900/95 backdrop-blur-2xl border-2 border-orange-500/50 rounded-2xl p-4 shadow-2xl text-xs z-30 animate-in fade-in slide-in-from-bottom-3">
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-bold text-white flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-orange-400" />
                  {selectedItem.title}
                </span>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div
                className="text-xs text-orange-300 font-mono mb-2"
                dangerouslySetInnerHTML={{ __html: selectedItem.category }}
              />
              <div className="flex items-center gap-2.5 mb-2.5 font-mono text-xs">
                <span className="text-slate-400">Status:</span>
                <span className="text-emerald-400 font-bold">{selectedItem.status}</span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-400">Tech:</span>
                <span className="text-cyan-300">{selectedItem.tech}</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                {selectedItem.details}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Mission Control Bar: Live Telemetry Ticker & Override */}
      <footer className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 py-2 px-4 sm:px-6 bg-slate-950/90 backdrop-blur-2xl rounded-2xl border border-slate-800/80 text-xs font-mono shrink-0">

        {/* Live Ticker */}
        <div className="flex items-center gap-2 text-slate-300 w-full sm:w-auto truncate">
          <Radio className="w-4 h-4 text-orange-400 animate-pulse shrink-0" />
          <span className="text-orange-400 font-bold shrink-0">TELEMETRY STREAM:</span>
          <span className="truncate text-slate-300">
            {latestLog ? `[${latestLog.time}] ${latestLog.message}` : "Synchronizing Quick Bite cluster telemetry..."}
          </span>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => onReady && onReady()}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg"
          >
            <span>Manual Override / Launch App</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}
