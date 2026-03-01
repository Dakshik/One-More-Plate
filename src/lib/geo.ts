import type { LatLng, Shelter } from '../types';
import { SEED_POSTS } from '../data/seed';

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

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function lookupKnownRestaurantLocation(name: string): LatLng | null {
  const query = normalize(name);
  if (!query) return null;

  const found = SEED_POSTS.find(post => {
    const candidate = normalize(post.restaurantName);
    return candidate.includes(query) || query.includes(candidate);
  });

  return found?.restaurantLocation ?? null;
}

export async function geocodeAddress(address: string): Promise<LatLng | null> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey || !address.trim()) return null;

  try {
    const params = new URLSearchParams({
      address,
      key: apiKey,
    });
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`);
    if (!res.ok) return null;
    const data = await res.json() as {
      status?: string;
      results?: Array<{ geometry: { location: LatLng } }>;
    };

    if (data.status !== 'OK' || !data.results?.[0]) return null;
    return data.results[0].geometry.location;
  } catch {
    return null;
  }
}

export async function resolveRestaurantLocation(name: string, address?: string): Promise<LatLng | null> {
  const known = lookupKnownRestaurantLocation(name);
  if (known) return known;

  const addr = address?.trim();
  if (addr) {
    const byAddress = await geocodeAddress(addr);
    if (byAddress) return byAddress;
  }

  return geocodeAddress(`${name}, Newark, DE 19711`);
}
