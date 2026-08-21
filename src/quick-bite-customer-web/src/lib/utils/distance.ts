/**
 * Utility functions for calculating geographic distances and delivery estimates
 */

/**
 * Calculates great-circle distance between two coordinates in kilometers using Haversine formula
 */
export function calculateDistanceKm(
  lat1?: number | string | null,
  lon1?: number | string | null,
  lat2?: number | string | null,
  lon2?: number | string | null
): number | null {
  if (
    lat1 === undefined ||
    lat1 === null ||
    lon1 === undefined ||
    lon1 === null ||
    lat2 === undefined ||
    lat2 === null ||
    lon2 === undefined ||
    lon2 === null
  ) {
    return null;
  }

  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);

  if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) {
    return null;
  }

  const R = 6371; // Radius of the Earth in km
  const dLat = ((nLat2 - nLat1) * Math.PI) / 180;
  const dLon = ((nLon2 - nLon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((nLat1 * Math.PI) / 180) *
      Math.cos((nLat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

/**
 * Estimates delivery duration in minutes based on distance (base preparation + transit)
 */
export function estimateDeliveryMinutes(distanceKm: number | null): number {
  if (!distanceKm || distanceKm <= 0) return 20;
  // ~15 mins preparation + ~3 mins per km
  return Math.max(15, Math.round(15 + distanceKm * 3));
}

/**
 * Formats distance for display
 */
export function formatDistance(distanceKm: number | null): string {
  if (distanceKm === null || distanceKm === undefined) return 'Chưa xác định';
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Calculates delivery fee based on distance:
 * - Minimum 15,000đ for distance <= 5 km
 * - For distance > 5 km: 15,000đ + 3,000đ for each additional km (rounded up)
 * - Defaults to standard 15,000đ if distance is unknown
 */
export function calculateDeliveryFee(distanceKm: number | null): number {
  const BASE_FEE = 15000;
  const BASE_KM = 5;
  const PER_KM_FEE = 3000;

  if (distanceKm === null || distanceKm === undefined || isNaN(distanceKm) || distanceKm <= BASE_KM) {
    return BASE_FEE;
  }

  const extraKm = Math.ceil(distanceKm - BASE_KM);
  return BASE_FEE + extraKm * PER_KM_FEE;
}
