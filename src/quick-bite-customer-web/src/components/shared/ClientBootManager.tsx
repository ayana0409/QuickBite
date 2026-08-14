"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";

const BootScreen = dynamic(
  () => import("./BootScreen"),
  { ssr: false }
);

interface ClientBootManagerProps {
  children: React.ReactNode;
}

export default function ClientBootManager({ children }: ClientBootManagerProps) {
  const [isReady, setIsReady] = useState<boolean>(false);

  if (!isReady) {
    return <BootScreen onReady={() => setIsReady(true)} />;
  }

  return <>{children}</>;
}
