import type { Shelter, FoodPost, DeliveryRun, Volunteer, CommunityStats, UserAccount } from '../types';

export const NEWARK_CENTER = { lat: 39.6837, lng: -75.7497 };

export const SHELTERS: Shelter[] = [
  {
    id: 's1',
    name: 'Food Bank of Delaware',
    address: '222 Lake Dr, Newark, DE 19702',
    location: { lat: 39.6712, lng: -75.7234 },
    needLevel: 'high',
    acceptingNow: true,
    distanceMiles: 8.2,
    emoji: '🏠',
  },
  {
    id: 's2',
    name: 'Sunday Breakfast Mission',
    address: '110 N Poplar St, Wilmington, DE 19801',
    location: { lat: 39.7459, lng: -75.5466 },
    needLevel: 'high',
    acceptingNow: true,
    distanceMiles: 10.1,
    emoji: '🍽️',
  },
  {
    id: 's3',
    name: 'Newark Senior Center',
    address: '200 White Chapel Rd, Newark, DE 19713',
    location: { lat: 39.6901, lng: -75.7312 },
    needLevel: 'medium',
    acceptingNow: true,
    distanceMiles: 0.8,
    emoji: '👴',
  },
  {
    id: 's4',
    name: 'UD Student Food Pantry',
    address: '163 W Main St, Newark, DE 19716',
    location: { lat: 39.6844, lng: -75.7513 },
    needLevel: 'medium',
    acceptingNow: true,
    distanceMiles: 0.3,
    emoji: '🎓',
  },
];

export const SEED_POSTS: FoodPost[] = [
  {
    id: 'p1',
    restaurantName: 'Caffe Gelato',
    restaurantAddress: '85 E Main St, Newark, DE 19711',
    restaurantLocation: { lat: 39.6836, lng: -75.7487 },
    foodDescription: 'Soup, focaccia & four desserts',
    portions: 12,
    pickupBy: '10:30pm',
    condition: 'warm',
    postedAt: new Date(Date.now() - 12 * 60000),
    claimed: false,
  },
  {
    id: 'p2',
    restaurantName: 'Grain on the Main',
    restaurantAddress: '280 E Main St, Newark, DE 19711',
    restaurantLocation: { lat: 39.6831, lng: -75.7441 },
    foodDescription: 'Grain bowls, roasted vegetables & hummus',
    portions: 22,
    pickupBy: '10:00pm',
    condition: 'hot',
    postedAt: new Date(Date.now() - 48 * 60000),
    claimed: true,
    claimedBy: 'Dakshi',
  },
  {
    id: 'p3',
    restaurantName: 'The Deer Park Tavern',
    restaurantAddress: '108 W Main St, Newark, DE 19711',
    restaurantLocation: { lat: 39.6842, lng: -75.7521 },
    foodDescription: 'Burgers, fries & coleslaw',
    portions: 8,
    pickupBy: '11:30pm',
    condition: 'hot',
    postedAt: new Date(Date.now() - 2 * 60000),
    claimed: false,
  },
];

export const MOCK_VOLUNTEER: Volunteer = {
  id: 'v1',
  firstName: 'Dakshi',
  lastName: 'Kaushik',
  phone: '3027470804',
  vehicle: 'car',
  maxDistanceMiles: 5,
  availability: ['Weekends', 'Late nights'],
  location: { lat: 39.6855, lng: -75.751 },
  totalRuns: 7,
  totalMeals: 52,
};

export const REGISTERED_VOLUNTEERS = [
  { id: 'rv1', firstName: 'Dakshi', lastName: 'Kaushik', phone: '3027470804', distanceMiles: 0.4 },
  { id: 'rv2', firstName: 'Sarah', lastName: 'Kim', phone: '3025550191', distanceMiles: 0.7 },
  { id: 'rv3', firstName: 'Miguel', lastName: 'Reyes', phone: '3025550108', distanceMiles: 0.9 },
];

export const MOCK_ACTIVE_RUN: DeliveryRun = {
  id: 'r1',
  post: SEED_POSTS[0],
  volunteer: MOCK_VOLUNTEER,
  shelter: SHELTERS[0],
  status: 'en_route_pickup',
  acceptedAt: new Date(Date.now() - 8 * 60000),
  estimatedPickupTime: new Date(Date.now() + 5 * 60000),
  estimatedDeliveryTime: new Date(Date.now() + 25 * 60000),
  photoConfirmed: false,
  distanceToRestaurant: 0.4,
  distanceToShelter: 1.7,
};

export const MOCK_USER: UserAccount = {
  id: 'u1',
  firstName: 'Dakshi',
  lastName: 'Kaushik',
  role: 'volunteer',
  vehicle: 'car',
  joinedAt: new Date('2026-02-01'),
  totalRuns: 7,
  totalMealsRescued: 52,
  totalKgSaved: 13,
  preferredShelterIds: ['s1', 's3', 's4'],
  badges: [
    { id: 'b1', name: 'First Run', description: 'Completed your first delivery', emoji: '🌱', earned: true, earnedAt: new Date('2026-02-03') },
    { id: 'b2', name: '3-Run Streak', description: '3 deliveries in a week', emoji: '🔥', earned: true, earnedAt: new Date('2026-02-10') },
    { id: 'b3', name: 'Night Owl', description: '5 late-night pickups', emoji: '🏅', earned: true, earnedAt: new Date('2026-02-18') },
    { id: 'b4', name: '10 Runs', description: 'Complete 10 deliveries', emoji: '🚀', earned: false },
    { id: 'b5', name: '100 Meals', description: 'Rescue 100 meals total', emoji: '💚', earned: false },
    { id: 'b6', name: 'Top Driver', description: 'Most runs this month', emoji: '🌟', earned: false },
  ],
};

export const COMMUNITY_STATS: CommunityStats = {
  mealsThisWeek: 47,
  kgSaved: 94,
  co2Avoided: 188,
  activeRestaurants: 6,
};
