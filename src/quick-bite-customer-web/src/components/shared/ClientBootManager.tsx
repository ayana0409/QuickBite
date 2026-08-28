"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const BootScreen = dynamic(
  () => import("./BootScreen"),
  { ssr: false }
);

interface ClientBootManagerProps {
  children: React.ReactNode;
}

const STORAGE_KEY = "quickbite_system_ready";

export default function ClientBootManager({ children }: ClientBootManagerProps) {
  const [isReady, setIsReady] = useState<boolean>(true);
  const [hasMounted, setHasMounted] = useState<boolean>(false);

  useEffect(() => {
    setHasMounted(true);
    const isSystemReady = sessionStorage.getItem(STORAGE_KEY) === "true";
    setIsReady(isSystemReady);
  }, []);

  const handleReady = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Ignore storage errors if disabled/private mode
    }
    setIsReady(true);
  };

  if (!hasMounted) {
    return <>{children}</>;
  }

  if (!isReady) {
    return <BootScreen onReady={handleReady} />;
  }

  return <>{children}</>;
}
