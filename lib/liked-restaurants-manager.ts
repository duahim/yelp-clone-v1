import { getUserLikedRestaurants } from "./user-interactions";
import { Restaurant, fetchRestaurants, restaurants } from "@/data/restaurantsFromCsv";
import { log } from './client-logger';

// Event system for like changes
const likeChangeListeners: (() => void)[] = [];

export function subscribeToLikeChanges(callback: () => void) {
  likeChangeListeners.push(callback);
  return () => {
    const index = likeChangeListeners.indexOf(callback);
    if (index > -1) likeChangeListeners.splice(index, 1);
  };
}

export function notifyLikeChanges() {
  likeChangeListeners.forEach(callback => callback());
}

// Get combined likes from both server and localStorage
export async function getCombinedLikedRestaurants(userId: string): Promise<Restaurant[]> {
  log(2, `Getting combined liked restaurants for user: ${userId}`);
  
  // First get localStorage likes
  const localLikedIds = getUserLikedRestaurants(userId);
  log(2, `Found ${localLikedIds.length} likes in localStorage`);
  
  // Then get server-side likes
  try {
    const response = await fetch(`/api/users/ratings?userId=${userId}`);
    const serverLikes = await response.json();
    const serverLikedIds = serverLikes.map((item: any) => item.business_id);
    log(2, `Found ${serverLikedIds.length} likes on server`);
    
    // Combine both sets (server takes precedence for rating values)
    const combinedIds = new Set([...serverLikedIds, ...localLikedIds]);
    log(2, `Combined unique IDs: ${combinedIds.size}`);
    
    // Create map of server ratings for lookup
    const ratingMap = new Map();
    serverLikes.forEach((item: any) => {
      ratingMap.set(item.business_id, item.user_rating);
    });
    
    // Import all restaurant data
    await fetchRestaurants();
    
    // Filter restaurants to match the combined IDs
    const likedRestaurants = restaurants
      .filter(restaurant => combinedIds.has(restaurant.id))
      .map(restaurant => ({
        ...restaurant,
        user_rating: ratingMap.get(restaurant.id) || 5 // Default to 5 for client-side likes
      }));
    
    log(2, `Returning ${likedRestaurants.length} combined liked restaurants`);
    return likedRestaurants;
  } catch (error) {
    log(3, `Error fetching server likes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('Error fetching server likes:', error);
    
    // If server request fails, fall back to just localStorage likes
    await fetchRestaurants();
    
    const likedRestaurants = restaurants
      .filter(restaurant => localLikedIds.includes(restaurant.id))
      .map(restaurant => ({
        ...restaurant,
        user_rating: 5 // Default rating for localStorage-only likes
      }));
    
    log(2, `Falling back to ${likedRestaurants.length} localStorage likes only`);
    return likedRestaurants;
  }
} 