import { NextResponse } from "next/server";
import { getBackendWarmupState, ensureWarmupProgress } from "@/src/lib/server-warmup";

export const dynamic = "force-dynamic";

/**
 * Returns the current backend warmup status directly from Server memory.
 * Does NOT generate new requests to Render backend, guaranteeing zero network hammering.
 */
export async function GET() {
  // Ensure warmup is progressing or retries failed services in background
  ensureWarmupProgress();

  const state = getBackendWarmupState();
  return NextResponse.json({
    isInitiated: state.isInitiated,
    isAllHealthy: state.isAllHealthy,
    services: state.services,
  });
}
