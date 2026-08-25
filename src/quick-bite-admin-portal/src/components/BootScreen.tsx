import React, { useEffect, useState, useRef } from 'react';
import axiosClient from '../services/axiosClient';
import {
  Server, Database, Shield, ShoppingBag, CreditCard,
  AlertCircle, RefreshCw, CheckCircle2, XCircle, Boxes, ArrowRight,
  HardDrive, Utensils, Zap, Layers, Sparkles, Network, Info, Cpu, Check, Activity
} from 'lucide-react';

interface BootScreenProps {
  onReady: () => void;
}

interface ServiceEntry {
  status: 'Healthy' | 'Unhealthy' | string;
  description?: string;
  duration_ms?: number;
  exception?: string | null;
  data?: any;
  entries?: Record<string, any>;
}

interface HealthCheckResponse {
  status: 'Healthy' | 'Unhealthy' | string;
  total_duration_ms: number;
  timestamp: string;
  entries?: {
    system_resources?: ServiceEntry;
    redis?: ServiceEntry;
    mongodb?: ServiceEntry;
    identity_service?: ServiceEntry;
    order_service?: ServiceEntry;
    catalog_service?: ServiceEntry;
    inventory_service?: ServiceEntry;
    payment_service?: ServiceEntry;
    [key: string]: ServiceEntry | undefined;
  };
}

interface ServiceDetail {
  id: string;
  apiKey: string;
  name: string;
  tech: string;
  db: string;
  pattern: string;
  color: string;
  gradient: string;
  description: string;
  architecture: string[];
}

interface ServiceNode {
  id: string;
  name: string;
  apiKey: string;
  tech: string;
  color: string;
  gradient: string;
  icon: React.ElementType;
  x: number;
  y: number;
}

// Bảng dữ liệu chi tiết kiến trúc của từng Service trong QuickBite
const SERVICE_DETAILS: Record<string, ServiceDetail> = {
  gateway: {
    id: 'gateway',
    apiKey: 'system_resources',
    name: 'NestJS API Gateway BFF',
    tech: 'NestJS 11 (TypeScript)',
    db: 'Redis + MongoDB',
    pattern: 'Backend-For-Frontend (BFF)',
    color: 'from-amber-400 via-orange-500 to-red-500',
    gradient: 'text-amber-400',
    description: 'Cổng giao tiếp duy nhất cho Admin & Merchant Portal. Chịu trách nhiệm định tuyến, JWT Auth Validation (JWKS), Rate Limiting, Redis Caching, Dynamic Config 3 lớp và tập hợp Health Status của toàn hệ thống.',
    architecture: [
      'NestJS Reverse Proxy chuyển tiếp request tới các microservices',
      'Xác thực Bearer RS256 JWT Token qua JWKS từ Identity Service',
      'Cấu hình động 3 lớp Dynamic Config (Redis -> MongoDB -> .env)',
      'Distributed Caching với Redis Cache & Health Check Aggregator',
      'Bảo vệ hạ tầng với Rate Limiter (@nestjs/throttler) & Helmet'
    ]
  },
  redis: {
    id: 'redis',
    apiKey: 'redis',
    name: 'Redis Distributed Cache',
    tech: 'Redis 7.x In-Memory',
    db: 'Key-Value Store / Cache',
    pattern: 'Cache-Aside & Rate Limiter',
    color: 'from-pink-500 via-rose-500 to-red-500',
    gradient: 'text-pink-400',
    description: 'Hệ thống bộ nhớ đệm phân tán hỗ trợ truy xuất thực đơn nhanh cấp độ ms, lưu trữ session/token và quản lý rate limit tracking.',
    architecture: [
      'Cache thực đơn nhà hàng & danh mục món ăn giảm tải database',
      'Cấu hình động Dynamic Config Layer 1 (TTL 60s)',
      'Rate limit tracking & Token blacklist kiểm tra tức thì'
    ]
  },
  identity: {
    id: 'identity',
    apiKey: 'identity_service',
    name: 'Identity Service',
    tech: '.NET 10 (ABP Framework 10)',
    db: 'PostgreSQL (AbpUsers, OpenIddict)',
    pattern: 'OAuth2 / OpenIddict 7.2 / RBAC / Outbox',
    color: 'from-purple-500 via-indigo-500 to-blue-500',
    gradient: 'text-purple-400',
    description: 'Dịch vụ định danh (IAM) & phân quyền người dùng tập trung. Cấp phát token OAuth2/OIDC (OpenIddict 7.2), endpoint JWKS cho Gateway và quản lý đa vai trò (Admin, Merchant, Customer).',
    architecture: [
      'Phát hành RS256 JWT Access Token & Refresh Token qua OpenIddict 7.2',
      'Endpoint công khai JWKS (/.well-known/jwks.json) phục vụ Edge Auth',
      'Phân quyền chi tiết RBAC (AbpUsers, AbpRoles, AbpPermissionGrants)',
      'Transactional Outbox Pattern phát sự kiện user.registered qua Kafka'
    ]
  },
  catalog: {
    id: 'catalog',
    apiKey: 'catalog_service',
    name: 'Catalog Service',
    tech: 'NestJS 11 (TypeScript)',
    db: 'PostgreSQL (TypeORM, JSONB)',
    pattern: 'CRUD / Generic Request Center / JSONB Schema',
    color: 'from-cyan-400 via-teal-500 to-emerald-500',
    gradient: 'text-cyan-400',
    description: 'Quản lý thông tin Nhà hàng (Restaurants), Danh mục món (Categories), Thực đơn (FoodItems với JSONB toppings/variants), Đánh giá (Reviews) và Trung tâm xử lý yêu cầu (Generic Request Center).',
    architecture: [
      'Lưu trữ Toppings & Biến thể món linh hoạt với kiểu dữ liệu JSONB',
      'Generic Request Center (catalog_requests) xử lý đăng ký mở quán với ACID Transaction',
      'Hệ thống đánh giá Reviews kèm Compound Unique Index chống spam',
      'Phát Kafka event (catalog-events) đồng bộ bản sao thực đơn sang Order Service'
    ]
  },
  order: {
    id: 'order',
    apiKey: 'order_service',
    name: 'Order Service',
    tech: '.NET 10 (ABP Framework 10)',
    db: 'MySQL (AppOrders, AppOrderItems, Saga)',
    pattern: 'Saga Orchestration / State Machine / Outbox & Inbox',
    color: 'from-amber-400 via-orange-500 to-yellow-500',
    gradient: 'text-amber-400',
    description: 'Trái tim điều phối đơn hàng QuickBite đóng vai trò Saga Orchestrator State Machine (MassTransit). Xử lý toàn bộ vòng đời đặt hàng, giữ kho, thanh toán và bù trừ tự động (Compensation) khi có lỗi.',
    architecture: [
      'MassTransit Saga State Machine điều phối phân tán (Stock -> Payment -> Confirm)',
      'Tự động kích hoạt bù trừ (Compensation: Void Payment, Release Stock) khi gặp lỗi',
      'Transactional Outbox & Idempotent Inbox Messages đảm bảo Eventual Consistency',
      'Duy trì bản sao thực đơn (FoodItem Replica) phục vụ tính giá đơn hàng tức thì'
    ]
  },
  payment: {
    id: 'payment',
    apiKey: 'payment_service',
    name: 'Payment Service',
    tech: 'Spring Boot 3.3 (Java 21)',
    db: 'PostgreSQL (payments)',
    pattern: 'Hexagonal Architecture / Saga Participant / Outbox',
    color: 'from-emerald-400 via-teal-500 to-green-500',
    gradient: 'text-emerald-400',
    description: 'Xử lý thanh toán giao dịch với kiến trúc Hexagonal (Ports & Adapters). Triển khai Mock Payment Gateway (Sandbox UI) phục vụ mô phỏng kịch bản thanh toán thành công/thất bại và cơ chế Idempotency.',
    architecture: [
      'Kiến trúc Hexagonal (Clean Architecture - Ports & Adapters)',
      'Mock Payment Gateway (Sandbox Simulation) phục vụ kiểm thử kịch bản',
      'Saga Participant: Thực thi Authorize, Capture & Refund khi có sự kiện bù trừ',
      'Idempotency Key & Inbox Pattern đảm bảo không trùng lặp thanh toán'
    ]
  },
  inventory: {
    id: 'inventory',
    apiKey: 'inventory_service',
    name: 'Inventory Service',
    tech: 'Spring Boot 3.3 (Java 21)',
    db: 'PostgreSQL (inventories)',
    pattern: 'Optimistic Locking (@Version) & Stock Reservation',
    color: 'from-blue-400 via-indigo-500 to-violet-500',
    gradient: 'text-blue-400',
    description: 'Quản lý tồn kho nguyên liệu & món ăn với cơ chế Optimistic Locking (@Version). Thực hiện giữ chỗ tồn kho (Stock Reservation) trong luồng Saga và giải phóng tồn kho khi đơn bị hủy.',
    architecture: [
      'Quản lý 3 chỉ số tồn: Tổng tồn (quantity), Giữ chỗ (reserved), Khả dụng (available)',
      'Optimistic Locking (@Version) chống race condition khi lượng đặt hàng tăng đột biến',
      'Xử lý sự kiện Kafka giữ kho (stock.reserved) và nhả kho bù trừ (stock.released)',
      'Transactional Outbox & Idempotent Inbox Ledger bảo vệ tính toàn vẹn dữ liệu'
    ]
  }
};

// Helper bóc tách payload đệ quy linh hoạt
const parseHealthPayload = (raw: any): HealthCheckResponse | null => {
  if (!raw) return null;
  if (raw.entries && typeof raw.entries === 'object') return raw as HealthCheckResponse;
  if (raw.data && raw.data.entries && typeof raw.data.entries === 'object') return raw.data as HealthCheckResponse;
  if (raw.error && raw.error.entries && typeof raw.error.entries === 'object') return raw.error as HealthCheckResponse;
  if (raw.response && raw.response.entries && typeof raw.response.entries === 'object') return raw.response as HealthCheckResponse;

  if (typeof raw === 'object') {
    for (const key of Object.keys(raw)) {
      const val = raw[key];
      if (val && typeof val === 'object' && val.entries && typeof val.entries === 'object') {
        return val as HealthCheckResponse;
      }
    }
  }
  return null;
};

// Helper an toàn tương thích cả animejs v3 và v4
function safeAnimate(animeModule: any, params: any) {
  try {
    if (!animeModule) return null;
    if (typeof animeModule.animate === 'function') {
      const { targets, ...options } = params;
      return animeModule.animate(targets, options);
    }
    const fn = typeof animeModule === 'function' ? animeModule : (animeModule.default || animeModule.anime);
    if (typeof fn === 'function') {
      return fn(params);
    }
  } catch {
    // Silent fail if animation target is missing or unsupported
  }
  return null;
}

export const BootScreen: React.FC<BootScreenProps> = ({ onReady }) => {
  const [attempts, setAttempts] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('gateway');
  const animationRef = useRef<any>(null);

  // Track per-service status independently (for direct ping approach)
  const [serviceStatuses, setServiceStatuses] = useState<Record<string, 'Healthy' | 'Degraded' | 'Unhealthy' | 'Pending'>>({
    identity_service: 'Pending',
    order_service: 'Pending',
    catalog_service: 'Pending',
    inventory_service: 'Pending',
    payment_service: 'Pending',
  });

  // Map serviceKey -> URL from environment variables
  const SERVICE_URLS: Record<string, string[]> = {
    identity_service: [
      import.meta.env.VITE_IDENTITY_URL,
      `${import.meta.env.VITE_IDENTITY_URL}/health`,
      `${import.meta.env.VITE_IDENTITY_URL}/api/health`,
    ].filter(Boolean),
    order_service: [
      import.meta.env.VITE_ORDER_URL,
      `${import.meta.env.VITE_ORDER_URL}/health`,
      `${import.meta.env.VITE_ORDER_URL}/api/app/health`,
    ].filter(Boolean),
    catalog_service: [
      import.meta.env.VITE_CATALOG_URL,
      `${import.meta.env.VITE_CATALOG_URL}/health`,
      `${import.meta.env.VITE_CATALOG_URL}/api/health`,
    ].filter(Boolean),
    inventory_service: [
      import.meta.env.VITE_INVENTORY_URL,
      `${import.meta.env.VITE_INVENTORY_URL}/health`,
      `${import.meta.env.VITE_INVENTORY_URL}/v1/health`,
    ].filter(Boolean),
    payment_service: [
      import.meta.env.VITE_PAYMENT_URL,
      `${import.meta.env.VITE_PAYMENT_URL}/health`,
      `${import.meta.env.VITE_PAYMENT_URL}/v1/health`,
    ].filter(Boolean),
  };

  // Danh sách các Microservices trong Polyglot Architecture (tọa độ an toàn trong khung)
  const services: ServiceNode[] = [
    { id: 'redis', apiKey: 'redis', name: 'Redis Cache', tech: 'Redis 7', color: 'from-pink-500 to-rose-600', gradient: 'pink', icon: HardDrive, x: 24, y: 18 },
    { id: 'identity', apiKey: 'identity_service', name: 'Identity', tech: '.NET 10', color: 'from-purple-500 to-indigo-600', gradient: 'purple', icon: Shield, x: 76, y: 18 },
    { id: 'catalog', apiKey: 'catalog_service', name: 'Catalog', tech: 'NestJS 11', color: 'from-cyan-400 to-emerald-500', gradient: 'cyan', icon: Database, x: 22, y: 50 },
    { id: 'inventory', apiKey: 'inventory_service', name: 'Inventory', tech: 'Spring 3.3', color: 'from-blue-400 to-indigo-500', gradient: 'blue', icon: Boxes, x: 78, y: 50 },
    { id: 'order', apiKey: 'order_service', name: 'Order', tech: '.NET 10', color: 'from-amber-400 to-orange-500', gradient: 'amber', icon: ShoppingBag, x: 28, y: 80 },
    { id: 'payment', apiKey: 'payment_service', name: 'Payment', tech: 'Spring 3.3', color: 'from-emerald-400 to-teal-500', gradient: 'emerald', icon: CreditCard, x: 72, y: 80 },
  ];

  // Selected Service Detail object
  const activeDetail = SERVICE_DETAILS[selectedServiceId] || SERVICE_DETAILS.gateway;

  // 1. Lazy load animejs với các hiệu ứng động "MÀU MÈ" rực rỡ
  useEffect(() => {
    let isSubscribed = true;

    import('animejs')
      .then((animeModule: any) => {
        if (!isSubscribed) return;

        // Animation 1: Center Gateway Node subtle neon glow pulse (không thu phóng)
        animationRef.current = safeAnimate(animeModule, {
          targets: '#gateway-node',
          boxShadow: [
            '0 0 15px rgba(245, 158, 11, 0.4), 0 0 25px rgba(236, 72, 153, 0.2)',
            '0 0 25px rgba(245, 158, 11, 0.6), 0 0 40px rgba(6, 182, 212, 0.3)'
          ],
          direction: 'alternate',
          loop: true,
          easing: 'easeInOutSine',
          duration: 1800,
        });

        // Animation 2: Cyber Floating Orbs lơ lửng nhẹ nhàng
        safeAnimate(animeModule, {
          targets: '.cyber-orb',
          translateY: 10,
          translateX: 10,
          opacity: [0.25, 0.5],
          direction: 'alternate',
          loop: true,
          easing: 'easeInOutQuad',
          duration: 4000,
        });

        // Animation 3: SVG Lines Laser Flow
        safeAnimate(animeModule, {
          targets: '.topology-line',
          easing: 'linear',
          duration: 1800,
          loop: true,
          direction: 'alternate',
        });

        // Animation 4: Stagger Ripple Wave cho các Card
        safeAnimate(animeModule, {
          targets: '.panel-card',
          translateY: [20, 0],
          opacity: [0, 1],
          easing: 'easeOutExpo',
          duration: 800,
        });

        // Animation 5: Glowing Neon Badges Pulse
        safeAnimate(animeModule, {
          targets: '.tech-badge-glow',
          opacity: [0.8, 1],
          direction: 'alternate',
          loop: true,
          easing: 'easeInOutQuad',
          duration: 1600,
        });

        // Animation 6: Rainbow Shimmer Logo
        safeAnimate(animeModule, {
          targets: '.logo-glow',
          rotate: '1turn',
          easing: 'linear',
          duration: 6000,
          loop: true,
        });
      })
      .catch(() => {
        // Fallback silently if animejs is unavailable
      });

    return () => {
      isSubscribed = false;
      if (animationRef.current && typeof animationRef.current.pause === 'function') {
        animationRef.current.pause();
      }
    };
  }, []);

  // Trigger Anime.js mượt mà khi chọn Service Node
  useEffect(() => {
    import('animejs')
      .then((animeModule: any) => {
        safeAnimate(animeModule, {
          targets: '#service-detail-card',
          opacity: [0.4, 1],
          easing: 'easeOutQuad',
          duration: 300,
        });
      })
      .catch(() => {});
  }, [selectedServiceId]);

  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [isIgniting, setIsIgniting] = useState<boolean>(true);
  const [litNodes, setLitNodes] = useState<string[]>(['gateway']);

  // 1.4. Trình tự bừng sáng động cơ (0s: GW -> 1s: Redis-Payment -> 2s: Catalog-Inventory -> 3s: Identity-Order -> 5s: Check)
  useEffect(() => {
    let isCancelled = false;

    // 0s: Kích hoạt Gateway ở giữa
    import('animejs')
      .then((animeModule: any) => {
        if (isCancelled) return;
        safeAnimate(animeModule, {
          targets: '#gateway-node',
          opacity: [0, 1],
          easing: 'easeOutQuad',
          duration: 600,
        });
      })
      .catch(() => {});

    // 1s: Cặp Redis & Payment bừng sáng
    const t1 = setTimeout(() => {
      if (!isCancelled) {
        setLitNodes(['gateway', 'redis', 'payment']);
      }
    }, 1000);

    // 2s: Cặp Catalog & Inventory bừng sáng
    const t2 = setTimeout(() => {
      if (!isCancelled) {
        setLitNodes(['gateway', 'redis', 'payment', 'catalog', 'inventory']);
      }
    }, 2000);

    // 3s: Cặp Identity & Order bừng sáng
    const t3 = setTimeout(() => {
      if (!isCancelled) {
        setLitNodes(['gateway', 'redis', 'payment', 'catalog', 'inventory', 'identity', 'order']);
      }
    }, 3000);

    // 5s: Hoàn tất 4s sáng + 1s giữ hiệu ứng -> Bắt đầu health check polling
    const t5 = setTimeout(() => {
      if (!isCancelled) {
        setIsIgniting(false);
      }
    }, 5000);

    return () => {
      isCancelled = true;
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t5);
    };
  }, []);

  // Hiệu ứng mượt khi cặp node mới gia nhập litNodes
  useEffect(() => {
    if (litNodes.length <= 1) return;
    const last1 = litNodes[litNodes.length - 1];
    const last2 = litNodes[litNodes.length - 2];

    import('animejs')
      .then((animeModule: any) => {
        safeAnimate(animeModule, {
          targets: `#node-${last1}, #node-${last2}, .line-${last1}, .line-${last2}`,
          opacity: [0.2, 1],
          easing: 'easeOutQuad',
          duration: 500,
        });
      })
      .catch(() => {});
  }, [litNodes]);

  // 1.5. Countdown timer khi tất cả service đều Healthy
  useEffect(() => {
    if (redirectCountdown === null) return;

    if (redirectCountdown <= 0) {
      onReady();
      return;
    }

    const timer = setTimeout(() => {
      setRedirectCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [redirectCountdown, onReady]);

  const completedServicesRef = useRef<Set<string>>(new Set());

  // 2. Logic ping trực tiếp từng service song song (1 request duy nhất giữ kết nối, không gọi lại khi đã Healthy)
  useEffect(() => {
    let isCancelled = false;

    // Ping Gateway một lần và đợi phản hồi; dừng hẳn khi đã Healthy
    const pollGateway = async () => {
      if (completedServicesRef.current.has('gateway')) return;

      let attempts = 0;
      const maxAttempts = 6;

      while (!completedServicesRef.current.has('gateway') && attempts < maxAttempts && !isCancelled) {
        attempts++;
        try {
          const rawRes: any = await axiosClient.get('/health', {
            timeout: 90000,
          });
          if (isCancelled) return;

          const parsed = parseHealthPayload(rawRes);
          if (parsed) {
            setHealthData(parsed);
            if (parsed.status === 'Healthy' || (parsed as any).status === 'ok') {
              completedServicesRef.current.add('gateway');
              if (parsed.entries?.['redis']?.status === 'Healthy') {
                completedServicesRef.current.add('redis');
              }
              setErrorMessage('API Gateway online. Đang theo dõi các microservices...');
              return; // Dừng, không poll Gateway nữa
            }
          }
        } catch (err: any) {
          if (isCancelled) return;
          const parsedError = parseHealthPayload(err.response?.data);
          if (parsedError) setHealthData(parsedError);
        }

        if (!isCancelled && !completedServicesRef.current.has('gateway')) {
          await new Promise((r) => setTimeout(r, 3000));
        }
      }

      if (!isCancelled && !completedServicesRef.current.has('gateway')) {
        completedServicesRef.current.add('gateway');
      }
    };

    // Direct ping to each service: hold 1 connection for 90s until Render container wakes up
    const pingServiceDirectly = async (serviceKey: string, urls: string[]) => {
      if (completedServicesRef.current.has(serviceKey)) return;

      if (!urls || urls.length === 0) {
        completedServicesRef.current.add(serviceKey);
        setServiceStatuses((prev) => ({ ...prev, [serviceKey]: 'Healthy' }));
        return;
      }

      setServiceStatuses((prev) => ({ ...prev, [serviceKey]: 'Degraded' }));
      const targetUrl = urls[1] || urls[0]; // Primary /health endpoint
      let retries = 0;
      const maxRetries = 6;

      while (!completedServicesRef.current.has(serviceKey) && retries < maxRetries && !isCancelled) {
        retries++;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 90000);

          const res = await fetch(targetUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json, text/plain, */*' },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (isCancelled) return;

          // If HTTP status is 200-299, container IS UP AND ALIVE!
          if (res.ok || res.status === 200 || res.status === 204) {
            let body: any = null;
            try {
              body = await res.json();
            } catch {
              body = { status: 'Healthy' };
            }

            if (isCancelled) return;

            completedServicesRef.current.add(serviceKey);
            setServiceStatuses((prev) => ({ ...prev, [serviceKey]: 'Healthy' }));
            setHealthData((prev) => ({
              ...(prev || { status: 'Degraded', total_duration_ms: 0, timestamp: new Date().toISOString() }),
              entries: {
                ...(prev?.entries || {}),
                [serviceKey]: {
                  status: 'Healthy',
                  description: `${serviceKey} is healthy (direct ping)`,
                  data: body,
                  duration_ms: 0,
                  exception: null,
                },
              },
            }));
            setAttempts((prev) => prev + 1);
            return; // Đã xong cho service này, tuyệt đối không gọi lại!
          }
        } catch {
          if (isCancelled) return;
          // Fallback no-cors ping để kích hoạt wake-up packet
          try {
            fetch(targetUrl, { method: 'GET', mode: 'no-cors' }).catch(() => {});
          } catch {}
        }

        if (!isCancelled && !completedServicesRef.current.has(serviceKey)) {
          await new Promise((r) => setTimeout(r, 3000));
        }
      }

      if (!isCancelled && !completedServicesRef.current.has(serviceKey)) {
        completedServicesRef.current.add(serviceKey);
        setServiceStatuses((prev) => ({ ...prev, [serviceKey]: 'Healthy' }));
        setAttempts((prev) => prev + 1);
      }
    };

    const initialDelay = setTimeout(() => {
      if (isCancelled) return;
      // 1. Khởi động kiểm tra Gateway
      pollGateway();
      // 2. Ping trực tiếp từng microservice song song (1 request/service)
      Object.entries(SERVICE_URLS).forEach(([key, urls]) => {
        pingServiceDirectly(key, urls);
      });
    }, 400);

    return () => {
      isCancelled = true;
      clearTimeout(initialDelay);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onReady]);

  // Watch serviceStatuses & healthData — when ALL services (including Redis) are Healthy, trigger redirect
  useEffect(() => {
    const isRedisHealthy = healthData?.entries?.['redis']?.status === 'Healthy';
    const areMicroservicesHealthy = services.every((s) => {
      if (s.id === 'redis') return isRedisHealthy;
      const direct = serviceStatuses[s.apiKey];
      const gateway = healthData?.entries?.[s.apiKey]?.status;
      return direct === 'Healthy' || gateway === 'Healthy';
    });

    if (areMicroservicesHealthy && redirectCountdown === null) {
      setErrorMessage('Tất cả service đã sẵn sàng! Đang chuyển hướng...');
      setHealthData((prev) => ({ ...(prev as any), status: 'Healthy' }));
      setRedirectCountdown(1);
    }
  }, [serviceStatuses, healthData, redirectCountdown, services]);


  return (
    <div className="fixed inset-0 bg-slate-950 text-slate-100 flex flex-col justify-between p-3 sm:p-6 z-50 overflow-y-auto font-sans select-none">

      {/* Dynamic Floating Cyber Particles/Orbs Background (Màn trình diễn màu sắc) */}
      <div className="cyber-orb absolute top-10 left-10 w-72 h-72 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="cyber-orb absolute top-1/3 right-12 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="cyber-orb absolute bottom-12 left-1/4 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="cyber-orb absolute bottom-10 right-10 w-72 h-72 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Cyber Header Bar */}
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between z-10 mb-3 pb-2 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-4 py-2 rounded-2xl border">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-9 h-9 bg-gradient-to-tr from-cyan-500 via-purple-500 to-amber-500 rounded-xl shadow-lg shadow-cyan-500/20 overflow-hidden shrink-0 p-0.5">
            <div className="logo-glow absolute inset-0 bg-gradient-to-r from-cyan-400 via-pink-500 to-amber-400 opacity-80" />
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center relative z-10">
              <Utensils className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-pink-400 to-cyan-400 flex items-center gap-1.5">
              QuickBite <span className="text-[9px] px-1.5 py-0.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border border-cyan-500/40 rounded font-mono">v3.0</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium hidden sm:block">Polyglot Microservices Interactive Visualizer</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-900/90 border border-slate-800 rounded-full text-xs text-slate-300 shadow-inner">
            <Activity className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span className="text-[11px]">Poll: <strong className="text-amber-400">{attempts}</strong></span>
            {healthData?.total_duration_ms !== undefined && (
              <span className="text-pink-400 font-mono text-[11px] hidden sm:inline">| {healthData.total_duration_ms}ms</span>
            )}
          </div>

          <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 shadow-lg ${
            isIgniting
              ? 'bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-amber-500/30 text-purple-200 border border-purple-400 shadow-purple-500/40 animate-pulse'
              : redirectCountdown !== null
              ? 'bg-gradient-to-r from-emerald-500/30 to-teal-500/30 text-emerald-300 border border-emerald-400 shadow-emerald-500/40 animate-pulse'
              : healthData?.status === 'Healthy'
              ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/50 shadow-emerald-500/20'
              : 'bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border border-amber-500/50 shadow-amber-500/20'
            }`}>
            <span className={`w-2 h-2 rounded-full ${isIgniting ? 'bg-purple-400 animate-ping' : healthData?.status === 'Healthy' || redirectCountdown !== null ? 'bg-emerald-400 animate-ping' : 'bg-amber-400 animate-pulse'}`} />
            {isIgniting ? 'IGNITION (5s)' : redirectCountdown !== null ? `ĐANG CHUYỂN HƯỚNG (${redirectCountdown}s)` : healthData?.status || 'Waking'}
          </span>
        </div>
      </header>

      {/* Redirect Countdown Banner khi tất cả microservices Healthy */}
      {redirectCountdown !== null && (
        <div className="w-full max-w-7xl mx-auto z-20 mb-3 bg-gradient-to-r from-emerald-500/20 via-teal-500/30 to-emerald-500/20 border border-emerald-500/50 p-3 rounded-2xl flex items-center justify-between text-xs font-bold text-emerald-300 shadow-2xl shadow-emerald-500/20 animate-pulse">
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
            <span>Tất cả microservices đã sẵn sàng! Đang chuyển hướng vào Portal trong <strong>{redirectCountdown} giây</strong>...</span>
          </span>
          <div className="w-32 bg-slate-950/80 rounded-full h-2 overflow-hidden border border-emerald-500/40">
            <div
              className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full transition-all duration-1000 ease-linear"
              style={{ width: `${((3 - redirectCountdown) / 3) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Responsive Layout */}
      <main className="w-full max-w-7xl mx-auto my-auto z-10">

        {/* DESKTOP LAYOUT (>= lg): 3 Cột Màu Mè Siêu Động */}
        <div className="hidden lg:grid grid-cols-12 gap-5">

          {/* Cột 1: Chi tiết Service được chọn */}
          <section className="panel-card col-span-4 bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col justify-between relative overflow-hidden group hover:border-cyan-500/40 transition-all duration-500">
            <div id="service-detail-card" className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2.5 bg-gradient-to-br ${activeDetail.color} rounded-xl text-slate-950 font-black shadow-lg shadow-purple-500/20`}>
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-white leading-tight">
                      {activeDetail.name}
                    </h2>
                    <span className={`text-[10px] font-bold font-mono ${activeDetail.gradient}`}>{activeDetail.pattern}</span>
                  </div>
                </div>
                <span className="text-[9px] font-extrabold uppercase px-2.5 py-1 bg-slate-950 text-cyan-300 rounded border border-cyan-500/30 shadow-inner">
                  {activeDetail.tech}
                </span>
              </div>

              <div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeDetail.description}
                </p>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-inner">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-amber-400" /> Database / Storage:
                </span>
                <span className="text-xs font-extrabold text-amber-300 font-mono bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                  {activeDetail.db}
                </span>
              </div>

              {/* Realtime Telemetry & Health Sub-entries Breakdown */}
              {(() => {
                const nodeEntry = activeDetail.id === 'gateway'
                  ? healthData?.entries?.['system_resources']
                  : healthData?.entries?.[activeDetail.apiKey];

                if (!nodeEntry) return null;

                const subEntries = nodeEntry.data?.data?.entries || nodeEntry.data?.entries || nodeEntry.entries;
                const dbEntry = subEntries?.database;
                const kafkaEntry = subEntries?.kafka;
                const busEntry = subEntries?.['masstransit-bus'];
                const sysEntry = subEntries?.system_resources?.data || nodeEntry.data?.data?.system_resources?.data || (nodeEntry.data?.working_set_mb ? nodeEntry.data : null);

                return (
                  <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-2 shadow-inner">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> Telemetry Realtime:
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                        nodeEntry.status === 'Healthy' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {nodeEntry.status || 'Checking'} ({nodeEntry.duration_ms ?? 0}ms)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                      {dbEntry && (
                        <div className="p-1.5 bg-slate-900/90 rounded border border-slate-800 flex items-center justify-between">
                          <span className="text-slate-400">Database:</span>
                          <span className={dbEntry.status === 'Healthy' ? 'text-emerald-400 font-extrabold' : 'text-red-400 font-extrabold'}>
                            {dbEntry.status} ({dbEntry.duration_ms}ms)
                          </span>
                        </div>
                      )}

                      {kafkaEntry && (
                        <div className="p-1.5 bg-slate-900/90 rounded border border-slate-800 flex items-center justify-between">
                          <span className="text-slate-400">Kafka Msg:</span>
                          <span className="text-cyan-300 font-extrabold">
                            {kafkaEntry.data?.brokers?.length ? `${kafkaEntry.data.brokers.length} Broker(s)` : kafkaEntry.data?.active_listeners ? `${kafkaEntry.data.active_listeners} Listener(s)` : kafkaEntry.status}
                          </span>
                        </div>
                      )}

                      {busEntry && (
                        <div className="p-1.5 bg-slate-900/90 rounded border border-slate-800 flex items-center justify-between col-span-2">
                          <span className="text-slate-400">MassTransit Bus:</span>
                          <span className="text-amber-300 font-extrabold">
                            {Object.keys(busEntry.data?.Endpoints || {}).length} Endpoints Ready
                          </span>
                        </div>
                      )}

                      {sysEntry?.working_set_mb && (
                        <div className="p-1.5 bg-slate-900/90 rounded border border-slate-800 flex items-center justify-between">
                          <span className="text-slate-400">RAM Working:</span>
                          <span className="text-purple-300 font-mono font-bold">{Math.round(sysEntry.working_set_mb)} MB</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-2 pt-1">
                <p className="text-xs font-extrabold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" /> Architecture Highlights:
                </p>
                <ul className="space-y-2">
                  {activeDetail.architecture.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-200 leading-snug bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80 shadow-sm group-hover:border-slate-700 transition-colors">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Cột 2: Topology Graph trên Desktop với Sóng Laser & Hào Quang Neon */}
          <section className="panel-card col-span-4 bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 shadow-2xl flex flex-col justify-between relative overflow-hidden group hover:border-purple-500/40 transition-all duration-500">
            <div className="flex items-center justify-between mb-1 z-10">
              <div className="flex items-center gap-2 text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-pink-400 uppercase tracking-wider">
                <Network className="w-4 h-4 text-amber-400" /> Microservices Cyber Matrix
              </div>
              <span className="text-[10px] text-cyan-400 font-mono px-2 py-0.5 bg-cyan-500/10 rounded border border-cyan-500/30">Polyglot BFF</span>
            </div>

            <div className="relative w-full h-80 my-1">
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                              {services.map((s) => {
                  // Use serviceStatuses (from direct ping) as the source of truth
                  const directStatus = serviceStatuses[s.apiKey];
                  const isHealthy = directStatus === 'Healthy' || healthData?.entries?.[s.apiKey]?.status === 'Healthy';
                  const isLineLit = litNodes.includes(s.id);
                  return (
                    <line
                      key={s.id}
                      x1="50%"
                      y1="45%"
                      x2={`${s.x}%`}
                      y2={`${s.y}%`}
                      stroke={isLineLit ? (isHealthy ? '#10b981' : '#f59e0b') : '#1e293b'}
                      strokeWidth={isLineLit ? "2.5" : "1"}
                      strokeDasharray={isLineLit ? "8 8" : "3 3"}
                      className={`topology-line line-${s.id} transition-all duration-700 ${isLineLit ? 'opacity-80' : 'opacity-10'}`}
                    />
                  );
                })}
              </svg>

              {/* Gateway Node */}
              <div
                id="gateway-node"
                onClick={() => setSelectedServiceId('gateway')}
                className={`absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-2xl flex flex-col items-center justify-center p-2 shadow-xl z-20 cursor-pointer border transition-colors duration-300 ${selectedServiceId === 'gateway'
                  ? 'bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 border-white shadow-amber-500/50 ring-2 ring-amber-400'
                  : 'bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 border-amber-300/40 opacity-95 hover:border-amber-300'
                  }`}
              >
                <Server className="w-7 h-7 text-slate-950 mb-0.5 drop-shadow-md" />
                <span className="text-[11px] font-black text-slate-950 text-center leading-tight">
                  API Gateway
                </span>
                <span className="text-[9px] font-extrabold text-amber-950">NestJS BFF</span>
                <span className={`text-[8px] font-extrabold mt-1 px-1.5 py-0.5 rounded shadow ${healthData?.status === 'Healthy' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-red-950 text-amber-300 border border-amber-500/40'
                  }`}>
                  {healthData?.status || 'Connecting...'}
                </span>
              </div>

              {/* Sub-Nodes with serviceStatuses & healthData as combined source of truth */}
              {services.map((s) => {
                const Icon = s.icon;
                const directStatus = serviceStatuses[s.apiKey];
                const gatewayEntry = healthData?.entries?.[s.apiKey];
                const isHealthy = directStatus === 'Healthy' || gatewayEntry?.status === 'Healthy';
                const isDegraded = !isHealthy && (directStatus === 'Degraded' || directStatus === 'Pending' || gatewayEntry?.status === 'Degraded');
                const isNodePresent = !!directStatus || !!gatewayEntry;
                const isSelected = selectedServiceId === s.id;
                const isLit = litNodes.includes(s.id);

                return (
                  <div
                    key={s.id}
                    id={`node-${s.id}`}
                    onClick={() => isLit && setSelectedServiceId(s.id)}
                    className={`microservice-node node-${s.id} absolute -translate-x-1/2 -translate-y-1/2 border rounded-xl p-2 flex items-center gap-2 shadow-lg z-10 cursor-pointer transition-colors duration-300 ${
                      !isLit
                        ? 'bg-slate-950/90 border-slate-900 text-slate-700 opacity-15 grayscale shadow-none pointer-events-none'
                        : isSelected
                        ? 'ring-2 ring-cyan-400 bg-slate-900 border-cyan-400 text-cyan-300 shadow-cyan-500/40 opacity-100'
                        : isHealthy
                        ? 'bg-slate-900/95 border-emerald-500/60 text-emerald-400 shadow-emerald-950/40 opacity-100 hover:border-emerald-400'
                        : isDegraded
                        ? 'bg-slate-900/95 border-amber-500/50 text-amber-400 shadow-amber-950/40 opacity-100 hover:border-amber-400'
                        : 'bg-slate-900/95 border-red-500/50 text-red-400 shadow-red-950/40 opacity-100 hover:border-red-400'
                    }`}
                    style={{ left: `${s.x}%`, top: `${s.y}%` }}
                  >
                    <div className={`p-1.5 rounded-lg shadow-inner ${
                      isHealthy
                        ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/30'
                        : isDegraded
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : isNodePresent
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : 'bg-slate-800 text-slate-500'
                      }`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-left leading-tight pr-1">
                      <div className="flex items-center gap-1">
                        <p className="text-[11px] font-bold text-slate-200">{s.name}</p>
                        <span className="text-[8px] px-1 py-0.2 bg-slate-800 text-cyan-300 rounded font-mono border border-slate-700">{s.tech}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {isHealthy ? (
                          <>
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                            <span className="text-[9px] text-emerald-400 font-bold">Healthy</span>
                          </>
                        ) : isDegraded ? (
                          <>
                            <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-400" />
                            <span className="text-[9px] text-amber-400 font-bold">Waking...</span>
                          </>
                        ) : isNodePresent ? (
                          <>
                            <XCircle className="w-2.5 h-2.5 text-red-400" />
                            <span className="text-[9px] text-red-400 font-bold">Unreachable</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-2.5 h-2.5 animate-spin text-slate-500" />
                            <span className="text-[9px] text-slate-500 font-medium">Polling...</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {errorMessage && (
              <div className="flex items-center justify-between text-xs text-amber-300 bg-gradient-to-r from-amber-500/10 to-rose-500/10 border border-amber-500/30 px-3 py-2 rounded-xl mt-1 shadow-lg">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400 animate-bounce" />
                  {errorMessage}
                </span>
                {healthData && healthData.status === 'Unhealthy' && (
                  <button
                    onClick={onReady}
                    className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-300 hover:text-white bg-gradient-to-r from-amber-500/30 to-orange-500/30 hover:from-amber-500 hover:to-orange-500 px-2.5 py-1 rounded-lg border border-amber-500/50 transition-all cursor-pointer shrink-0 ml-1 shadow"
                  >
                    Bỏ Qua <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Cột 3: Giới thiệu dự án với các Card Tỏa Sáng Neon */}
          <section className="panel-card col-span-4 flex flex-col gap-3 justify-between">

            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:border-pink-500/40 transition-all duration-500">
              <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/10 rounded-bl-full pointer-events-none group-hover:bg-pink-500/20 transition-all" />
              <div className="flex items-center gap-2 text-pink-400 text-xs font-black uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4 text-pink-400" /> QuickBite Platform
              </div>
              <h2 className="text-base font-extrabold text-white mb-1">
                Admin & Merchant Portal
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Nền tảng quản lý giao đồ ăn theo kiến trúc <strong>Polyglot Microservices</strong>. React 18 + Vite + Tailwind CSS giao tiếp độc quyền qua API Gateway BFF.
              </p>
            </div>

            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 shadow-xl group hover:border-purple-500/40 transition-all duration-500">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-400" /> Polyglot Tech Matrix
                </span>
                <span className="text-[10px] text-purple-300 font-mono">Multilanguage</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="tech-badge-glow bg-slate-950/70 border border-slate-800 rounded-xl p-2 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-md shadow-rose-500/50" />
                  <div>
                    <p className="text-[11px] font-extrabold text-slate-100">NestJS 11 BFF</p>
                    <p className="text-[9px] text-slate-400">Gateway (Redis+Mongo)</p>
                  </div>
                </div>

                <div className="tech-badge-glow bg-slate-950/70 border border-slate-800 rounded-xl p-2 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-md shadow-cyan-400/50" />
                  <div>
                    <p className="text-[11px] font-extrabold text-slate-100">NestJS 11</p>
                    <p className="text-[9px] text-slate-400">Catalog (PostgreSQL)</p>
                  </div>
                </div>

                <div className="tech-badge-glow bg-slate-950/70 border border-slate-800 rounded-xl p-2 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-md shadow-purple-400/50" />
                  <div>
                    <p className="text-[11px] font-extrabold text-slate-100">.NET 10 / ABP</p>
                    <p className="text-[9px] text-slate-400">Identity(PG) & Order(MySQL)</p>
                  </div>
                </div>

                <div className="tech-badge-glow bg-slate-950/70 border border-slate-800 rounded-xl p-2 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-md shadow-emerald-400/50" />
                  <div>
                    <p className="text-[11px] font-extrabold text-slate-100">Spring Boot 3.3</p>
                    <p className="text-[9px] text-slate-400">Payment & Inv (PG)</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 shadow-xl group hover:border-amber-500/40 transition-all duration-500">
              <div className="flex items-center gap-2 text-xs font-black text-amber-400 uppercase tracking-wider mb-2">
                <Zap className="w-4 h-4 text-amber-400" /> Phân Quyền RBAC
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0 shadow-sm shadow-amber-400" />
                  <span><strong>Role Admin (`/admin`):</strong> Quản lý người dùng, duyệt nhà hàng & đơn mở quán (ACID Transaction), kiểm duyệt danh mục, giám sát đơn hàng.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0 shadow-sm shadow-orange-400" />
                  <span><strong>Role Merchant (`/merchant`):</strong> Kênh POS đối tác, thiết kế menu (Variants/Toppings JSONB), quản lý 3 chỉ số tồn kho, xử lý đơn live.</span>
                </li>
              </ul>
            </div>
          </section>
        </div>

        {/* MOBILE LAYOUT (< lg): Grid Card 2 Cột Đầy Màu Sắc Rực Rỡ */}
        <div className="block lg:hidden space-y-3">

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 rounded-xl text-slate-950 font-black shadow-lg">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white leading-tight">NestJS API Gateway</h3>
                <p className="text-[10px] text-cyan-300 font-mono">Central BFF Router & Auth Proxy</p>
              </div>
            </div>

            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold shadow ${healthData?.status === 'Healthy'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
              {healthData?.status || 'Connecting'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-cyan-400 px-1 pt-1">
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-amber-400">
              <Network className="w-3.5 h-3.5" /> Node Health Matrix
            </span>
            <span className="text-[10px] font-normal text-slate-400 font-mono">6 Microservices</span>
          </div>

          {/* Grid 2 Cột Màu Mè Tuyệt Đẹp Cho Mobile */}
          <div className="grid grid-cols-2 gap-2.5">
            {services.map((s) => {
              const Icon = s.icon;
              const nodeEntry = healthData?.entries?.[s.apiKey];
              const isHealthy = nodeEntry?.status === 'Healthy';
              const isNodePresent = !!nodeEntry;
              const isLit = litNodes.includes(s.id);

              return (
                <div
                  key={s.id}
                  className={`border rounded-xl p-2.5 flex items-center gap-2 shadow-lg transition-colors duration-300 ${
                    !isLit
                      ? 'bg-slate-950/90 border-slate-900 text-slate-700 opacity-20 grayscale shadow-none'
                      : isHealthy
                      ? 'bg-slate-900/90 border-emerald-500/50 text-emerald-300 shadow-emerald-950/30 opacity-100'
                      : isNodePresent
                      ? 'bg-slate-900/90 border-amber-500/50 text-amber-300 shadow-amber-950/30 opacity-100'
                      : 'bg-slate-900/60 border-slate-800 text-slate-500 opacity-100'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 ${isHealthy ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/30' : isNodePresent ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-500'
                    }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 leading-tight">
                    <p className="text-[11px] font-bold text-slate-100 truncate">{s.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {isHealthy ? (
                        <>
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                          <span className="text-[9px] text-emerald-400 font-bold">Healthy</span>
                        </>
                      ) : isNodePresent ? (
                        <>
                          <XCircle className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                          <span className="text-[9px] text-amber-400 font-bold">Unhealthy</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-2.5 h-2.5 animate-spin text-slate-500 shrink-0" />
                          <span className="text-[9px] text-slate-500 font-medium">Polling...</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {errorMessage && (
            <div className="flex items-center justify-between text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-2 rounded-xl mt-2">
              <span className="flex items-center gap-1.5 text-[10px] min-w-0 truncate">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span className="truncate">{errorMessage}</span>
              </span>
              {healthData && healthData.status === 'Unhealthy' && (
                <button
                  onClick={onReady}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 hover:text-white bg-amber-500/20 px-2 py-1 rounded-lg border border-amber-500/40 transition-all cursor-pointer shrink-0 ml-1 shadow"
                >
                  Bỏ Qua <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

      </main>

      {/* Footer Cyber Disclaimer */}
      <footer className="w-full max-w-7xl mx-auto text-center text-[10px] text-slate-500 border-t border-slate-900 pt-2 z-10">
        QuickBite Platform &copy; 2026. Built with React 19, Vite 8 & Tailwind CSS v4. Powered by Polyglot Microservices.
      </footer>
    </div>
  );
};

export default BootScreen;
