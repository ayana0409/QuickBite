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
    tech: 'NestJS / TypeScript',
    db: 'In-Memory / Redis',
    pattern: 'Backend-For-Frontend (BFF)',
    color: 'from-amber-400 via-orange-500 to-red-500',
    gradient: 'text-amber-400',
    description: 'Cổng giao tiếp duy nhất cho Admin & Merchant Portal. Chịu trách nhiệm định tuyến, JWT Auth Validation, Rate Limiting và tập hợp Health Status của toàn hệ thống.',
    architecture: [
      'NestJS Axios Interceptors proxy request tới downstream services',
      'Terminus Health Check Aggregator kiểm tra sức khỏe 6 node backend',
      'Xác thực Bearer JWT Token & chuyển hướng phân quyền RBAC',
      'Bảo vệ hạ tầng với Rate Limiter & Security Helmet'
    ]
  },
  redis: {
    id: 'redis',
    apiKey: 'redis',
    name: 'Redis Distributed Cache',
    tech: 'Redis 7.x In-Memory',
    db: 'Key-Value Store',
    pattern: 'Cache-Aside & Rate Limiter',
    color: 'from-pink-500 via-rose-500 to-red-500',
    gradient: 'text-pink-400',
    description: 'Hệ thống bộ nhớ đệm phân tán hỗ trợ truy xuất thực đơn nhanh cấp độ ms và lưu trữ tạm thời các session/rate-limit token.',
    architecture: [
      'Cache thực đơn nhà hàng & danh mục món ăn hot',
      'Session storage & Token blacklist kiểm tra tức thì',
      'Giảm tải truy vấn trực tiếp xuống PostgreSQL & MongoDB'
    ]
  },
  identity: {
    id: 'identity',
    apiKey: 'identity_service',
    name: 'Identity Service',
    tech: '.NET 8 Clean Architecture',
    db: 'SQL Server (AbpUsers)',
    pattern: 'OAuth2 / OpenIddict / Outbox',
    color: 'from-purple-500 via-indigo-500 to-blue-500',
    gradient: 'text-purple-400',
    description: 'Dịch vụ xác thực và phân quyền người dùng tập trung. Đảm bảo an toàn tài khoản cho Admin, Merchant và Customer với JWT Tokens.',
    architecture: [
      'Bảng AbpUsers, AbpRoles, AbpPermissionGrants (Customer, Merchant, Admin)',
      'OpenIddict cấp phát & refresh Access/Refresh Tokens',
      'Transactional Outbox Pattern đẩy sự kiện `user.registered` qua Kafka',
      'Khóa tài khoản tự động (Lockout) khi đăng nhập sai quá số lần'
    ]
  },
  catalog: {
    id: 'catalog',
    apiKey: 'catalog_service',
    name: 'Catalog Service',
    tech: 'NestJS / Go',
    db: 'MongoDB (UUID unified)',
    pattern: 'CQRS Read Model / Document Store',
    color: 'from-cyan-400 via-teal-500 to-emerald-500',
    gradient: 'text-cyan-400',
    description: 'Quản lý thông tin Nhà hàng (Restaurants), Danh mục món (Categories) và Thực đơn (FoodItems). Đồng bộ UUID nhất quán toàn hệ thống.',
    architecture: [
      'Cấu trúc NoSQL MongoDB phản ánh Nhà hàng -> Category -> FoodItem',
      'Thuộc tính ownerId xác định chủ sở hữu nhà hàng cho Merchant',
      'Phát sự kiện Kafka đồng bộ danh mục món ăn sang Order Service',
      'Hỗ trợ cập nhật trạng thái món ăn (isAvailable) theo thời gian thực'
    ]
  },
  order: {
    id: 'order',
    apiKey: 'order_service',
    name: 'Order Service',
    tech: '.NET 8 MassTransit',
    db: 'PostgreSQL (orders, saga_states)',
    pattern: 'Saga State Machine Orchestration',
    color: 'from-amber-400 via-orange-500 to-yellow-500',
    gradient: 'text-amber-400',
    description: 'Trái tim điều phối đơn hàng QuickBite với Saga Pattern. Xử lý luồng đặt hàng, xác nhận nhà hàng, timeout 15 phút & hoàn tiền tự động.',
    architecture: [
      'Saga Orchestration: Initial -> StockReserved -> PaymentAuthorized -> Confirmed',
      'Timeout 15 phút AwaitingRestaurantAcceptance: Tự hủy & Nhả kho/Hoàn tiền nếu nhà hàng không xác nhận',
      'Transactional Outbox & Inbox Messages đảm bảo Eventual Consistency',
      'Lưu trữ lịch sử đổi trạng thái đơn hàng (order_status_history)'
    ]
  },
  payment: {
    id: 'payment',
    apiKey: 'payment_service',
    name: 'Payment Service',
    tech: 'Java 21 Spring Boot',
    db: 'PostgreSQL (payments)',
    pattern: 'Saga Participant & Idempotency',
    color: 'from-emerald-400 via-teal-500 to-green-500',
    gradient: 'text-emerald-400',
    description: 'Xử lý thanh toán đa kênh (VNPay, MoMo, Banking QR, COD). Tích hợp cơ chế Idempotency chống trùng lặp giao dịch.',
    architecture: [
      'Tích hợp VNPay / MoMo API & QR Banking Gateway',
      'Idempotency Key validation đảm bảo không trừ tiền 2 lần',
      'Saga Participant: Thực thi lệnh Hold Money (Authorize) & Refund khi đơn hủy',
      'Ghi log giao dịch thanh toán chi tiết (payment_transactions)'
    ]
  },
  inventory: {
    id: 'inventory',
    apiKey: 'inventory_service',
    name: 'Inventory Service',
    tech: 'Java 21 Spring Boot',
    db: 'PostgreSQL (inventories)',
    pattern: 'Pessimistic Locking & Reservation',
    color: 'from-blue-400 via-indigo-500 to-violet-500',
    gradient: 'text-blue-400',
    description: 'Quản lý tồn kho nguyên liệu & số lượng món ăn. Đảm bảo không xảy ra Over-selling khi có lượng truy cập lớn.',
    architecture: [
      'Quản lý số lượng tồn kho on_hand và số lượng giữ chỗ reserved',
      'Pessimistic Lock ngăn chặn Race Condition khi hàng nghìn khách đặt cùng món',
      'Reservation Timeout: Tự động giải phóng kho khi khách không hoàn tất thanh toán'
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

  // Danh sách các Microservices trong Polyglot Architecture
  const services: ServiceNode[] = [
    { id: 'redis', apiKey: 'redis', name: 'Redis Cache', tech: 'Cache', color: 'from-pink-500 to-rose-600', gradient: 'pink', icon: HardDrive, x: 20, y: 15 },
    { id: 'identity', apiKey: 'identity_service', name: 'Identity', tech: '.NET 8', color: 'from-purple-500 to-indigo-600', gradient: 'purple', icon: Shield, x: 80, y: 15 },
    { id: 'catalog', apiKey: 'catalog_service', name: 'Catalog', tech: 'NestJS', color: 'from-cyan-400 to-emerald-500', gradient: 'cyan', icon: Database, x: 14, y: 52 },
    { id: 'inventory', apiKey: 'inventory_service', name: 'Inventory', tech: 'Java', color: 'from-blue-400 to-indigo-500', gradient: 'blue', icon: Boxes, x: 86, y: 52 },
    { id: 'order', apiKey: 'order_service', name: 'Order', tech: '.NET 8', color: 'from-amber-400 to-orange-500', gradient: 'amber', icon: ShoppingBag, x: 26, y: 86 },
    { id: 'payment', apiKey: 'payment_service', name: 'Payment', tech: 'Java', color: 'from-emerald-400 to-teal-500', gradient: 'emerald', icon: CreditCard, x: 74, y: 86 },
  ];

  // Selected Service Detail object
  const activeDetail = SERVICE_DETAILS[selectedServiceId] || SERVICE_DETAILS.gateway;

  // 1. Lazy load animejs với các hiệu ứng động "MÀU MÈ" rực rỡ
  useEffect(() => {
    let isSubscribed = true;

    import('animejs')
      .then((animeModule: any) => {
        if (!isSubscribed) return;

        // Animation 1: Center Gateway Node neon pulse & float
        animationRef.current = safeAnimate(animeModule, {
          targets: '#gateway-node',
          scale: [0.95, 1.08],
          rotate: [-1, 1],
          boxShadow: [
            '0 0 25px rgba(245, 158, 11, 0.5), 0 0 50px rgba(236, 72, 153, 0.3)',
            '0 0 55px rgba(245, 158, 11, 0.9), 0 0 90px rgba(6, 182, 212, 0.5)'
          ],
          direction: 'alternate',
          loop: true,
          easing: 'easeInOutSine',
          duration: 1200,
        });

        // Animation 2: Cyber Floating Orbs lơ lửng nhiều màu sắc
        safeAnimate(animeModule, {
          targets: '.cyber-orb',
          translateY: 20,
          translateX: 15,
          scale: [0.8, 1.3],
          opacity: [0.3, 0.8],
          direction: 'alternate',
          loop: true,
          easing: 'easeInOutQuad',
          duration: 3000,
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
          translateY: [40, 0],
          opacity: [0, 1],
          easing: 'easeOutExpo',
          duration: 1000,
        });

        // Animation 5: Glowing Neon Badges Pulse
        safeAnimate(animeModule, {
          targets: '.tech-badge-glow',
          scale: [0.95, 1.05],
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

  // Trigger Anime.js hiệu ứng nổ nhẹ khi chọn Service Node
  useEffect(() => {
    import('animejs')
      .then((animeModule: any) => {
        safeAnimate(animeModule, {
          targets: '#service-detail-card',
          scale: [0.95, 1],
          opacity: [0.2, 1],
          easing: 'easeOutQuad',
          duration: 500,
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

    // 0s: Kích nổ Gateway ở giữa
    import('animejs')
      .then((animeModule: any) => {
        if (isCancelled) return;
        safeAnimate(animeModule, {
          targets: '#gateway-node',
          scale: [0.1, 1.25, 1],
          opacity: [0, 1],
          easing: 'easeOutQuad',
          duration: 800,
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

  // Kích nổ animation mỗi khi cặp node mới gia nhập litNodes
  useEffect(() => {
    if (litNodes.length <= 1) return;
    const last1 = litNodes[litNodes.length - 1];
    const last2 = litNodes[litNodes.length - 2];

    import('animejs')
      .then((animeModule: any) => {
        safeAnimate(animeModule, {
          targets: `#node-${last1}, #node-${last2}, .line-${last1}, .line-${last2}`,
          scale: [0.5, 1.25, 1],
          opacity: [0.1, 1],
          easing: 'easeOutQuad',
          duration: 800,
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

  // 2. Logic ping trực tiếp từng service song song + poll Gateway liên tục
  useEffect(() => {
    let isCancelled = false;
    let gatewayTimer: ReturnType<typeof setTimeout> | null = null;

    // Periodically poll Gateway /health to keep Redis, MongoDB, System Resources & overall status updated
    const pollGateway = async () => {
      try {
        const rawRes: any = await axiosClient.get('/health');
        if (!isCancelled) {
          const parsed = parseHealthPayload(rawRes);
          if (parsed) setHealthData(parsed);
          setErrorMessage('API Gateway online. Đang theo dõi các microservices...');
        }
      } catch (err: any) {
        if (!isCancelled) {
          const parsedError = parseHealthPayload(err.response?.data);
          if (parsedError) setHealthData(parsedError);
        }
      } finally {
        if (!isCancelled) {
          gatewayTimer = setTimeout(pollGateway, 3000);
        }
      }
    };

    // Direct ping to each service: hold connection until Render wakes container
    const pingServiceDirectly = async (serviceKey: string, urls: string[]) => {
      if (!urls || urls.length === 0) {
        setServiceStatuses((prev) => ({ ...prev, [serviceKey]: 'Unhealthy' }));
        return;
      }

      setServiceStatuses((prev) => ({ ...prev, [serviceKey]: 'Degraded' }));
      let retries = 0;
      const maxRetries = 15;

      while (retries < maxRetries && !isCancelled) {
        for (const url of urls) {
          if (isCancelled) return;
          try {
            const res = await fetch(url, {
              method: 'GET',
              headers: { 'Accept': 'application/json, text/plain, */*' },
              signal: AbortSignal.timeout(120000), // 2 minutes max per attempt
            });

            if (isCancelled) return;

            // If HTTP status is 200-299, container IS UP AND ALIVE!
            if (res.ok) {
              let body: any = null;
              try {
                body = await res.json();
              } catch {
                body = { status: 'Healthy' };
              }

              if (isCancelled) return;

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
              return; // Done for this service!
            }
          } catch {
            // Timeout or network error, continue to next URL or retry
          }
        }

        if (!isCancelled) {
          await new Promise((r) => setTimeout(r, 8000));
          retries++;
        }
      }

      if (!isCancelled) {
        setServiceStatuses((prev) => ({ ...prev, [serviceKey]: 'Unhealthy' }));
      }
    };

    const initialDelay = setTimeout(() => {
      if (isCancelled) return;
      // 1. Start continuous Gateway polling
      pollGateway();
      // 2. Ping ALL microservices directly in parallel
      Object.entries(SERVICE_URLS).forEach(([key, urls]) => {
        pingServiceDirectly(key, urls);
      });
    }, 1000);

    return () => {
      isCancelled = true;
      clearTimeout(initialDelay);
      if (gatewayTimer) clearTimeout(gatewayTimer);
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
      setRedirectCountdown(3);
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

              {/* Gateway Node với hiệu ứng Hào Quang Neon Rực Rỡ */}
              <div
                id="gateway-node"
                onClick={() => setSelectedServiceId('gateway')}
                className={`absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-2xl flex flex-col items-center justify-center p-2 shadow-2xl z-20 cursor-pointer border transition-all duration-500 ${selectedServiceId === 'gateway'
                  ? 'bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 border-white scale-110 shadow-amber-500/80 ring-4 ring-amber-400/40'
                  : 'bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 border-amber-300/40 opacity-95 hover:scale-105'
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
                    className={`microservice-node node-${s.id} absolute -translate-x-1/2 -translate-y-1/2 border rounded-xl p-2 flex items-center gap-2 shadow-2xl z-10 cursor-pointer transition-all duration-700 hover:scale-110 ${
                      !isLit
                        ? 'bg-slate-950/90 border-slate-900 text-slate-700 opacity-15 grayscale scale-90 shadow-none pointer-events-none'
                        : isSelected
                        ? `ring-4 ring-cyan-400/50 bg-slate-900 border-cyan-400 text-cyan-300 shadow-cyan-500/50 scale-105 opacity-100`
                        : isHealthy
                        ? 'bg-slate-900/95 border-emerald-500/60 text-emerald-400 shadow-emerald-950/40 opacity-100'
                        : isDegraded
                        ? 'bg-slate-900/95 border-amber-500/50 text-amber-400 shadow-amber-950/40 opacity-100'
                        : 'bg-slate-900/95 border-red-500/50 text-red-400 shadow-red-950/40 opacity-100'
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
                    <p className="text-[11px] font-extrabold text-slate-100">NestJS BFF</p>
                    <p className="text-[9px] text-slate-400">Gateway BFF</p>
                  </div>
                </div>

                <div className="tech-badge-glow bg-slate-950/70 border border-slate-800 rounded-xl p-2 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-md shadow-cyan-400/50" />
                  <div>
                    <p className="text-[11px] font-extrabold text-slate-100">NestJS</p>
                    <p className="text-[9px] text-slate-400">Catalog API</p>
                  </div>
                </div>

                <div className="tech-badge-glow bg-slate-950/70 border border-slate-800 rounded-xl p-2 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-md shadow-purple-400/50" />
                  <div>
                    <p className="text-[11px] font-extrabold text-slate-100">.NET 8 Clean</p>
                    <p className="text-[9px] text-slate-400">Identity & Order</p>
                  </div>
                </div>

                <div className="tech-badge-glow bg-slate-950/70 border border-slate-800 rounded-xl p-2 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-md shadow-emerald-400/50" />
                  <div>
                    <p className="text-[11px] font-extrabold text-slate-100">Java Spring</p>
                    <p className="text-[9px] text-slate-400">Payment & Inventory</p>
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
                  <span><strong>Role Admin (`/admin`):</strong> Quản lý nhà hàng, onboarding đối tác, chỉ định `ownerId`.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0 shadow-sm shadow-orange-400" />
                  <span><strong>Role Merchant (`/merchant`):</strong> Kênh người bán, quản lý thực đơn & duyệt đơn hàng real-time.</span>
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
                  className={`border rounded-xl p-2.5 flex items-center gap-2 shadow-lg transition-all duration-700 ${
                    !isLit
                      ? 'bg-slate-950/90 border-slate-900 text-slate-700 opacity-20 grayscale scale-95 shadow-none'
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
        QuickBite Platform &copy; 2026. Built with React 18, Vite & Tailwind CSS. Powered by Polyglot Microservices.
      </footer>
    </div>
  );
};

export default BootScreen;
