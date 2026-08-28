import { NextRequest, NextResponse } from "next/server";

export interface ReverseGeocodeResponse {
  line1: string;
  ward: string;
  district: string;
  city: string;
  displayName: string;
}

/**
 * Server-side Reverse Geocoding Route Handler
 * Bypasses client-side DNS blocking and forbidden User-Agent header restrictions.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");

  if (!latStr || !lngStr) {
    return NextResponse.json(
      { error: "Latitude and longitude query parameters are required" },
      { status: 400 }
    );
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: "Invalid latitude or longitude numbers" },
      { status: 400 }
    );
  }

  // 1. Try Nominatim (Server-side with custom User-Agent and timeout)
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=vi`;
    const response = await fetch(nominatimUrl, {
      headers: {
        "Accept-Language": "vi",
        "User-Agent": "QuickBite-Platform/1.0 (contact@quickbite.vn)",
      },
      next: { revalidate: 86400 }, // Cache geocode responses for 24h
      signal: AbortSignal.timeout(3500),
    });

    if (response.ok) {
      const data = await response.json();
      const address = data?.address || {};

      const city =
        address.city ||
        address.province ||
        address.state ||
        address.municipality ||
        address.region ||
        "";

      const district =
        address.county ||
        address.city_district ||
        address.district ||
        address.town ||
        "";

      const ward =
        address.suburb ||
        address.quarter ||
        address.village ||
        address.neighbourhood ||
        address.hamlet ||
        address.ward ||
        "";

      const houseNumber = address.house_number || "";
      const road =
        address.road ||
        address.street ||
        address.pedestrian ||
        address.highway ||
        "";

      let line1 = [houseNumber, road].filter(Boolean).join(" ");
      if (!line1 && data.name && data.name !== city && data.name !== district && data.name !== ward) {
        line1 = data.name;
      }

      return NextResponse.json({
        success: true,
        data: {
          line1: line1.trim(),
          ward: ward.trim(),
          district: district.trim(),
          city: city.trim(),
          displayName: data.display_name || "",
        },
      });
    }
  } catch (err) {
    console.warn("[Geocoding Route] Nominatim failed or timed out, switching to BigDataCloud fallback:", err);
  }

  // 2. Fallback: BigDataCloud Reverse Geocoding API
  try {
    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=vi`;
    const response = await fetch(bdcUrl, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(3500),
    });

    if (response.ok) {
      const bdcData = await response.json();
      const city = bdcData.principalSubdivision || "";
      const locality = bdcData.locality || "";
      const localityInfo = bdcData.localityInfo?.administrative || [];

      // Extract district and ward from administrative hierarchy
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

      const line1 = (bdcData.localityInfo?.informative?.[0]?.name || locality || "").trim();

      const parts = [line1, ward, district, city].filter(Boolean);
      const displayName = parts.join(", ") || bdcData.city || "";

      return NextResponse.json({
        success: true,
        data: {
          line1: line1 === city || line1 === district || line1 === ward ? "" : line1,
          ward: ward.trim(),
          district: district.trim(),
          city: city.trim(),
          displayName,
        },
      });
    }
  } catch (fallbackErr) {
    console.error("[Geocoding Route] BigDataCloud fallback also failed:", fallbackErr);
  }

  return NextResponse.json(
    { success: false, error: "Unable to resolve coordinates to address" },
    { status: 502 }
  );
}
