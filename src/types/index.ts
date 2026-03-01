export type FoodCondition = 'hot' | 'warm' | 'room' | 'cold';
export type VehicleType = 'walking' | 'bicycle' | 'car';
export type RunStatus = 'pending' | 'accepted' | 'en_route_pickup' | 'picked_up' | 'delivered';
export type UserRole = 'restaurant' | 'volunteer' | 'both';
export type NeedLevel = 'high' | 'medium' | 'low';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Shelter {
  id: string;
  name: string;
  address: string;
  location: LatLng;
  needLevel: NeedLevel;
  acceptingNow: boolean;
  distanceMiles: number;
  emoji: string;
}

export interface Volunteer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  vehicle: VehicleType;
  maxDistanceMiles: number;
  availability: string[];
  location: LatLng;
  totalRuns: number;
  totalMeals: number;
}

export interface FoodPost {
  id: string;
  restaurantName: string;
  restaurantLocation: LatLng;
  restaurantAddress: string;
  foodDescription: string;
  portions: number;
  pickupBy: string;
  condition: FoodCondition;
  postedAt: Date;
  claimed: boolean;
  claimedBy?: string;
  geminiSummary?: GeminiPostAnalysis;
}

export interface GeminiPostAnalysis {
  structuredDescription: string;
  estimatedKg: number;
  estimatedCo2Saved: number;
  urgencyLevel: 'low' | 'medium' | 'high';
  dispatchMessage: string;
  whatsappMessage?: string;
  tags: string[];
  distributionRecommendation: string;
}

export interface DeliveryRun {
  id: string;
  post: FoodPost;
  volunteer: Volunteer;
  shelter: Shelter;
  status: RunStatus;
  acceptedAt: Date;
  estimatedPickupTime: Date;
  estimatedDeliveryTime: Date;
  photoConfirmed: boolean;
  distanceToRestaurant: number;
  distanceToShelter: number;
}

export interface UserAccount {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  vehicle?: VehicleType;
  joinedAt: Date;
  totalRuns: number;
  totalMealsRescued: number;
  totalKgSaved: number;
  badges: Badge[];
  preferredShelterIds: string[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  earned: boolean;
  earnedAt?: Date;
}

export interface CommunityStats {
  mealsThisWeek: number;
  kgSaved: number;
  co2Avoided: number;
  activeRestaurants: number;
}
