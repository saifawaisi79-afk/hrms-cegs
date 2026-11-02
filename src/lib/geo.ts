/** Office geofence helpers for WFO login */

export type OfficeConfig = {
  lat: number;
  lng: number;
  radiusM: number;
  name: string;
};

export const HEBBAL_OFFICE: OfficeConfig = {
  lat: 13.029861,
  lng: 77.589167,
  radiusM: 150,
  name: 'Jaganatha Arcade, Hebbal, Bengaluru',
};

export function getOfficeConfig(): OfficeConfig {
  const envName = (process.env.OFFICE_NAME || '').toLowerCase();
  const envLat = Number(process.env.OFFICE_LAT);
  const envLng = Number(process.env.OFFICE_LNG);
  const envRadius = Number(process.env.OFFICE_RADIUS_M);

  // If environment variable is still set to old Koramangala office or unparseable, force new Hebbal office
  const isOldKoramangala =
    envName.includes('novel') ||
    envName.includes('koramangala') ||
    (Number.isFinite(envLat) && Math.abs(envLat - 12.951361) < 0.01) ||
    !Number.isFinite(envLat) ||
    !Number.isFinite(envLng);

  if (isOldKoramangala) {
    return HEBBAL_OFFICE;
  }

  return {
    lat: envLat,
    lng: envLng,
    radiusM: Number.isFinite(envRadius) && envRadius > 0 ? envRadius : HEBBAL_OFFICE.radiusM,
    name: process.env.OFFICE_NAME || HEBBAL_OFFICE.name,
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
