"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "./ToastProvider";
import CartDrawer from "./CartDrawer";

interface ProvidersProps {
  children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ToastProvider>
        {children}
        <CartDrawer />
      </ToastProvider>
    </SessionProvider>
  );
}
