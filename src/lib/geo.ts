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

interface PlaceTextResult {
  geometry?: { location?: LatLng };
  formatted_address?: string;
  name?: string;
  types?: string[];
}

async function textSearchRestaurant(query: string): Promise<{ location: LatLng; formattedAddress?: string } | null> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey || !query.trim()) return null;

  try {
    const params = new URLSearchParams({
      query,
      location: '39.6837,-75.7497',
      radius: '15000',
      key: apiKey,
    });
    const res = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`);
    if (!res.ok) return null;
    const data = await res.json() as { status?: string; results?: PlaceTextResult[] };
    if (data.status !== 'OK' || !data.results?.length) return null;

    const best = data.results.find(r =>
      r.types?.includes('restaurant') || r.types?.includes('food') || r.types?.includes('meal_takeaway')
    ) ?? data.results[0];

    const loc = best.geometry?.location;
    if (!loc) return null;
    return { location: loc, formattedAddress: best.formatted_address };
  } catch {
    return null;
  }
}

function isLikelyGenericAddress(address: string): boolean {
  const normalized = normalize(address);
  return (
    normalized === 'newark de 19711' ||
    normalized.endsWith('newark de 19711') && !/\d/.test(address)
  );
}

export async function resolveRestaurantLocation(name: string, address?: string): Promise<LatLng | null> {
  const known = lookupKnownRestaurantLocation(name);
  if (known) return known;

  const byPlaceSearch = await textSearchRestaurant(`${name}, Newark, DE`);
  if (byPlaceSearch) return byPlaceSearch.location;

  const addr = address?.trim();
  if (addr) {
    const byAddress = await geocodeAddress(addr);
    if (byAddress) return byAddress;
  }

  return geocodeAddress(`${name}, Newark, DE 19711`);
}

export async function resolveRestaurantDetails(name: string, address?: string): Promise<{ location: LatLng | null; formattedAddress?: string }> {
  const known = lookupKnownRestaurantLocation(name);
  if (known) return { location: known, formattedAddress: address };

  const byPlaceSearch = await textSearchRestaurant(`${name} restaurant, Newark, DE`);
  if (byPlaceSearch) {
    return { location: byPlaceSearch.location, formattedAddress: byPlaceSearch.formattedAddress || address };
  }

  const addr = address?.trim();
  if (addr && !isLikelyGenericAddress(addr)) {
    const byAddress = await geocodeAddress(addr);
    if (byAddress) return { location: byAddress, formattedAddress: addr };
  }

  return { location: null, formattedAddress: address };
}
