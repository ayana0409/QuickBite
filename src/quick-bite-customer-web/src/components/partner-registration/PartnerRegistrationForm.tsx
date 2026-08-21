"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Store,
  MapPin,
  Building,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Compass,
  FileText,
  Clock,
  Lock,
  Navigation,
  Wand2,
  ExternalLink,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useUiStore } from "@/src/store/ui.store";
import { submitRestaurantRegistration, getMyRegistrationRequest } from "@/src/lib/api/request";
import { getMyRestaurant } from "@/src/lib/api/catalog";
import { CatalogRequest, CatalogRequestStatus, RestaurantRegistrationPayload } from "@/src/types/request.type";
import { Restaurant } from "@/src/types/catalog.type";
import { fetchAddressFromCoordinates } from "@/src/lib/utils/geocoding";

/**
 * Dynamically import Leaflet Map component with SSR disabled to prevent window is not defined errors
 */
const MapPicker = dynamic(
  () => import("./MapPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-72 sm:h-80 rounded-2xl bg-slate-50 border border-dashed border-orange-200 flex flex-col items-center justify-center text-slate-400 gap-2">
        <Loader2 className="w-7 h-7 text-orange-500 animate-spin" />
        <span className="text-xs font-semibold text-slate-600">Đang tải bản đồ OpenStreetMap...</span>
      </div>
    ),
  }
);

/**
 * Client-side validation schema using Zod
 */
const partnerRegistrationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Tên quán ăn / nhà hàng phải có tối thiểu 3 ký tự")
    .max(100, "Tên nhà hàng không vượt quá 100 ký tự"),
  slug: z
    .string()
    .trim()
    .min(3, "Slug phải có tối thiểu 3 ký tự")
    .max(100, "Slug không vượt quá 100 ký tự")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug chỉ bao gồm chữ cái viết thường, chữ số và dấu gạch nối (ví dụ: pho-ha-noi)"
    ),
  line1: z
    .string()
    .trim()
    .min(3, "Địa chỉ chi tiết (số nhà, tên đường) phải có tối thiểu 3 ký tự"),
  ward: z.string().trim().min(1, "Vui lòng nhập Phường / Xã"),
  district: z.string().trim().min(1, "Vui lòng nhập Quận / Huyện"),
  city: z.string().trim().min(1, "Vui lòng nhập Tỉnh / Thành phố"),
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
});

type PartnerRegistrationFormData = z.infer<typeof partnerRegistrationSchema>;

/**
 * Utility function to convert Vietnamese text to a clean URL slug
 */
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export default function PartnerRegistrationForm() {
  const { data: session, status } = useSession();
  const openAuthModal = useUiStore((state) => state.openAuthModal);

  const [isLoadingCheck, setIsLoadingCheck] = useState<boolean>(true);
  const [existingRestaurant, setExistingRestaurant] = useState<Restaurant | null>(null);
  const [existingRequest, setExistingRequest] = useState<CatalogRequest<RestaurantRegistrationPayload> | null>(null);
  const [isRetryingRejected, setIsRetryingRejected] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdRequest, setCreatedRequest] = useState<CatalogRequest<RestaurantRegistrationPayload> | null>(null);
  const [isManualSlug, setIsManualSlug] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isFetchingAddress, setIsFetchingAddress] = useState<boolean>(false);
  const [addressNotice, setAddressNotice] = useState<{ type: "success" | "warn"; text: string } | null>(null);

  const latestReqIdRef = useRef<number>(0);

  const merchantUrl =
    process.env.NEXT_PUBLIC_MERCHANT_URL || "https://quick-bite-merchant.onrender.com";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PartnerRegistrationFormData>({
    resolver: zodResolver(partnerRegistrationSchema),
    defaultValues: {
      name: "",
      slug: "",
      line1: "",
      ward: "",
      district: "",
      city: "Hồ Chí Minh",
      longitude: 106.702444,
      latitude: 10.776192,
    },
  });

  const restaurantName = watch("name");
  const currentLatitude = watch("latitude") ?? 10.776192;
  const currentLongitude = watch("longitude") ?? 106.702444;

  // Check initial state: restaurant ownership and existing requests
  useEffect(() => {
    let isMounted = true;

    async function checkUserStatus() {
      if (status === "loading") return;
      if (status === "unauthenticated" || !session?.accessToken) {
        if (isMounted) setIsLoadingCheck(false);
        return;
      }

      setIsLoadingCheck(true);
      try {
        const [myRestaurant, myRequest] = await Promise.all([
          getMyRestaurant(session.accessToken),
          getMyRegistrationRequest(session.accessToken),
        ]);

        if (isMounted) {
          setExistingRestaurant(myRestaurant);
          setExistingRequest(myRequest);
        }
      } catch (err) {
        console.warn("[PartnerRegistration] Error checking user restaurant status:", err);
      } finally {
        if (isMounted) setIsLoadingCheck(false);
      }
    }

    checkUserStatus();

    return () => {
      isMounted = false;
    };
  }, [session?.accessToken, status]);

  // Auto-generate slug when name changes if user has not manually modified it
  useEffect(() => {
    if (!isManualSlug && restaurantName) {
      setValue("slug", slugify(restaurantName), { shouldValidate: true });
    }
  }, [restaurantName, isManualSlug, setValue]);

  // Reverse Geocoding & Address Auto-fill Handler
  const handleMapPositionChange = async (pos: [number, number]) => {
    const lat = parseFloat(pos[0].toFixed(6));
    const lng = parseFloat(pos[1].toFixed(6));

    // Update GPS coordinates in form
    setValue("latitude", lat, { shouldValidate: true });
    setValue("longitude", lng, { shouldValidate: true });

    // Reverse geocode address using OpenStreetMap Nominatim
    const requestId = ++latestReqIdRef.current;
    setIsFetchingAddress(true);
    setAddressNotice(null);

    try {
      const geoResult = await fetchAddressFromCoordinates(lat, lng);

      // Check if this is still the latest user click
      if (requestId !== latestReqIdRef.current) return;

      if (geoResult) {
        let hasUpdatedAnyField = false;

        if (geoResult.line1) {
          setValue("line1", geoResult.line1, { shouldValidate: true });
          hasUpdatedAnyField = true;
        }
        if (geoResult.ward) {
          setValue("ward", geoResult.ward, { shouldValidate: true });
          hasUpdatedAnyField = true;
        }
        if (geoResult.district) {
          setValue("district", geoResult.district, { shouldValidate: true });
          hasUpdatedAnyField = true;
        }
        if (geoResult.city) {
          setValue("city", geoResult.city, { shouldValidate: true });
          hasUpdatedAnyField = true;
        }

        if (hasUpdatedAnyField) {
          setAddressNotice({
            type: "success",
            text: "Đã tự động điền địa chỉ từ bản đồ. Bạn có thể kiểm tra và chỉnh sửa nếu cần.",
          });
        } else {
          setAddressNotice({
            type: "warn",
            text: "Không nhận diện được chi tiết địa chỉ tại tọa độ này. Vui lòng tự nhập địa chỉ.",
          });
        }
      } else {
        setAddressNotice({
          type: "warn",
          text: "Không thể lấy thông tin địa chỉ từ bản đồ. Vui lòng tự nhập địa chỉ chi tiết.",
        });
      }
    } catch (err) {
      console.warn("[PartnerRegistration] Reverse geocoding error:", err);
      setAddressNotice({
        type: "warn",
        text: "Không thể tự động dịch địa chỉ. Vui lòng tự nhập địa chỉ.",
      });
    } finally {
      if (requestId === latestReqIdRef.current) {
        setIsFetchingAddress(false);
      }
    }
  };

  // Browser Geolocation integration
  const handleGetCurrentLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      alert("Trình duyệt không hỗ trợ định vị GPS.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleMapPositionChange([position.coords.latitude, position.coords.longitude]);
        setIsLocating(false);
      },
      (error) => {
        console.warn("Geolocation error:", error.message);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Form submission handler
  const onSubmit = async (data: PartnerRegistrationFormData) => {
    if (!session?.accessToken) {
      setErrorMessage("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      openAuthModal();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: RestaurantRegistrationPayload = {
        name: data.name,
        slug: data.slug,
        address: {
          line1: data.line1,
          ward: data.ward,
          district: data.district,
          city: data.city,
          geo: {
            type: "Point",
            coordinates: [data.longitude, data.latitude],
          },
        },
      };

      const result = await submitRestaurantRegistration(payload, session.accessToken);
      setCreatedRequest(result);
      setExistingRequest(result);
    } catch (error: any) {
      console.error("[PartnerRegistration] Submission failed:", error);
      setErrorMessage(
        error?.message ||
          "Gửi hồ sơ đăng ký thất bại. Vui lòng kiểm tra lại thông tin và thử lại sau."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading State while verifying account status
  if (isLoadingCheck && status === "authenticated") {
    return (
      <div className="bg-white rounded-3xl border border-orange-100 shadow-xl p-12 text-center max-w-2xl mx-auto flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <p className="text-sm font-semibold text-slate-700">Đang kiểm tra thông tin tài khoản đối tác...</p>
      </div>
    );
  }

  // State 1: Unauthenticated Guard
  if (status === "unauthenticated" || (!session?.user && status !== "loading")) {
    return (
      <div className="bg-white rounded-3xl border border-orange-100 shadow-xl p-8 sm:p-12 text-center max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
          Yêu Cầu Đăng Nhập
        </h2>
        <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto leading-relaxed">
          Bạn cần đăng nhập tài khoản QuickBite để gửi hồ sơ đăng ký đối tác nhà hàng và quản lý tiến độ phê duyệt.
        </p>
        <button
          type="button"
          onClick={openAuthModal}
          className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer inline-flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>Đăng nhập ngay</span>
        </button>
      </div>
    );
  }

  // State 2: User ALREADY HAS a Restaurant (Constraint: 1 account = 1 restaurant)
  if (existingRestaurant) {
    return (
      <div className="bg-white rounded-3xl border border-orange-200 shadow-xl p-8 sm:p-12 max-w-2xl mx-auto text-center animate-in zoom-in-95 fade-in duration-300">
        <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner ring-8 ring-orange-50">
          <Store className="w-10 h-10" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-bold mb-3">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Đã Sở Hữu Nhà Hàng</span>
        </span>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Bạn Đã Có Nhà Hàng Trên QuickBite
        </h2>
        <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          Mỗi tài khoản QuickBite chỉ được liên kết với một nhà hàng. Bạn có thể truy cập hệ thống Quản trị Đối tác (Merchant Portal) để quản lý thực đơn và đơn hàng.
        </p>

        {/* Existing Restaurant Summary Card */}
        <div className="mt-6 p-5 bg-slate-50 border border-slate-200/80 rounded-2xl text-left space-y-2.5 text-xs text-slate-700">
          <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
            <span className="text-slate-500">Tên quán ăn:</span>
            <span className="font-bold text-slate-900 text-sm">{existingRestaurant.name}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
            <span className="text-slate-500">Trạng thái:</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase">
              {existingRestaurant.status || "ACTIVE"}
            </span>
          </div>
          <div className="flex justify-between items-start py-1">
            <span className="text-slate-500 shrink-0 mr-4">Địa chỉ:</span>
            <span className="font-medium text-slate-900 text-right">
              {[
                existingRestaurant.address?.line1,
                existingRestaurant.address?.ward,
                existingRestaurant.address?.district,
                existingRestaurant.address?.city,
              ]
                .filter(Boolean)
                .join(", ")}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={merchantUrl}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-orange-500/25 transition-all hover:scale-105 active:scale-95 text-center inline-flex items-center justify-center gap-2"
          >
            <span>Vào Trang Quản Trị Nhà Hàng</span>
            <ExternalLink className="w-4 h-4" />
          </a>
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-all text-center"
          >
            Về Trang Chủ
          </Link>
        </div>
      </div>
    );
  }

  // Active or Pending Request to display
  const activeRequest = createdRequest || existingRequest;

  // State 3: User HAS A PENDING REQUEST (Do not allow creating another)
  if (activeRequest && activeRequest.status === CatalogRequestStatus.PENDING) {
    return (
      <div className="bg-white rounded-3xl border border-amber-200 shadow-xl p-8 sm:p-12 max-w-2xl mx-auto text-center animate-in zoom-in-95 fade-in duration-300">
        <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner ring-8 ring-amber-50">
          <Clock className="w-10 h-10" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold mb-3">
          <Clock className="w-3.5 h-3.5" />
          <span>Hồ Sơ Đang Chờ Xét Duyệt</span>
        </span>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Yêu Cầu Đang Được Xử Lý
        </h2>
        <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          Bạn đã có một hồ sơ đăng ký mở quán đang chờ xét duyệt. Bạn không thể tạo thêm yêu cầu mới trong thời gian này.
        </p>

        {/* Request Summary Card */}
        <div className="mt-6 p-5 bg-slate-50 border border-slate-200/80 rounded-2xl text-left space-y-2.5 text-xs text-slate-700">
          <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
            <span className="text-slate-500">Mã yêu cầu (Request ID):</span>
            <span className="font-mono font-bold text-slate-900 select-all">
              {activeRequest.id || "N/A"}
            </span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
            <span className="text-slate-500">Tên nhà hàng:</span>
            <span className="font-bold text-slate-900">
              {activeRequest.payload?.name}
            </span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
            <span className="text-slate-500">Trạng thái:</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
              <Clock className="w-3 h-3" />
              <span>Chờ kiểm duyệt (PENDING)</span>
            </span>
          </div>
          <div className="flex justify-between items-start py-1">
            <span className="text-slate-500 shrink-0 mr-4">Địa chỉ:</span>
            <span className="font-medium text-slate-900 text-right">
              {[
                activeRequest.payload?.address?.line1,
                activeRequest.payload?.address?.ward,
                activeRequest.payload?.address?.district,
                activeRequest.payload?.address?.city,
              ]
                .filter(Boolean)
                .join(", ")}
            </span>
          </div>
        </div>

        {/* Process Note */}
        <div className="mt-5 p-4 bg-orange-50/80 border border-orange-200/60 rounded-2xl flex items-start gap-3 text-left">
          <Clock className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          <p className="text-xs text-orange-950 leading-relaxed">
            Đội ngũ QuickBite sẽ liên hệ xác minh thông tin quán và xét duyệt hồ sơ trong vòng <strong>24h làm việc</strong>. Sau khi duyệt, tài khoản của bạn sẽ tự động được cấp quyền truy cập hệ thống Quản trị Nhà hàng (Merchant Portal).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-orange-500/25 transition-all hover:scale-105 active:scale-95 text-center"
          >
            Về Trang Chủ
          </Link>
        </div>
      </div>
    );
  }

  // State 4: Latest Request is REJECTED (Offer retry option)
  if (activeRequest && activeRequest.status === CatalogRequestStatus.REJECTED && !isRetryingRejected) {
    return (
      <div className="bg-white rounded-3xl border border-red-200 shadow-xl p-8 sm:p-12 max-w-2xl mx-auto text-center animate-in zoom-in-95 fade-in duration-300">
        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner ring-8 ring-red-50">
          <XCircle className="w-10 h-10" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold mb-3">
          <XCircle className="w-3.5 h-3.5" />
          <span>Hồ Sơ Bị Từ Chối</span>
        </span>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Hồ Sơ Đăng Ký Chưa Được Duyệt
        </h2>
        <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          Yêu cầu đăng ký nhà hàng của bạn đã bị từ chối với lý do bên dưới. Bạn có thể nộp lại hồ sơ mới đã được điều chỉnh.
        </p>

        {/* Rejection Note */}
        {activeRequest.adminNote && (
          <div className="mt-5 p-4 bg-red-50 border border-red-200 rounded-2xl text-left">
            <span className="block text-xs font-bold text-red-800 uppercase tracking-wider mb-1">
              Lý do từ chối từ Quản trị viên:
            </span>
            <p className="text-xs text-red-700 leading-relaxed font-medium">
              {activeRequest.adminNote}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setIsRetryingRejected(true)}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-orange-500/25 transition-all hover:scale-105 active:scale-95 text-center cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Nộp Lại Hồ Sơ Đăng Ký</span>
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-all text-center"
          >
            Về Trang Chủ
          </Link>
        </div>
      </div>
    );
  }

  // State 5: Active Registration Form (For new users or users re-applying)
  return (
    <div className="bg-white rounded-3xl border border-orange-100/90 shadow-xl overflow-hidden animate-in fade-in duration-200">
      {/* Card Header */}
      <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-orange-100 text-xs font-bold mb-3 backdrop-blur-sm">
            <Store className="w-3.5 h-3.5" />
            <span>Đăng Ký Đối Tác Ẩm Thực</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Mở Quán Trên QuickBite
          </h2>
          <p className="text-orange-100 text-xs sm:text-sm mt-1.5 leading-relaxed">
            Điền các thông tin cơ bản về quán ăn của bạn để bắt đầu tiếp cận hàng ngàn khách hàng mỗi ngày.
          </p>
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 sm:p-8 space-y-6">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200/80 rounded-2xl flex items-start gap-3 text-red-700 text-xs sm:text-sm animate-in slide-in-from-top-2 duration-150">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
            <div>
              <p className="font-bold">Đã có lỗi xảy ra</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Section 1: Thông tin cơ bản */}
        <div>
          <div className="flex items-center gap-2 pb-2 mb-4 border-b border-slate-100">
            <Building className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              1. Thông Tin Thương Hiệu
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Restaurant Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tên quán ăn / Nhà hàng <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ví dụ: Phở Thìn Lò Đúc - Chi nhánh 1"
                  {...register("name")}
                  className={`w-full pl-3.5 pr-4 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 outline-none transition-all ${
                    errors.name
                      ? "border-red-400 focus:border-red-500 bg-red-50/20"
                      : "border-slate-200 focus:border-orange-500"
                  }`}
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-xs text-red-500 font-medium">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Restaurant Slug */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Đường dẫn định danh (Slug) <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400">Tự động sinh từ tên quán</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="pho-thin-lo-duc-chi-nhanh-1"
                  {...register("slug", {
                    onChange: () => setIsManualSlug(true),
                  })}
                  className={`w-full pl-3.5 pr-4 py-2.5 text-sm bg-slate-50 border rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-orange-500/20 outline-none transition-all ${
                    errors.slug
                      ? "border-red-400 focus:border-red-500 bg-red-50/20"
                      : "border-slate-200 focus:border-orange-500"
                  }`}
                />
              </div>
              {errors.slug && (
                <p className="mt-1 text-xs text-red-500 font-medium">
                  {errors.slug.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Bản đồ tương tác OpenStreetMap (MapPicker) & Định vị GPS */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 mb-3 border-b border-slate-100 gap-2">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                2. Định Vị Vị Trí Trên Bản Đồ (GPS)
              </h3>
            </div>

            {/* Geolocation Button */}
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={isLocating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isLocating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Navigation className="w-3.5 h-3.5" />
              )}
              <span>Lấy vị trí hiện tại của tôi</span>
            </button>
          </div>

          <p className="text-xs text-slate-500 mb-3">
            Nhấp (click) trực tiếp lên bản đồ để ghim vị trí quán và <strong>tự động điền địa chỉ chi tiết</strong>:
          </p>

          {/* Interactive Leaflet Map Picker */}
          <div className="mb-3">
            <MapPicker
              position={[currentLatitude, currentLongitude]}
              setPosition={handleMapPositionChange}
            />
          </div>

          {/* Auto-fill Status Notification Indicator */}
          {isFetchingAddress && (
            <div className="mb-4 p-2.5 bg-orange-50 border border-orange-200/80 rounded-xl flex items-center gap-2 text-xs text-orange-800 animate-in fade-in duration-150">
              <Loader2 className="w-4 h-4 animate-spin text-orange-600 shrink-0" />
              <span>Đang nhận diện địa chỉ từ bản đồ OpenStreetMap...</span>
            </div>
          )}

          {addressNotice && !isFetchingAddress && (
            <div
              className={`mb-4 p-2.5 rounded-xl border flex items-center gap-2 text-xs animate-in fade-in duration-200 ${
                addressNotice.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-amber-50 border-amber-200 text-amber-800"
              }`}
            >
              {addressNotice.type === "success" ? (
                <Wand2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>{addressNotice.text}</span>
            </div>
          )}

          {/* Coordinates numerical inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Kinh độ (Longitude) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                {...register("longitude", { valueAsNumber: true })}
                className={`w-full pl-3.5 pr-4 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-mono ${
                  errors.longitude
                    ? "border-red-400 focus:border-red-500 bg-red-50/20"
                    : "border-slate-200 focus:border-orange-500"
                }`}
              />
              {errors.longitude && (
                <p className="mt-1 text-xs text-red-500 font-medium">
                  {errors.longitude.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Vĩ độ (Latitude) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                {...register("latitude", { valueAsNumber: true })}
                className={`w-full pl-3.5 pr-4 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-mono ${
                  errors.latitude
                    ? "border-red-400 focus:border-red-500 bg-red-50/20"
                    : "border-slate-200 focus:border-orange-500"
                }`}
              />
              {errors.latitude && (
                <p className="mt-1 text-xs text-red-500 font-medium">
                  {errors.latitude.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Địa chỉ kinh doanh chi tiết (Tự động điền + cho phép chỉnh sửa) */}
        <div>
          <div className="flex items-center justify-between pb-2 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                3. Thông Tin Địa Chỉ Chi Tiết
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Có thể tự do chỉnh sửa các trường
            </span>
          </div>

          <div className="space-y-4">
            {/* Street Line 1 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Địa chỉ chi tiết (Số nhà, tên đường) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ví dụ: 123 Nguyễn Huệ, Tòa nhà ABC"
                {...register("line1")}
                className={`w-full pl-3.5 pr-4 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 outline-none transition-all ${
                  errors.line1
                    ? "border-red-400 focus:border-red-500 bg-red-50/20"
                    : "border-slate-200 focus:border-orange-500"
                }`}
              />
              {errors.line1 && (
                <p className="mt-1 text-xs text-red-500 font-medium">
                  {errors.line1.message}
                </p>
              )}
            </div>

            {/* Ward, District, City */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Phường / Xã <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Phường Bến Nghé"
                  {...register("ward")}
                  className={`w-full pl-3.5 pr-4 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 outline-none transition-all ${
                    errors.ward
                      ? "border-red-400 focus:border-red-500 bg-red-50/20"
                      : "border-slate-200 focus:border-orange-500"
                  }`}
                />
                {errors.ward && (
                  <p className="mt-1 text-xs text-red-500 font-medium">
                    {errors.ward.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Quận / Huyện <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Quận 1"
                  {...register("district")}
                  className={`w-full pl-3.5 pr-4 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 outline-none transition-all ${
                    errors.district
                      ? "border-red-400 focus:border-red-500 bg-red-50/20"
                      : "border-slate-200 focus:border-orange-500"
                  }`}
                />
                {errors.district && (
                  <p className="mt-1 text-xs text-red-500 font-medium">
                    {errors.district.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tỉnh / Thành phố <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Hồ Chí Minh"
                  {...register("city")}
                  className={`w-full pl-3.5 pr-4 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 outline-none transition-all ${
                    errors.city
                      ? "border-red-400 focus:border-red-500 bg-red-50/20"
                      : "border-slate-200 focus:border-orange-500"
                  }`}
                />
                {errors.city && (
                  <p className="mt-1 text-xs text-red-500 font-medium">
                    {errors.city.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-slate-400" />
            <span>Bằng việc gửi thông tin, bạn đồng ý với Điều khoản Đối tác của QuickBite.</span>
          </p>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/35 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang gửi hồ sơ...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Nộp Hồ Sơ Đăng Ký</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
