// This file contains different recommendation model implementations
import { Restaurant, fetchRestaurants } from "@/data/restaurantsFromCsv";
import { logStore } from "./recommendation-logs-store";

// Define Rating type
export interface Rating {
  user_id: string;
  restaurant_id: string;
  rating: number;
}

// Store recommendation process logs for displaying in the UI
export interface RecommendationLogs {
  contentBased: string[];
  collaborative: string[];
  matrix: string[];
  hybrid: string[];
  kmeans: string[];
}

// Initialize and export the recommendation logs
export const recommendationLogs: RecommendationLogs = {
  contentBased: [],
  collaborative: ['Process logs not available for collaborative filtering'],
  matrix: ['Process logs not available for matrix factorization'],
  hybrid: ['Process logs not available for hybrid recommendations'],
  kmeans: ['Process logs not available for k-means clustering']
};

// Initialize restaurants data
let restaurants: Restaurant[] = [];
fetchRestaurants().then((data: Restaurant[]) => {
  restaurants = data;
});

// Convert algorithm names from hyphenated format to camelCase
function getAlgorithmKey(algorithm: string): 'contentBased' | 'collaborative' | 'matrix' | 'hybrid' | 'kmeans' {
  switch(algorithm) {
    case 'content-based':
      return 'contentBased';
    case 'collaborative':
      return 'collaborative';
    case 'matrix':
      return 'matrix';
    case 'hybrid':
      return 'hybrid';
    case 'kmeans':
      return 'kmeans';
    default:
      return 'contentBased';
  }
}

// Content-Based Filtering
// Recommends items similar to what the user has liked/saved based on item attributes
export async function getContentBasedRecommendations(userRestaurants: Restaurant[], allRestaurants: Restaurant[]) {
  // Initialize with explicit debug logs
  const debugLogs = [
    'Starting content-based recommendation process',
    'Debug: This function will try to fetch recommendations from the API'
  ];
  
  try {
    // Always set initial logs for debugging
    recommendationLogs.contentBased = debugLogs;
    // Use addLog instead of setLogs to avoid overwriting previous logs
    debugLogs.forEach(log => {
      logStore.addLog('contentBased', log);
    });
    
    if (!userRestaurants || userRestaurants.length === 0) {
      // Update logs in both storage mechanisms
      const noRestaurantsLog = 'No restaurants to base recommendations on';
      
      try {
        recommendationLogs.contentBased.push(noRestaurantsLog);
      } catch (error) {
        console.error("Error updating recommendationLogs:", error);
      }
      
      // Also update the logStore
      logStore.addLog('contentBased', noRestaurantsLog);
      
      return [];
    }

    // Extract business IDs from user's restaurants
    const businessIds = userRestaurants.map(r => r.id);
    
    // Get current user ID if available
    let userId = "";
    try {
      const userString = localStorage.getItem("currentUser");
      if (userString) {
        const user = JSON.parse(userString);
        userId = user.user_id;
      }
    } catch (error) {
      console.warn("Error getting current user:", error);
    }
    
    // Call the server API to get content-based recommendations
    console.log(`Calling content-based API with ${businessIds.length} business IDs for user ${userId || 'unknown'}`);
    
    // Add request information to logs
    logStore.addLog('contentBased', `Restaurants: ${businessIds.length} found`);
    logStore.addLog('contentBased', 'Sending request to recommendation API...');
    
    // Update global logs variable (can be removed later if not needed)
    recommendationLogs.contentBased.push(`Restaurants: ${businessIds.length} found`);
    recommendationLogs.contentBased.push('Sending request to recommendation API...');

    // Make the API request
    const response = await fetch(`/api/recommendations/content-based?businessIds=${businessIds.join(',')}&userId=${userId}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("API response:", data);
    
    const recommendations = data.recommendations || [];
    
    // Store the logs from the API
    if (data.logs && Array.isArray(data.logs)) {
      // Add API response logs
      logStore.addLog('contentBased', 'API response received successfully');
      
      // Add each log from the API
      data.logs.forEach((log: string) => {
        logStore.addLog('contentBased', log);
      });
      
      console.log("Added logs from API");
      
      // Verify logs were set
      console.log("LogStore contents:", logStore.getLogs('contentBased'));
    } else {
      // Add fallback logs
      logStore.addLog('contentBased', 'API did not return any logs');
      logStore.addLog('contentBased', `Retrieved ${recommendations.length} recommendations`);
    }
    
    console.log(`Received ${recommendations.length} recommendations from API`);
    
    // Filter out restaurants that the user already has
    const userRestaurantIds = new Set(userRestaurants.map(r => r.id));
    const filteredRecommendations = recommendations.filter((r: any) => !userRestaurantIds.has(r.id));
    
    // Return at most 5 recommendations
    return filteredRecommendations.slice(0, 5);
  } catch (error) {
    console.error("Error fetching content-based recommendations:", error);
    
    // Add error logs
    logStore.addLog('contentBased', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    logStore.addLog('contentBased', 'Falling back to simplified content-based recommendations');
    
    console.log("Falling back to simplified content-based recommendations");
    
    // Fallback to the simplified implementation if the API fails
    return getSimplifiedContentBasedRecommendations(userRestaurants, allRestaurants);
  }
}

// Simplified Content-Based Filtering (fallback)
// Used when the API call fails
function getSimplifiedContentBasedRecommendations(userRestaurants: Restaurant[], allRestaurants: Restaurant[]) {
  // Create "item profiles" for user's restaurants
  const userRestaurantProfiles = buildSimplifiedItemProfiles(userRestaurants);
  
  // Calculate profiles for all restaurants
  const allRestaurantProfiles = buildSimplifiedItemProfiles(allRestaurants);
  
  // Get IDs of user's restaurants to exclude them from recommendations
  const userRestaurantIds = new Set(userRestaurants.map(r => r.id));
  
  // For each of user's restaurants, find similar ones
  const similarityScores = new Map<string, number>();
  
  // Calculate similarity between user's restaurants and all other restaurants
  userRestaurants.forEach(userRestaurant => {
    const userProfile = userRestaurantProfiles.get(userRestaurant.id);
    
    allRestaurants.forEach(candidate => {
      // Skip restaurants user already has
      if (userRestaurantIds.has(candidate.id)) {
        return;
      }
      
      const candidateProfile = allRestaurantProfiles.get(candidate.id);
      if (!userProfile || !candidateProfile) return;
      
      // Calculate cosine similarity between profiles
      const similarity = calculateCosineSimilarity(userProfile, candidateProfile);
      
      // Aggregate similarity scores
      const currentScore = similarityScores.get(candidate.id) || 0;
      similarityScores.set(candidate.id, currentScore + similarity);
    });
  });
  
  // Convert to array, sort by similarity score
  const recommendations = Array.from(similarityScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => allRestaurants.find(r => r.id === id))
    .filter(Boolean) as Restaurant[];
  
  return recommendations;
}

// Build simplified item profiles based on category vectors and rating
function buildSimplifiedItemProfiles(restaurants: Restaurant[]): Map<string, number[]> {
  // Extract all unique categories
  const allCategories = new Set<string>();
  restaurants.forEach(restaurant => {
    if (Array.isArray(restaurant.categories)) {
      restaurant.categories.forEach(category => {
        allCategories.add(category);
      });
    }
  });
  
  const categoryList = Array.from(allCategories);
  const profiles = new Map<string, number[]>();
  
  // Build profile for each restaurant
  restaurants.forEach(restaurant => {
    // Create a vector where each position represents a category
    const categoryVector = categoryList.map(category => 
      Array.isArray(restaurant.categories) && restaurant.categories.includes(category) ? 1 : 0
    );
    
    // Add rating and review_count as additional features
    const profile = [
      restaurant.rating / 5.0,  // Normalize rating to 0-1
      Math.min(1.0, restaurant.review_count / 1000)  // Normalize review count with upper limit
    ];
    
    // Add category vector
    profiles.set(restaurant.id, [...profile, ...categoryVector]);
  });
  
  return profiles;
}

// Calculate cosine similarity between two vectors
function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  // Prevent division by zero
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Collaborative Filtering
// Recommends items that similar users have liked/saved
export function getCollaborativeFilteringRecommendations(userRestaurants: Restaurant[], allRestaurants: Restaurant[]) {
  if (!userRestaurants || userRestaurants.length === 0) {
    return [];
  }

  // In a real implementation, we would:
  // 1. Build a user-item matrix from all user interactions
  // 2. Find users with similar patterns to our target user
  // 3. Recommend items those similar users liked but our user hasn't seen
  
  // For this simplified implementation:
  // - Use restaurant categories as a proxy for user preferences
  // - Find restaurants with similar category patterns that the user hasn't seen
  
  const userRestaurantIds = new Set(userRestaurants.map(r => r.id));
  
  // Get the distribution of categories the user likes
  const userCategoryCounts = new Map<string, number>();
  userRestaurants.forEach(restaurant => {
    restaurant.categories.forEach(category => {
      const count = userCategoryCounts.get(category) || 0;
      userCategoryCounts.set(category, count + 1);
    });
  });
  
  // Calculate a score for each candidate restaurant based on how well
  // it matches the user's category preferences
  const scoredRestaurants = allRestaurants
    .filter(restaurant => !userRestaurantIds.has(restaurant.id))
    .map(restaurant => {
      let score = 0;
      
      // Add score for each matching category, weighted by how much the user likes that category
      restaurant.categories.forEach(category => {
        score += userCategoryCounts.get(category) || 0;
      });
      
      // Adjust by restaurant quality
      score *= (restaurant.rating / 5.0);
      
      return { restaurant, score };
    });
  
  // Sort by score and return top 5
  return scoredRestaurants
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => item.restaurant);
}

// Matrix Factorization
// Recommends items based on latent factors derived from user-item interactions
export function getMatrixFactorizationRecommendations(userRestaurants: Restaurant[], allRestaurants: Restaurant[]) {
  if (!userRestaurants || userRestaurants.length === 0) {
    return [];
  }

  // In a real implementation, we would:
  // 1. Build a user-item matrix
  // 2. Apply SVD or similar decomposition to find latent factors
  // 3. Use these factors to predict ratings for unseen items
  
  // For this simplified client-side implementation:
  // - Use a combination of category matching, price point, and popularity
  // - Weight these features differently than the other algorithms
  
  const userRestaurantIds = new Set(userRestaurants.map(r => r.id));
  const userPricePoints = new Set(userRestaurants.map(r => r.price));
  
  // Extract category preferences
  const categoryScores = new Map<string, number>();
  userRestaurants.forEach(restaurant => {
    restaurant.categories.forEach(category => {
      const score = categoryScores.get(category) || 0;
      categoryScores.set(category, score + 1);
    });
  });
  
  // Calculate a combined score for each restaurant
  const scoredRestaurants = allRestaurants
    .filter(restaurant => !userRestaurantIds.has(restaurant.id))
    .map(restaurant => {
      // Factor 1: Category matching
      const categoryMatch = restaurant.categories.reduce(
        (sum, category) => sum + (categoryScores.get(category) || 0),
        0
      );
      
      // Factor 2: Price point matching
      const priceMatch = userPricePoints.has(restaurant.price) ? 1 : 0;
      
      // Factor 3: Popularity and quality
      const popularityScore = (restaurant.rating / 5.0) * Math.log(restaurant.review_count + 1) / 10;
      
      // Combine factors with weights
      const score = (categoryMatch * 0.5) + (priceMatch * 0.3) + (popularityScore * 0.2);
      
      return { restaurant, score };
    });
  
  // Sort by score and return top 5
  return scoredRestaurants
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => item.restaurant);
}

// Get similar users based on different algorithms
export function getSimilarUsers(userRestaurants: Restaurant[], algorithm: string) {
  if (!userRestaurants || userRestaurants.length === 0) {
    return [];
  }

  // Extract categories from user's restaurants
  const userCategories = new Set<string>();
  userRestaurants.forEach(restaurant => {
    restaurant.categories.forEach(category => {
      userCategories.add(category);
    });
  });
  
  const userCategoriesArray = Array.from(userCategories);

  // For content-based, we don't show similar users
  if (algorithm === "content-based") {
    return [];
  }

  // Generate some realistic fake users based on the categories the user likes
  const generateUser = (id: string, namePrefix: string, index: number) => {
    // Select some categories that overlap with user's categories
    const userCategoryCount = userCategoriesArray.length;
    const commonCategories = userCategoriesArray
      .slice(Math.min(index, userCategoryCount - 1), Math.min(index + 2, userCategoryCount))
      .filter(Boolean);
    
    return {
      id,
      name: `${namePrefix} ${String.fromCharCode(65 + index % 26)}`,
      image_url: "/placeholder.svg?height=100&width=100",
      review_count: 30 + Math.floor(Math.random() * 200),
      common_categories: commonCategories.length > 0 ? commonCategories : ["Restaurants"],
    };
  };

  // For collaborative filtering, show users with similar tastes
  if (algorithm === "collaborative") {
    return Array.from({ length: 4 }, (_, i) => 
      generateUser(`cf_${i}`, "User", i)
    );
  }

  // For matrix factorization, show different users with more diverse interests
  if (algorithm === "matrix") {
    return Array.from({ length: 5 }, (_, i) => 
      generateUser(`mf_${i}`, "Foodie", i)
    );
  }

  return [];
}

export class ContentBasedRecommender {
  private restaurants: Restaurant[];
  private userRatings: Rating[] = [];

  constructor() {
    this.restaurants = restaurants;
  }

  // ... existing code ...
}

export class CollaborativeRecommender {
  private restaurants: Restaurant[];
  private userRatings: Rating[] = [];

  constructor() {
    this.restaurants = restaurants;
  }

  // ... existing code ...
}

export class MatrixRecommender {
  private restaurants: Restaurant[];
  private userRatings: Rating[] = [];

  constructor() {
    this.restaurants = restaurants;
  }

  // ... existing code ...
}

// Hybrid Recommendations
export async function getHybridRecommendations(userRestaurants: Restaurant[], allRestaurants: Restaurant[]) {
  try {
    // Get current user ID if available
    let userId = "";
    try {
      const userString = localStorage.getItem("currentUser");
      if (userString) {
        const user = JSON.parse(userString);
        userId = user.user_id;
      }
    } catch (error) {
      console.warn("Error getting current user:", error);
    }

    // Call the server API to get hybrid recommendations
    const response = await fetch(`/api/recommendations/hybrid?userId=${userId}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    const recommendations = data.recommendations || [];
    
    // Store the logs from the API
    if (data.logs && Array.isArray(data.logs)) {
      data.logs.forEach((log: string) => {
        logStore.addLog('hybrid', log);
      });
    }
    
    // Filter out restaurants that the user already has
    const userRestaurantIds = new Set(userRestaurants.map(r => r.id));
    const filteredRecommendations = recommendations.filter((r: any) => !userRestaurantIds.has(r.id));
    
    return filteredRecommendations.slice(0, 5);
  } catch (error) {
    console.error("Error fetching hybrid recommendations:", error);
    logStore.addLog('hybrid', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return [];
  }
}

// K-Means Clustering Recommendations
export async function getKMeansRecommendations(userRestaurants: Restaurant[], allRestaurants: Restaurant[]) {
  try {
    // Get current user ID if available
    let userId = "";
    try {
      const userString = localStorage.getItem("currentUser");
      if (userString) {
        const user = JSON.parse(userString);
        userId = user.user_id;
      }
    } catch (error) {
      console.warn("Error getting current user:", error);
    }

    // Call the server API to get k-means recommendations
    const response = await fetch(`/api/recommendations/kmeans?userId=${userId}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    const recommendations = data.recommendations || [];
    
    // Store the logs from the API
    if (data.logs && Array.isArray(data.logs)) {
      data.logs.forEach((log: string) => {
        logStore.addLog('kmeans', log);
      });
    }
    
    // Filter out restaurants that the user already has
    const userRestaurantIds = new Set(userRestaurants.map(r => r.id));
    const filteredRecommendations = recommendations.filter((r: any) => !userRestaurantIds.has(r.id));
    
    return filteredRecommendations.slice(0, 5);
  } catch (error) {
    console.error("Error fetching k-means recommendations:", error);
    logStore.addLog('kmeans', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return [];
  }
}

