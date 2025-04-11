// This file handles storing user interactions with restaurants
import { notifyLikeChanges } from './liked-restaurants-manager';

// Interface for the current user
export interface User {
  user_id: string;
  name: string;
  average_stars?: number;
  yelping_since?: string;
}

type UserInteraction = {
  userId: string
  restaurantId: string
  action: "view" | "like" | "unlike" | "save" | "unsave"
  timestamp: string
}

// In a real app, this would be stored in a database
const userInteractions: UserInteraction[] = []

// Check if a user is logged in
export function isUserLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userString = localStorage.getItem('currentUser');
  return userString !== null;
}

// Get the current logged in user
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  
  const userString = localStorage.getItem('currentUser');
  if (!userString) return null;
  
  try {
    return JSON.parse(userString) as User;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
}

// Set the current user (login)
export function setCurrentUser(user: User): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('currentUser', JSON.stringify(user));
}

// Log out the current user
export function logoutUser(): void {
  if (typeof window === 'undefined') return;
  
  // Get the user ID before removing from local storage
  const user = getCurrentUser();
  const userId = user?.user_id;
  
  // Remove from localStorage
  localStorage.removeItem('currentUser');
  
  // Clear the recommendation cache for this user
  if (userId) {
    fetch('/api/users/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    })
    .then(response => response.json())
    .then(data => {
      console.log('Logout successful, cache cleared:', data.cacheCleared);
    })
    .catch(error => {
      console.error('Error clearing recommendation cache:', error);
    });
  }
}

export function saveUserInteraction(interaction: UserInteraction): void {
  userInteractions.push(interaction)

  // Save to localStorage for persistence
  if (typeof window !== "undefined") {
    const existingData = localStorage.getItem("userInteractions")
    const interactions = existingData ? JSON.parse(existingData) : []
    interactions.push(interaction)
    localStorage.setItem("userInteractions", JSON.stringify(interactions))
  }

  console.log("User interaction saved:", interaction)
}

export function getUserInteractions(userId: string): UserInteraction[] {
  // In a real app, this would query a database
  return userInteractions.filter((interaction) => interaction.userId === userId)
}

export function getUserLikedRestaurants(userId: string): string[] {
  // In a real app, this would query a database

  // Try to get data from localStorage
  if (typeof window !== "undefined") {
    const existingData = localStorage.getItem("userInteractions")
    if (existingData) {
      const interactions = JSON.parse(existingData)

      // Create a map to track the latest action for each restaurant
      const latestActions = new Map<string, string>()

      // Process interactions in chronological order
      interactions
        .filter((interaction: UserInteraction) => interaction.userId === userId)
        .forEach((interaction: UserInteraction) => {
          latestActions.set(interaction.restaurantId, interaction.action)
        })

      // Filter restaurants that are currently liked
      return Array.from(latestActions.entries())
        .filter(([_, action]) => action === "like")
        .map(([restaurantId, _]) => restaurantId)
    }
  }

  return userInteractions
    .filter((interaction) => interaction.userId === userId)
    .reduce<string[]>((acc, interaction) => {
      if (interaction.action === "like") {
        return [...acc, interaction.restaurantId]
      } else if (interaction.action === "unlike") {
        return acc.filter((id) => id !== interaction.restaurantId)
      }
      return acc
    }, [])
}

export function getUserSavedRestaurants(userId: string): string[] {
  // In a real app, this would query a database

  // Try to get data from localStorage
  if (typeof window !== "undefined") {
    const existingData = localStorage.getItem("userInteractions")
    if (existingData) {
      const interactions = JSON.parse(existingData)

      // Create a map to track the latest action for each restaurant
      const latestActions = new Map<string, string>()

      // Process interactions in chronological order
      interactions
        .filter((interaction: UserInteraction) => interaction.userId === userId)
        .forEach((interaction: UserInteraction) => {
          latestActions.set(interaction.restaurantId, interaction.action)
        })

      // Filter restaurants that are currently saved
      return Array.from(latestActions.entries())
        .filter(([_, action]) => action === "save")
        .map(([restaurantId, _]) => restaurantId)
    }
  }

  return userInteractions
    .filter((interaction) => interaction.userId === userId)
    .reduce<string[]>((acc, interaction) => {
      if (interaction.action === "save") {
        return [...acc, interaction.restaurantId]
      } else if (interaction.action === "unsave") {
        return acc.filter((id) => id !== interaction.restaurantId)
      }
      return acc
    }, [])
}

// Functions for direct localStorage interaction (simpler alternative to interaction system)
export function toggleLikedRestaurant(userId: string, restaurantId: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const likedRestaurants = getUserLikedRestaurants(userId);
  const isLiked = likedRestaurants.includes(restaurantId);
  
  // Create a new interaction
  const interaction: UserInteraction = {
    userId,
    restaurantId,
    action: isLiked ? "unlike" : "like",
    timestamp: new Date().toISOString(),
  };
  
  // Save the interaction
  saveUserInteraction(interaction);
  
  // Notify subscribers that likes have changed
  notifyLikeChanges();
  
  return !isLiked; // Return the new state
}

export function toggleSavedRestaurant(userId: string, restaurantId: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const savedRestaurants = getUserSavedRestaurants(userId);
  const isSaved = savedRestaurants.includes(restaurantId);
  
  // Create a new interaction
  const interaction: UserInteraction = {
    userId,
    restaurantId,
    action: isSaved ? "unsave" : "save",
    timestamp: new Date().toISOString(),
  };
  
  // Save the interaction
  saveUserInteraction(interaction);
  
  return !isSaved; // Return the new state
}

