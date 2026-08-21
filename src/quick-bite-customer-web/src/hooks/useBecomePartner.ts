"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useUiStore } from "@/src/store/ui.store";
import { getMyRestaurant } from "@/src/lib/api/catalog";

export function useBecomePartner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const openAuthModal = useUiStore((state) => state.openAuthModal);

  const handleBecomePartnerClick = async () => {
    // 1. If not authenticated, open login modal
    if (status === "unauthenticated" || !session?.user) {
      openAuthModal();
      return;
    }

    const merchantUrl =
      process.env.NEXT_PUBLIC_MERCHANT_URL || "https://quick-bite-merchant.onrender.com";

    // 2. Check if user already has MERCHANT role in session
    const userRoles = session.user.roles || (session.user.role ? [session.user.role] : []);
    const isMerchant = userRoles.some(
      (role) => typeof role === "string" && role.toLowerCase() === "merchant"
    );

    if (isMerchant) {
      if (merchantUrl.startsWith("http://") || merchantUrl.startsWith("https://")) {
        window.location.href = merchantUrl;
      } else {
        router.push(merchantUrl);
      }
      return;
    }

    // 3. Fallback check: Check if user owns a restaurant in Catalog Service
    if (session.accessToken) {
      try {
        const myRestaurant = await getMyRestaurant(session.accessToken);
        if (myRestaurant) {
          if (merchantUrl.startsWith("http://") || merchantUrl.startsWith("https://")) {
            window.location.href = merchantUrl;
          } else {
            router.push(merchantUrl);
          }
          return;
        }
      } catch (err) {
        // Proceed to registration page on error
      }
    }

    // 4. Otherwise navigate to Partner Registration page
    router.push("/partner-registration");
  };

  return {
    handleBecomePartnerClick,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
  };
}
