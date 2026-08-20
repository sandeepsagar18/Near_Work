// Client-Side Road Route & Directions Utility

export interface CalculatedRoute {
  distanceKm: number;
  durationMinutes: number;
  polyline: [number, number][];
}

/**
 * Fetch actual road driving route between worker and customer coordinates.
 * Priority: Google Routes API (if VITE_GOOGLE_MAPS_API_KEY is available) -> OSRM Road Engine -> Great-Circle interpolation.
 */
export const fetchDrivingRoute = async (
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  googleApiKey?: string
): Promise<CalculatedRoute> => {
  // 1. Check Google Maps API Key
  const apiKey = googleApiKey || (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
  if (apiKey && apiKey !== 'mock_key' && !apiKey.includes('YOUR_')) {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&mode=driving&key=${apiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'OK' && data.routes && data.routes.length > 0) {
          const leg = data.routes[0].legs[0];
          const distanceKm = Math.round((leg.distance.value / 1000) * 10) / 10;
          const durationMinutes = Math.max(1, Math.round(leg.duration.value / 60));
          const polyline = decodePolyline(data.routes[0].overview_polyline.points);

          return { distanceKm, durationMinutes, polyline };
        }
      }
    } catch (e) {
      console.warn('Google Directions fallback to OSRM:', e);
    }
  }

  // 2. High-speed OSRM Real Road Engine
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;
    const res = await fetch(osrmUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const r = data.routes[0];
        const distanceKm = Math.round((r.distance / 1000) * 10) / 10;
        const durationMinutes = Math.max(1, Math.round(r.duration / 60));
        const polyline: [number, number][] = r.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );

        return { distanceKm, durationMinutes, polyline };
      }
    }
  } catch (e) {
    console.warn('OSRM Route fallback:', e);
  }

  // 3. Mathematical Fallback
  const R = 6371;
  const dLat = ((destLat - originLat) * Math.PI) / 180;
  const dLon = ((destLng - originLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((originLat * Math.PI) / 180) *
      Math.cos((destLat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = Math.round(R * c * 10) / 10;

  return {
    distanceKm: dist,
    durationMinutes: Math.max(1, Math.round((dist / 30) * 60)),
    polyline: [
      [originLat, originLng],
      [destLat, destLng]
    ]
  };
};

function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0,
    len = encoded.length;
  let lat = 0,
    lng = 0;

  while (index < len) {
    let b,
      shift = 0,
      result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}
