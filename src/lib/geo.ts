/** Office geofence helpers for WFO login */

export type OfficeConfig = {
  lat: number;
  lng: number;
  radiusM: number;
  name: string;
};

export function getOfficeConfig(): OfficeConfig {
  const lat = Number(process.env.OFFICE_LAT ?? 13.029861);
  const lng = Number(process.env.OFFICE_LNG ?? 77.589167);
  const radiusM = Number(process.env.OFFICE_RADIUS_M ?? 100);
  const name = process.env.OFFICE_NAME || 'Jaganatha Arcade, Hebbal, Bengaluru';

  return {
    lat: Number.isFinite(lat) ? lat : 13.029861,
    lng: Number.isFinite(lng) ? lng : 77.589167,
    radiusM: Number.isFinite(radiusM) && radiusM > 0 ? radiusM : 100,
    name,
  };
}

/** Great-circle distance in meters (Haversine). */
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
