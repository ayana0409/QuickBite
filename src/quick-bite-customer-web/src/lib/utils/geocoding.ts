/**
 * Reverse Geocoding Utility for QuickBite
 * Uses Next.js internal Server Route Proxy with client-side BigDataCloud CDN fallback
 * to completely eliminate ERR_NAME_NOT_RESOLVED and 403 Forbidden issues.
 */

export interface ReverseGeocodeResult {
  line1?: string;
  ward?: string;
  district?: string;
  city?: string;
  displayName?: string;
}

/**
 * Fetches Vietnamese address details from given latitude and longitude coordinates
 */
export async function fetchAddressFromCoordinates(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult | null> {
  // 1. Try internal Next.js Server-side Proxy
  try {
    const proxyUrl = `/api/geocoding/reverse?lat=${lat}&lng=${lng}`;
    const response = await fetch(proxyUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });

    if (response.ok) {
      const json = await response.json();
      if (json?.success && json?.data) {
        return json.data as ReverseGeocodeResult;
      }
    }
  } catch (proxyError) {
    console.warn("[Geocoding] Internal proxy failed, attempting BigDataCloud direct fallback:", proxyError);
  }

  // 2. Direct Client-side Fallback via BigDataCloud (CORS enabled, Global CDN, not blocked by VN ISPs)
  try {
    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=vi`;
    const response = await fetch(bdcUrl, {
      signal: AbortSignal.timeout(4000),
    });

    if (response.ok) {
      const data = await response.json();
      const city = data.principalSubdivision || "";
      const locality = data.locality || "";
      const localityInfo = data.localityInfo?.administrative || [];

      let district = "";
      let ward = "";
      if (Array.isArray(localityInfo)) {
        const districtObj = localityInfo.find((item: any) => item.adminLevel === 6 || item.order === 4);
        if (districtObj) district = districtObj.name || "";

        const wardObj = localityInfo.find((item: any) => item.adminLevel === 8 || item.order === 5);
        if (wardObj) ward = wardObj.name || "";
      }

      if (!district && locality && locality !== city) {
        district = locality;
      }

      const rawLine1 = (data.localityInfo?.informative?.[0]?.name || locality || "").trim();
      const line1 = rawLine1 === city || rawLine1 === district || rawLine1 === ward ? "" : rawLine1;

      const parts = [line1, ward, district, city].filter(Boolean);
      const displayName = parts.join(", ") || data.city || "";

      return {
        line1: line1.trim(),
        ward: ward.trim(),
        district: district.trim(),
        city: city.trim(),
        displayName,
      };
    }
  } catch (bdcError) {
    console.warn("[Geocoding] BigDataCloud fallback failed:", bdcError);
  }

  return null;
}
