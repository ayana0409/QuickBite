// Next.js Server Lifecycle Hook
// Executed exactly once when the Node.js server starts up in container or standalone mode.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dynamically import to ensure server-side execution only
    const { startSingleFlightWarmup } = await import("@/src/lib/server-warmup");
    startSingleFlightWarmup();
  }
}
