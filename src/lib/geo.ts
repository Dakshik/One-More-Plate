import type { LatLng, Shelter } from '../types';

const EARTH_RADIUS_MILES = 3958.8;

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function distanceMiles(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);

  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);

  const haversine =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;

  const c = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return EARTH_RADIUS_MILES * c;
}

export function getNearestShelter(origin: LatLng, shelters: Shelter[]): Shelter {
  if (shelters.length === 0) {
    throw new Error('No shelters available');
  }

  return shelters.reduce((closest, shelter) =>
    distanceMiles(origin, shelter.location) < distanceMiles(origin, closest.location)
      ? shelter
      : closest
  );
}
