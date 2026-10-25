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
  Utensils,
  ShieldCheck,
  Check,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Coffee,
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

// ============================================================================
// BOOTSCREEN V1 (Legacy / Starship 3-Ring Matrix Visualizer)
// ============================================================================
export function BootScreenV1({ onReady }: BootScreenProps) {
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

  // Environment URLs (strictly from environment, no hardcoded URLs)
  const identityUrl = process.env.NEXT_PUBLIC_IDENTITY_URL || "";
  const orderUrl = process.env.NEXT_PUBLIC_ORDER_URL || "";
  const catalogUrl = process.env.NEXT_PUBLIC_CATALOG_URL || "";
  const inventoryUrl = process.env.NEXT_PUBLIC_INVENTORY_URL || "";
  const paymentUrl = process.env.NEXT_PUBLIC_PAYMENT_URL || "";
  const gatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "";

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

  // 4. Client Single-Flight Execution (Zero Spam, Max 1 Request per Service)
  useEffect(() => {
    let isCancelled = false;
    const formatPingUrl = (url?: string) => (url ? `${url.trim().replace(/\/+$/, '')}/` : '');

    const targets = [
      gatewayUrl ? { id: "gateway", key: "gateway", name: "API Gateway", url: `${gatewayUrl.trim().replace(/\/+$/, '')}/health` } : null,
      identityUrl ? { id: "identity", key: "identity_service", name: "Identity Service", url: formatPingUrl(identityUrl) } : null,
      orderUrl ? { id: "order", key: "order_service", name: "Order Service", url: formatPingUrl(orderUrl) } : null,
      catalogUrl ? { id: "catalog", key: "catalog_service", name: "Catalog Service", url: formatPingUrl(catalogUrl) } : null,
      paymentUrl ? { id: "payment", key: "payment_service", name: "Payment Service", url: formatPingUrl(paymentUrl) } : null,
      inventoryUrl ? { id: "inventory", key: "inventory_service", name: "Inventory Service", url: formatPingUrl(inventoryUrl) } : null,
    ].filter(Boolean) as Array<{ id: string; key: string; name: string; url: string }>;

    // Pre-mark unconfigured services as Healthy so startup is not blocked
    const allServiceKeys = ["identity_service", "order_service", "catalog_service", "payment_service", "inventory_service", "gateway"];
    const configuredKeys = new Set(targets.map((t) => t.key));
    allServiceKeys.forEach((key) => {
      if (!configuredKeys.has(key)) {
        completedServicesRef.current.add(key);
        setServiceStatuses((prev) => ({ ...prev, [key]: "Healthy" }));
      }
    });

    targets.forEach((t) => {
      // Set initial status to Priming
      setServiceStatuses((prev) => ({ ...prev, [t.key]: "Priming" }));
      setSubEntriesMap((prev) => {
        const nextMap = { ...prev };
        Object.values(nextMap).forEach((sub) => {
          if (sub.parentId === t.id && sub.status !== "Healthy") {
            nextMap[sub.id].status = "Priming";
          }
        });
        return nextMap;
      });

      // Reuse pre-warmed promise from <head> inline script, or dispatch single fetch
      const prewarmedPromise = (typeof window !== "undefined" && (window as any).__QUICKBITE_PROMISES?.[t.key])
        ? (window as any).__QUICKBITE_PROMISES[t.key]
        : fetch(t.url, {
          method: "GET",
          headers: { Accept: "application/json, text/plain, */*" },
          signal: AbortSignal.timeout(90000),
          cache: "no-store",
        }).then((r) => r.json().catch(() => ({ status: r.ok ? "Healthy" : "Unhealthy" })));

      const handleSuccess = (data: any) => {
        if (isCancelled || completedServicesRef.current.has(t.key)) return;
        completedServicesRef.current.add(t.key);
        setServiceStatuses((prev) => ({ ...prev, [t.key]: "Healthy" }));
        pushLog(`COMBUSTION STABLE: ${t.id.toUpperCase()} [100% THRUST]`, "success");
        if (data) {
          handleHealthEntries(t.id, data);
        }
      };

      prewarmedPromise
        .then((data: any) => {
          if (isCancelled) return;
          const rawStatus = (data?.status || data?.data?.status || "").toString().toLowerCase();
          const isHealthy =
            rawStatus === "healthy" ||
            rawStatus === "ok" ||
            rawStatus === "up" ||
            t.id === "gateway" ||
            data?.success === true;

          if (isHealthy) {
            handleSuccess(data);
          } else {
            // If service was booting and returned 502/503/Degraded, do a single gentle retry after 4s
            setTimeout(() => {
              if (isCancelled || completedServicesRef.current.has(t.key)) return;
              fetch(t.url, {
                method: "GET",
                headers: { Accept: "application/json, text/plain, */*" },
                signal: AbortSignal.timeout(45000),
                cache: "no-store",
              })
                .then((r) => r.json().catch(() => ({ status: r.ok ? "Healthy" : "Unhealthy" })))
                .then((retryData) => {
                  handleSuccess(retryData);
                })
                .catch(() => { });
            }, 4000);
          }
        })
        .catch(() => {
          // In case initial promise timed out or connection dropped, single retry
          setTimeout(() => {
            if (isCancelled || completedServicesRef.current.has(t.key)) return;
            fetch(t.url, {
              method: "GET",
              headers: { Accept: "application/json, text/plain, */*" },
              signal: AbortSignal.timeout(45000),
              cache: "no-store",
            })
              .then((r) => r.json().catch(() => ({ status: r.ok ? "Healthy" : "Unhealthy" })))
              .then((retryData) => {
                handleSuccess(retryData);
              })
              .catch(() => { });
          }, 3000);
        });
    });

    return () => {
      isCancelled = true;
    };
  }, [catalogUrl, gatewayUrl, identityUrl, inventoryUrl, orderUrl, paymentUrl]);

  // 5. Thrust Calculation (Gateway + 5 Services = 6 Main Engines, plus 16 Sub-nodes)
  const healthyEnginesCount = useMemo(() => {
    const mainKeys = ["gateway", "identity_service", "catalog_service", "order_service", "payment_service", "inventory_service"];
    return mainKeys.filter((k) => serviceStatuses[k] === "Healthy").length;
  }, [serviceStatuses]);

  const healthySubNodesCount = useMemo(() => {
    return Object.values(subEntriesMap).filter((s) => s.status === "Healthy").length;
  }, [subEntriesMap]);

  const totalAllNodes = 6 + ALL_OUTER_ENTRIES.length;
  const thrustPercentage = Math.round(((healthyEnginesCount + healthySubNodesCount) / totalAllNodes) * 100);

  // 6. Watch All 6 Engines AND All 16 Sub-Nodes — ONLY Trigger Liftoff when 100% of nodes are Healthy!
  useEffect(() => {
    const allSixHealthy = healthyEnginesCount === 6;
    const allSubNodesHealthy = healthySubNodesCount === ALL_OUTER_ENTRIES.length;

    if (allSixHealthy && allSubNodesHealthy && redirectCountdown === null) {
      pushLog("ALL 3 RINGS NOMINAL: 100% Microservices Cluster and Sub-system Entries Online. LIFTOFF!", "success");
      setRedirectCountdown(1);
    }
  }, [healthyEnginesCount, healthySubNodesCount, redirectCountdown]);

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

// ============================================================================
// BOOTSCREEN V2 (Human-Centric / Warm Food Delivery Preparation)
// ============================================================================

interface CustomerFriendlyStep {
  key: string;
  name: string;
  role: string;
  icon: React.ElementType;
  badgeColor: string;
}

const CUSTOMER_FRIENDLY_STEPS: CustomerFriendlyStep[] = [
  {
    key: "catalog_service",
    name: "Thực đơn & Quán ngon",
    role: "Cập nhật danh sách món ăn, hình ảnh và đánh giá mới nhất",
    icon: Utensils,
    badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  {
    key: "inventory_service",
    name: "Tình trạng Món ăn",
    role: "Kiểm tra món ăn còn hàng để bạn đặt giao nhanh nhất",
    icon: Boxes,
    badgeColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  {
    key: "order_service",
    name: "Tiếp nhận Đơn hàng",
    role: "Sẵn sàng điều phối đơn tức thì tới nhà hàng và bác tài",
    icon: ShoppingBag,
    badgeColor: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  },
  {
    key: "payment_service",
    name: "Thanh toán & Khuyến mãi",
    role: "Kết nối ví điện tử an toàn, áp dụng voucher giảm giá",
    icon: CreditCard,
    badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    key: "identity_service",
    name: "Tài khoản & Hội viên",
    role: "Bảo mật thông tin cá nhân và điểm tích lũy của bạn",
    icon: ShieldCheck,
    badgeColor: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  },
  {
    key: "gateway",
    name: "Kết nối Đường truyền",
    role: "Tối ưu hóa tốc độ tải để bạn lướt món ăn mượt mà",
    icon: Zap,
    badgeColor: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  },
];

export function BootScreenV2({ onReady }: BootScreenProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [canRedirect, setCanRedirect] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>(
    "Đang kiểm tra kết nối với thực đơn và các nhà hàng..."
  );

  const [stepStatuses, setStepStatuses] = useState<Record<string, "Pending" | "Ready">>({
    catalog_service: "Pending",
    inventory_service: "Pending",
    order_service: "Pending",
    payment_service: "Pending",
    identity_service: "Pending",
    gateway: "Pending",
  });

  const completedSetRef = useRef<Set<string>>(new Set());

  // Elapsed time counter
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Minimum presentation delay (3.5s) to prevent flickering
  useEffect(() => {
    const minDelayTimer = setTimeout(() => {
      setCanRedirect(true);
    }, 3500);
    return () => clearTimeout(minDelayTimer);
  }, []);

  // Environment URLs (strictly from environment, no hardcoded URLs)
  const identityUrl = process.env.NEXT_PUBLIC_IDENTITY_URL || "";
  const orderUrl = process.env.NEXT_PUBLIC_ORDER_URL || "";
  const catalogUrl = process.env.NEXT_PUBLIC_CATALOG_URL || "";
  const inventoryUrl = process.env.NEXT_PUBLIC_INVENTORY_URL || "";
  const paymentUrl = process.env.NEXT_PUBLIC_PAYMENT_URL || "";
  const gatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "";

  useEffect(() => {
    let isCancelled = false;

    const formatPingUrl = (url?: string) => (url ? `${url.trim().replace(/\/+$/, '')}/` : '');

    const targets = [
      gatewayUrl ? { id: "gateway", key: "gateway", name: "Cổng Kết Nối", url: `${gatewayUrl.trim().replace(/\/+$/, '')}/health` } : null,
      catalogUrl ? { id: "catalog", key: "catalog_service", name: "Thực đơn & Nhà hàng", url: formatPingUrl(catalogUrl) } : null,
      inventoryUrl ? { id: "inventory", key: "inventory_service", name: "Tình trạng Món ăn", url: formatPingUrl(inventoryUrl) } : null,
      orderUrl ? { id: "order", key: "order_service", name: "Tiếp nhận Đơn hàng", url: formatPingUrl(orderUrl) } : null,
      paymentUrl ? { id: "payment", key: "payment_service", name: "Thanh toán & Khuyến mãi", url: formatPingUrl(paymentUrl) } : null,
      identityUrl ? { id: "identity", key: "identity_service", name: "Tài khoản & Bảo mật", url: formatPingUrl(identityUrl) } : null,
    ].filter(Boolean) as Array<{ id: string; key: string; name: string; url: string }>;

    const markServiceReady = (key: string) => {
      if (!completedSetRef.current.has(key)) {
        completedSetRef.current.add(key);
        setStepStatuses((prev) => ({ ...prev, [key]: "Ready" }));
      }
    };

    // 1. Check pre-warmed promises or dispatch direct fetch for all targets (original logic)
    targets.forEach((t) => {
      const executeTargetCheck = () => {
        if (isCancelled || completedSetRef.current.has(t.key)) return;

        const prewarmedPromise =
          typeof window !== "undefined" && (window as any).__QUICKBITE_PROMISES?.[t.key]
            ? (window as any).__QUICKBITE_PROMISES[t.key]
            : fetch(t.url, {
              method: "GET",
              headers: { Accept: "application/json, text/plain, */*" },
              signal: AbortSignal.timeout(90000),
              cache: "no-store",
            }).then((r) => r.json().catch(() => ({ status: r.ok ? "Healthy" : "Unhealthy" })));

        prewarmedPromise
          .then((data: any) => {
            if (isCancelled) return;
            const rawStatus = (data?.status || data?.data?.status || "").toString().toLowerCase();
            const isHealthy =
              rawStatus === "healthy" ||
              rawStatus === "ok" ||
              rawStatus === "up" ||
              t.id === "gateway" ||
              data?.success === true;

            if (isHealthy) {
              markServiceReady(t.key);
            } else {
              // Retry after 3.5s if service is waking up
              setTimeout(() => {
                if (!isCancelled && !completedSetRef.current.has(t.key)) {
                  fetch(t.url, {
                    method: "GET",
                    headers: { Accept: "application/json, text/plain, */*" },
                    signal: AbortSignal.timeout(45000),
                    cache: "no-store",
                  })
                    .then((r) => r.json().catch(() => ({ status: r.ok ? "Healthy" : "Unhealthy" })))
                    .then((retryData) => {
                      const retryStatus = (retryData?.status || retryData?.data?.status || "").toString().toLowerCase();
                      if (retryStatus === "healthy" || retryStatus === "ok" || retryStatus === "up") {
                        markServiceReady(t.key);
                      }
                    })
                    .catch(() => { });
                }
              }, 3500);
            }
          })
          .catch(() => {
            // Single gentle retry on error
            setTimeout(() => {
              if (!isCancelled && !completedSetRef.current.has(t.key)) {
                fetch(t.url, {
                  method: "GET",
                  headers: { Accept: "application/json, text/plain, */*" },
                  signal: AbortSignal.timeout(45000),
                  cache: "no-store",
                })
                  .then((r) => r.json().catch(() => ({ status: r.ok ? "Healthy" : "Unhealthy" })))
                  .then((retryData) => {
                    const retryStatus = (retryData?.status || retryData?.data?.status || "").toString().toLowerCase();
                    if (retryStatus === "healthy" || retryStatus === "ok" || retryStatus === "up") {
                      markServiceReady(t.key);
                    }
                  })
                  .catch(() => { });
              }
            }, 3500);
          });
      };

      executeTargetCheck();
    });

    // 2. Poll Gateway /health periodically as the central health aggregator
    const pollGateway = async () => {
      let pollCount = 0;
      const gwHealthUrl = gatewayUrl ? `${gatewayUrl}/health` : "/health";
      while (!isCancelled) {
        pollCount++;
        try {
          const res = await fetch(gwHealthUrl, {
            method: "GET",
            headers: { Accept: "application/json, text/plain, */*" },
            cache: "no-store",
            signal: AbortSignal.timeout(25000),
          });

          if (res.ok) {
            const data = await res.json().catch(() => null);
            if (data && !isCancelled) {
              const rawGw = (data.status || data.data?.status || "").toString().toLowerCase();
              if (rawGw === "healthy" || rawGw === "ok") {
                markServiceReady("gateway");
              }

              const entries = data.entries || data.data?.entries || {};
              Object.entries(entries).forEach(([k, v]: [string, any]) => {
                const subStatus = (v?.status || "").toString().toLowerCase();
                if (subStatus === "healthy" || subStatus === "ok") {
                  markServiceReady(k);
                }
              });
            }
          }
        } catch {
          // Gateway booting or sleeping
        }

        const currentReady = completedSetRef.current.size;
        if (currentReady >= targets.length) {
          setStatusMessage("🎉 Tất cả dịch vụ đã trực tuyến và sẵn sàng phục vụ bạn!");
          break;
        } else {
          setStatusMessage(
            `Đã kết nối ${currentReady}/${targets.length} dịch vụ. Đang chuẩn bị các món ngon còn lại... (Lần ${pollCount})`
          );
        }

        if (!isCancelled) {
          await new Promise((r) => setTimeout(r, 2500));
        }
      }
    };

    pollGateway();

    return () => {
      isCancelled = true;
    };
  }, [catalogUrl, gatewayUrl, identityUrl, inventoryUrl, orderUrl, paymentUrl]);

  const readyCount = Object.values(stepStatuses).filter((st) => st === "Ready").length;
  const isAllReady = readyCount >= CUSTOMER_FRIENDLY_STEPS.length;
  const progressPercent = Math.min(100, Math.round((readyCount / CUSTOMER_FRIENDLY_STEPS.length) * 100));

  // Auto redirect countdown when all services verified Ready + min presentation time passed
  useEffect(() => {
    if (isAllReady && canRedirect && redirectCountdown === null) {
      setRedirectCountdown(2);
    }
  }, [isAllReady, canRedirect, redirectCountdown]);

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

  const pad = (n: number) => String(n).padStart(2, "0");
  const elapsedFormatted = `${pad(Math.floor(elapsedSeconds / 60))}:${pad(elapsedSeconds % 60)}s`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950 text-slate-100 overflow-y-auto select-none font-sans">
      {/* Warm ambient background lighting */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container Card */}
      <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-2xl shadow-slate-950/80 p-6 sm:p-8 flex flex-col gap-6 overflow-hidden backdrop-blur-xl">
        {/* Top vibrant gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500" />

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 p-0.5 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Utensils className="w-6 h-6 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-300 mb-1">
                <Sparkles className="w-3 h-3" />
                <span>Bữa ngon đang chờ bạn</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Chào bạn! QuickBite đang chuẩn bị bữa ăn ngon...
              </h1>
            </div>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
          Hệ thống đang đồng bộ danh sách nhà hàng, kiểm tra thực đơn còn món và kết nối cổng giao hàng nhanh nhất để phục vụ bạn.
        </p>

        {/* Progress Section */}
        <div className="rounded-2xl bg-slate-950/60 border border-slate-800/80 p-4 sm:p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="font-medium text-slate-300 flex items-center gap-2">
              {isAllReady ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300 font-semibold">Tất cả món ngon và dịch vụ đã sẵn sàng!</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                  <span>Đang kết nối hệ thống quán ăn ({readyCount}/{CUSTOMER_FRIENDLY_STEPS.length} hoàn tất)</span>
                </>
              )}
            </span>
            <span className="font-mono font-bold text-amber-300 text-sm sm:text-base">
              {progressPercent}%
            </span>
          </div>

          {/* Smooth Progress Bar */}
          <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Real-time status message feed */}
          <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800/80">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${isAllReady ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
                }`}
            />
            <span className="truncate">{statusMessage}</span>
          </div>
        </div>

        {/* Humanized Service Steps Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          {CUSTOMER_FRIENDLY_STEPS.map((step) => {
            const isReady = stepStatuses[step.key] === "Ready";
            const Icon = step.icon;

            return (
              <div
                key={step.key}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-300 ${isReady
                    ? "bg-emerald-950/20 border-emerald-500/30 text-slate-100 shadow-xs"
                    : "bg-slate-950/40 border-slate-800/70 text-slate-400"
                  }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${isReady ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : step.badgeColor
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3
                      className={`text-xs sm:text-sm font-bold truncate ${isReady ? "text-white" : "text-slate-300"
                        }`}
                    >
                      {step.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 truncate leading-tight">
                      {step.role}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 ml-2">
                  {isReady ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                      <Check className="w-3 h-3" />
                      <span className="hidden sm:inline">Xong</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-300/90 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                      <span className="hidden sm:inline">Chờ...</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Human Touch Tip Card */}
        <div className="rounded-2xl bg-slate-800/40 border border-slate-800 p-3.5 flex items-start gap-3 text-xs text-slate-300">
          <Coffee className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed text-slate-400">
            <strong className="text-slate-200">Mẹo nhỏ:</strong> Khi các quán ăn mở bán ca sáng hoặc sau giờ nghỉ, máy chủ có thể mất 15–30 giây để cập nhật lại menu mới nhất. Bạn có thể lưu sẵn địa chỉ giao hàng để đặt món nhanh nhất nhé!
          </p>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Thời gian kết nối:{" "}
              <strong className="font-mono text-slate-200">{elapsedFormatted}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {isAllReady ? (
              <button
                type="button"
                onClick={() => onReady && onReady()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <span>Vào đặt món ngay</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onReady && onReady()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-all cursor-pointer"
              >
                <span>Bỏ qua & Khám phá ngay</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SWITCH BOOTSCREEN VERSION
// Hướng dẫn: Đổi dấu comment // bên dưới để chuyển đổi tức thì giữa 2 phiên bản
// ============================================================================

// [MẶC ĐỊNH - V2]: Giao diện thân thiện con người, ấm áp, trải nghiệm khách hàng
export const BootScreen = BootScreenV2;
export default BootScreenV2;

// [TÙY CHỌN - V1]: Giao diện Starship Matrix / 3-Ring Sci-Fi Cluster Visualizer
// export const BootScreen = BootScreenV1;
// export default BootScreenV1;

