"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ToastProvider } from "./ToastProvider";
import CartDrawer from "./CartDrawer";
import SystemStatusGuard from "./SystemStatusGuard";

interface ProvidersProps {
  children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <SessionProvider>
        <ToastProvider>
          <SystemStatusGuard>
            {children}
            <CartDrawer />
          </SystemStatusGuard>
        </ToastProvider>
      </SessionProvider>
    </GoogleOAuthProvider>
  );
}

