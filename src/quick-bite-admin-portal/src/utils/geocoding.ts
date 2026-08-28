/**
 * Reverse Geocoding Utility for QuickBite Admin / Merchant Portal
 * Uses OpenStreetMap Nominatim with client-side BigDataCloud CDN fallback
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
  // 1. Try Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=vi`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(3000),
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
        '';

      const district =
        address.county ||
        address.city_district ||
        address.district ||
        address.town ||
        '';

      const ward =
        address.suburb ||
        address.quarter ||
        address.village ||
        address.neighbourhood ||
        address.hamlet ||
        address.ward ||
        '';

      const houseNumber = address.house_number || '';
      const road =
        address.road ||
        address.street ||
        address.pedestrian ||
        address.highway ||
        '';

      let line1 = [houseNumber, road].filter(Boolean).join(' ');
      if (!line1 && data.name && data.name !== city && data.name !== district && data.name !== ward) {
        line1 = data.name;
      }

      return {
        line1: line1.trim(),
        ward: ward.trim(),
        district: district.trim(),
        city: city.trim(),
        displayName: data.display_name,
      };
    }
  } catch (error) {
    console.warn('[Nominatim] Nominatim lookup failed, using BigDataCloud fallback:', error);
  }

  // 2. Direct Fallback: BigDataCloud Reverse Geocoding API
  try {
    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=vi`;
    const response = await fetch(bdcUrl, {
      signal: AbortSignal.timeout(4000),
    });

    if (response.ok) {
      const data = await response.json();
      const city = data.principalSubdivision || '';
      const locality = data.locality || '';
      const localityInfo = data.localityInfo?.administrative || [];

      let district = '';
      let ward = '';
      if (Array.isArray(localityInfo)) {
        const districtObj = localityInfo.find((item: any) => item.adminLevel === 6 || item.order === 4);
        if (districtObj) district = districtObj.name || '';

        const wardObj = localityInfo.find((item: any) => item.adminLevel === 8 || item.order === 5);
        if (wardObj) ward = wardObj.name || '';
      }

      if (!district && locality && locality !== city) {
        district = locality;
      }

      const rawLine1 = (data.localityInfo?.informative?.[0]?.name || locality || '').trim();
      const line1 = rawLine1 === city || rawLine1 === district || rawLine1 === ward ? '' : rawLine1;

      const parts = [line1, ward, district, city].filter(Boolean);
      const displayName = parts.join(', ') || data.city || '';

      return {
        line1: line1.trim(),
        ward: ward.trim(),
        district: district.trim(),
        city: city.trim(),
        displayName,
      };
    }
  } catch (bdcError) {
    console.warn('[Geocoding] BigDataCloud fallback failed:', bdcError);
  }

  return null;
}
