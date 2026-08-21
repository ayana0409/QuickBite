/**
 * OpenStreetMap Reverse Geocoding Utility (Nominatim) for QuickBite Admin / Merchant Portal
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
 * using OpenStreetMap Nominatim Reverse Geocoding API
 */
export async function fetchAddressFromCoordinates(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=vi`;

    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'vi',
        'User-Agent': 'QuickBite-AdminPortal/1.0',
      },
    });

    if (!response.ok) {
      console.warn(`[Nominatim] Request failed with HTTP status ${response.status}`);
      return null;
    }

    const data = await response.json();
    const address = data?.address || {};

    // 1. Resolve City / Province
    const city =
      address.city ||
      address.province ||
      address.state ||
      address.municipality ||
      address.region ||
      '';

    // 2. Resolve District / County / Town
    const district =
      address.county ||
      address.city_district ||
      address.district ||
      address.town ||
      '';

    // 3. Resolve Ward / Commune / Suburb / Village
    const ward =
      address.suburb ||
      address.quarter ||
      address.village ||
      address.neighbourhood ||
      address.hamlet ||
      address.ward ||
      '';

    // 4. Resolve detailed street address (House number + Road)
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
  } catch (error) {
    console.warn('[Nominatim] Error parsing reverse geocode:', error);
    return null;
  }
}
