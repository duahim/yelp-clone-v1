"use client"

import React, { useState, useEffect, useRef } from "react"
import { Heart } from "lucide-react"
import { getUserLikedRestaurants } from "../lib/user-interactions"
import { getCombinedLikedRestaurants, subscribeToLikeChanges } from "../lib/liked-restaurants-manager"
import { Restaurant, fetchRestaurants, restaurants } from "../data/restaurantsFromCsv"
import { log } from '../lib/client-logger'
import { type Rating } from "../lib/server/recommendation"
import { getSimilarUsers } from "../lib/recommendation-models"
import { RestaurantListItem } from "../components/restaurant-list-item"
import UserListItem from "../components/user-list-item"
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs"
import RecommendationExplanation from "../components/recommendation-explanation"
import { useToast } from "../components/ui/use-toast"
import { useRouter } from "next/navigation"
import { logStore } from "../lib/recommendation-logs-store"
import { RECOMMENDATION_CONFIG } from "@/config/recommendations"

type RecommendationAlgorithm = "content-based" | "collaborative" | "matrix" | "hybrid" | "kmeans";

// Extended interface that includes necessary server-side properties
interface RestaurantWithRating extends Restaurant {
  user_rating?: number;
  // Add business_id for compatibility with server-side data structures
  business_id?: string;
}

// Extended interface for API recommendation results
interface RecommendationResult extends Restaurant {
  business_id?: string;
}

export default function LikedPageClient() {
  // Initialize global restaurants data
  useEffect(() => {
    fetchRestaurants();
  }, []);

  const [likedRestaurants, setLikedRestaurants] = useState<Restaurant[]>([])
  const [currentTab, setCurrentTab] = useState<RecommendationAlgorithm>('content-based')
  const [recommendations, setRecommendations] = useState<Restaurant[]>([])
  const [similarUsers, setSimilarUsers] = useState<any[]>([])
  const [logs, setLogs] = useState<Array<{ timestamp: string; message: string; type: 'info' | 'error' }>>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [generatedAlgorithms, setGeneratedAlgorithms] = useState<Set<string>>(new Set())
  const { toast } = useToast()
  const router = useRouter()
  
  // Previous user ID ref to track changes without causing re-renders
  const prevUserIdRef = useRef<string | null>(null);
  
  // Track previous number of liked items to detect threshold crossings
  const prevLikedCountRef = useRef<number>(0);

  // Check if user is logged in
  useEffect(() => {
    const userString = localStorage.getItem("currentUser")
    
    if (!userString) {
      log(1, "User not logged in, redirecting to login page.");
      toast({
        title: "Not logged in",
        description: "Please log in to see your liked restaurants",
        variant: "destructive",
      })
      router.push("/")
      return
    }
    
    try {
      const user = JSON.parse(userString)
      log(1, `Processing user login for ${user.name} (${user.user_id})`);
      
      // Reset generated algorithms when user changes
      const currentUserId = prevUserIdRef.current;
      if (currentUserId && currentUserId !== user.user_id) {
        log(1, `User changed from ${currentUserId} to ${user.user_id}, resetting state`);
        setGeneratedAlgorithms(new Set());
        logStore.resetForUserChange(user.user_id);
      }
      
      prevUserIdRef.current = user.user_id;
      setCurrentUser(user)
      
      // Determine if this is a login/first load (to force refresh cache)
      const userJustLoggedIn = !currentUserId || currentUserId !== user.user_id;
      fetchUserLikedRestaurants(user.user_id, userJustLoggedIn)
    } catch (error: any) {
      log(1, "Error parsing user data: " + error.message);
      toast({
        title: "Error",
        description: "There was an error loading your profile. Please log in again.",
        variant: "destructive",
      })
      router.push("/")
    }
  }, [router, toast])

  // Store recommendations for each algorithm
  const [recommendationsCache, setRecommendationsCache] = useState<Record<RecommendationAlgorithm, Restaurant[]>>({
    'content-based': [],
    'collaborative': [],
    'matrix': [],
    'hybrid': [],
    'kmeans': []
  });

  // Store similar users for each algorithm
  const [similarUsersCache, setSimilarUsersCache] = useState<Record<RecommendationAlgorithm, any[]>>({
    'content-based': [],
    'collaborative': [],
    'matrix': [],
    'hybrid': [],
    'kmeans': []
  });

  // Subscribe to like changes
  useEffect(() => {
    if (currentUser) {
      log(2, `Setting up like change subscription for user ${currentUser.user_id}`);
      
      // Update the ref with current count
      prevLikedCountRef.current = likedRestaurants.length;
      
      // Subscribe to like changes
      const unsubscribe = subscribeToLikeChanges(() => {
        log(2, "Like change detected, refreshing liked restaurants");
        
        // Store current count to check for threshold crossing
        const prevCount = prevLikedCountRef.current;
        
        // Update with combined likes
        fetchUserLikedRestaurants(currentUser.user_id, false)
          .then(() => {
            // Check if we've crossed important thresholds that would affect recommendations
            const currentCount = likedRestaurants.length;
            log(2, `Liked restaurant count changed: ${prevCount} -> ${currentCount}`);
            
            // Update the ref for next time
            prevLikedCountRef.current = currentCount;
            
            // List of important thresholds for recommendation algorithms
            const thresholds = [3]; // Collaborative filtering needs 3+ items
            
            // Check if we crossed any thresholds
            const crossedThreshold = thresholds.some(threshold => 
              (prevCount < threshold && currentCount >= threshold) || 
              (prevCount >= threshold && currentCount < threshold)
            );
            
            if (crossedThreshold) {
              log(2, "Crossed important threshold, forcing recommendation refresh");
              
              // Clear the generated set to force refresh for all algorithms
              setGeneratedAlgorithms(new Set());
              
              // Clear the cache for algorithms affected by thresholds
              const newCache = { ...recommendationsCache };
              newCache['collaborative'] = []; // Clear collaborative which depends on 3+ items
              setRecommendationsCache(newCache);
              
              // Refresh current tab recommendations
              if (currentTab === 'collaborative' && currentCount >= 3) {
                log(2, "Refreshing collaborative recommendations after threshold crossing");
                updateRecommendationsForAlgorithm('collaborative', likedRestaurants, currentUser.user_id, true)
                  .then(results => {
                    if (results && results.length > 0) {
                      setRecommendations(results);
                    }
                  })
                  .catch(error => {
                    console.error("Error refreshing recommendations:", error);
                  });
              }
            }
          });
      });
      
      // Clean up on unmount or when user changes
      return () => {
        log(2, "Cleaning up like change subscription");
        unsubscribe();
      };
    }
  }, [currentUser, likedRestaurants.length, currentTab]);

  const fetchUserLikedRestaurants = async (userId: string, forceRefreshCache: boolean = false) => {
    setIsLoading(true)
    log(2, `Fetching liked restaurants for user ID: ${userId}${forceRefreshCache ? ' (forcing cache refresh)' : ''}`);
    try {
      // Use the combined source
      const liked = await getCombinedLikedRestaurants(userId);
      
      setLikedRestaurants(liked)
      log(2, `Fetched ${liked.length} liked restaurants for user ID: ${userId}`);
      
      // Set loading to false immediately after setting liked restaurants
      setIsLoading(false)
      
      if (liked.length > 0) {
        log(2, `Found ${liked.length} liked restaurants, fetching recommendations asynchronously`);
        
        // Fetch recommendations asynchronously after displaying liked restaurants
        try {
          const defaultAlgorithm: RecommendationAlgorithm = 'content-based';
          setCurrentTab(defaultAlgorithm);
          
          // First check if recommendations are already in the cache
          if (recommendationsCache[defaultAlgorithm]?.length > 0 && !forceRefreshCache) {
            log(2, `Using ${recommendationsCache[defaultAlgorithm].length} cached recommendations for ${defaultAlgorithm}`);
            setRecommendations(recommendationsCache[defaultAlgorithm]);
          } else {
            // Otherwise fetch fresh recommendations
            const recommendations = await updateRecommendationsForAlgorithm(defaultAlgorithm, liked, userId, forceRefreshCache);
            if (recommendations && recommendations.length > 0) {
              log(2, `Initial ${recommendations.length} recommendations loaded for ${defaultAlgorithm}`);
              setRecommendations(recommendations);
            }
          }
        } catch (error) {
          console.error("CONTENT-BASED RECOMMENDATION ERROR:", error);
          log(2, `Error loading initial recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        // Then pre-fetch all other algorithms in the background
        const otherAlgorithms: RecommendationAlgorithm[] = ['collaborative', 'matrix', 'hybrid', 'kmeans'];
        for (const algorithm of otherAlgorithms) {
          if (!recommendationsCache[algorithm] || recommendationsCache[algorithm].length === 0 || forceRefreshCache) {
            log(2, `Pre-fetching recommendations for ${algorithm} algorithm`);
            try {
              await updateRecommendationsForAlgorithm(algorithm, liked, userId, forceRefreshCache);
              log(2, `Successfully pre-fetched ${algorithm} recommendations`);
            } catch (error) {
              log(2, `Error pre-fetching ${algorithm} recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          } else {
            log(2, `Skipping pre-fetch for ${algorithm} algorithm, already have ${recommendationsCache[algorithm].length} cached items`);
          }
        }
      } else {
        log(2, "No liked restaurants found, skipping recommendation fetch");
      }
      
      return liked;
    } catch (error) {
      log(2, "Error fetching liked restaurants: " + (error as Error).message);
      toast({
        title: "Error",
        description: "Failed to load your liked restaurants. Please try again.",
        variant: "destructive",
      })
      setIsLoading(false)
      throw error;
    }
  }

  // Fetch recommendations for a specific algorithm
  const updateRecommendationsForAlgorithm = async (
    algorithm: RecommendationAlgorithm,
    userLiked: Restaurant[],
    userId: string,
    forceRefresh: boolean = false
  ) => {
    try {
      console.log(`BEGIN updateRecommendationsForAlgorithm for ${algorithm}`);
      
      if (!userId) {
        console.log("No user ID provided, returning early");
        return;
      }
      
      console.log(`RECOMMENDATION REQUEST - Algorithm: ${algorithm}, User: ${userId}, Liked Count: ${userLiked.length}, Force Refresh: ${forceRefresh}`);
      
      const userRatings = userLiked.map(restaurant => {
        // Cast restaurant to the interface that includes user_rating
        const restaurantWithRating = restaurant as RestaurantWithRating;
        return {
          user_id: userId,
          // Use business_id for backend consistency, but fall back to id if needed
          business_id: restaurant.id,
          // Use the actual user rating if available, or default to 5
          rating: restaurantWithRating.user_rating || 5
        };
      });

      log(3, `Fetching ${algorithm} recommendations for user ${userId} with ${userLiked.length} liked restaurants${forceRefresh ? ' (forced refresh)' : ''}`);
      log(3, `User ratings being sent: ${JSON.stringify(userRatings)}`);
      
      console.log(`Making API fetch request to /api/recommendations with algorithm=${algorithm}`);
      
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          algorithm,
          userRatings,
          forceRefresh
        }),
      });

      console.log(`API response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch ${algorithm} recommendations: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Log whether this was from cache or freshly calculated
      if (data.fromCache) {
        log(3, `Received ${algorithm} recommendations from cache: ${data.recommendations ? data.recommendations.length : 0} items`);
        console.log(`CACHE HIT: Received ${algorithm} recommendations from cache:`, data.recommendations);
      } else {
        log(3, `Received freshly calculated ${algorithm} recommendations: ${data.recommendations ? data.recommendations.length : 0} items`);
        console.log(`SUCCESS: Received fresh ${algorithm} recommendations:`, data.recommendations);
      }
      
      // Extra logging for kmeans
      if (algorithm === 'kmeans') {
        console.log(`KMEANS DEBUG - API Response:`, {
          responseData: data,
          explanation: data.explanation, 
          logs: data.logs
        });
      }
      
      console.log(`DETAILED DATA for ${algorithm}:`, {
        success: data.success,
        recommendationsLength: data.recommendations?.length || 0,
        hasExplanation: !!data.explanation,
        logsLength: data.logs?.length || 0,
        firstRecommendation: data.recommendations?.[0] ? {
          id: data.recommendations[0].id,
          business_id: data.recommendations[0].business_id,
          name: data.recommendations[0].name
        } : null
      });
      
      // Process recommendations to ensure they have id field
      const processedRecommendations = data.recommendations.map((rec: any) => {
        // Make sure we preserve all properties
        return {
          ...rec,
          // Ensure the id field is set for RestaurantListItem compatibility
          id: rec.id || rec.business_id
        };
      });
      
      // Important: Create a new copy of the cache rather than modifying the existing one
      // This prevents mutating state directly and causing unexpected behavior
      const newCache = { ...recommendationsCache };
      newCache[algorithm] = processedRecommendations || [];
      setRecommendationsCache(newCache);
      
      // Update similar users if available
      if (algorithm !== 'content-based') {
        const similarUsers = await fetch(`/api/similar-users?userId=${userId}&algorithm=${algorithm}`).then(r => r.json());
        const newSimilarUsersCache = { ...similarUsersCache };
        newSimilarUsersCache[algorithm] = similarUsers || [];
        setSimilarUsersCache(newSimilarUsersCache);
      }
      
      // Add algorithm to generated set
      setGeneratedAlgorithms(prev => new Set([...prev, algorithm]));
      
      // Store logs
      if (data.logs) {
        data.logs.forEach((logItem: string) => {
          log(4, `[${algorithm}] ${logItem}`);
        });
      }
      
      return processedRecommendations;
    } catch (error) {
      console.error(`Error updating ${algorithm} recommendations:`, error);
      log(3, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  // Update recommendations based on current tab
  const handleTabChange = (value: string) => {
    log(3, `Tab changed to: ${value}`);
    setCurrentTab(value as RecommendationAlgorithm);
    
    // Important: Wait for tab state to update before updating recommendations
    setTimeout(() => {
      const newTab = value as RecommendationAlgorithm;
      
      // Check if this algorithm has special threshold requirements
      const needsMoreLikedItems = 
        newTab === 'collaborative' && 
        likedRestaurants.length < 3;
      
      // First set recommendations from cache if available and requirements are met
      if (recommendationsCache[newTab]?.length > 0 && !needsMoreLikedItems) {
        log(3, `Setting ${recommendationsCache[newTab].length} cached recommendations for ${newTab}`);
        setRecommendations(recommendationsCache[newTab]);
        setSimilarUsers(similarUsersCache[newTab] || []);
        return; // Exit early if we have valid cached recommendations
      }
      
      // Clear recommendations while waiting for new ones
      setRecommendations([]);
      setSimilarUsers([]);
      
      // Only fetch new recommendations if we have liked restaurants and no valid cache
      if (likedRestaurants.length > 0 && currentUser) {
        updateRecommendationsForAlgorithm(newTab, likedRestaurants, currentUser.user_id, false)
          .then(results => {
            if (results && results.length > 0) {
              // Only update if we're still on the same tab
              if (currentTab === newTab) {
                log(3, `Setting ${results.length} fresh recommendations for ${newTab}`);
                setRecommendations(results);
              }
            }
          })
          .catch(error => {
            console.error(`Error updating recommendations for ${newTab}:`, error);
          });
      }
    }, 0);
  };

  // Debug logging effect
  useEffect(() => {
    console.log("RENDER - likedRestaurants:", JSON.stringify(likedRestaurants));
    console.log("RENDER - recommendationsCache:", JSON.stringify(recommendationsCache));
  }, [likedRestaurants, recommendationsCache]);

  return (
    <main className="flex-1">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-4 flex items-center">
          <Heart className="mr-2 h-6 w-6 text-red-500" />
          {currentUser ? `${currentUser.name}'s Liked Restaurants` : "Restaurants You've Liked"}
        </h1>

        <Tabs defaultValue="content-based" onValueChange={handleTabChange} className="mb-6">
          <TabsList className="flex flex-row w-full overflow-x-auto space-x-2">
            <TabsTrigger value="content-based" className="flex-1 min-w-max">Content-Based</TabsTrigger>
            <TabsTrigger value="collaborative" className="flex-1 min-w-max">Collaborative Filtering</TabsTrigger>
            <TabsTrigger value="matrix" className="flex-1 min-w-max">Matrix Factorization</TabsTrigger>
            <TabsTrigger value="hybrid" className="flex-1 min-w-max">Hybrid</TabsTrigger>
            <TabsTrigger value="kmeans" className="flex-1 min-w-max">K-Means</TabsTrigger>
          </TabsList>
        </Tabs>

        <RecommendationExplanation algorithm={currentTab} />
        
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Liked Restaurants */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50 border-b">
              <h2 className="font-semibold text-lg">Your Liked Restaurants</h2>
            </div>
            <div className="divide-y">
              {isLoading ? (
                <div className="p-6 text-center text-gray-500">
                  <p>Loading your liked restaurants...</p>
                </div>
              ) : likedRestaurants.length > 0 ? (
                likedRestaurants.map((restaurant) => (
                  <RestaurantListItem 
                    key={restaurant.id} 
                    restaurant={{
                      ...restaurant,
                      categories: Array.isArray(restaurant.categories) 
                        ? restaurant.categories 
                        : typeof restaurant.categories === 'string'
                          ? [restaurant.categories]
                          : []
                    }} 
                  />
                ))
              ) : (
                <div className="p-6 text-center text-gray-500">
                  <Heart className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <p>You haven't liked any restaurants yet.</p>
                  <p className="text-sm mt-2">
                    When you find a restaurant you love, click the heart icon to add it to your list.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Middle Column - Recommendations */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50 border-b">
              <h2 className="font-semibold text-lg">Recommendations</h2>
              <p className="text-sm text-gray-500">Based on {getAlgorithmDescription(currentTab)}</p>
              {/* Debug info - more comprehensive debug info to help diagnose issues */}
              <div className="text-xs text-gray-400 mt-1 p-2 border border-gray-200 bg-gray-50 rounded">
                <div><strong>Debug:</strong> {currentTab} recommendations</div>
                <div>Cache: {recommendationsCache[currentTab]?.length || 0} items</div>
                <div>Current: {recommendations.length} items</div> 
                <div>Generated: {Array.from(generatedAlgorithms).join(", ")}</div>
                <div>Liked: {likedRestaurants.length} restaurants</div>
              </div>
            </div>
            <div className="divide-y">
              {isLoading ? (
                <div className="p-6 text-center text-gray-500">
                  <p>Loading recommendations...</p>
                </div>
              ) : recommendations.length > 0 ? (
                recommendations.map((restaurant) => {
                  // Cast restaurant to extended interface with business_id
                  const restaurantWithBusinessId = restaurant as RecommendationResult;
                  
                  // Normalize categories to always be an array
                  let normalizedCategories: string[] = [];
                  
                  if (Array.isArray(restaurant.categories)) {
                    normalizedCategories = restaurant.categories;
                  } else if (typeof restaurant.categories === 'string') {
                    const categoryStr = restaurant.categories as string;
                    // Handle string that might be representation of array
                    if (categoryStr.startsWith('[') && categoryStr.endsWith(']')) {
                      try {
                        // Try parsing JSON with single quotes replaced by double quotes
                        normalizedCategories = JSON.parse(categoryStr.replace(/'/g, '"'));
                      } catch {
                        // If parsing fails, strip brackets and split by comma
                        const stripped = categoryStr.replace(/[\[\]']/g, '');
                        normalizedCategories = stripped.split(',').map((s: string) => s.trim());
                      }
                    } else {
                      // Simple string - treat as single category or split by comma
                      normalizedCategories = categoryStr.includes(',') 
                        ? categoryStr.split(',').map((s: string) => s.trim())
                        : [categoryStr];
                    }
                  }
                  
                  // Add debug log for restaurant with missing ID
                  if (!restaurant.id) {
                    console.error("Restaurant missing ID:", restaurant);
                    log(3, `Error: Restaurant missing ID: ${JSON.stringify(restaurant)}`);
                  }
                  
                  return (
                    <RestaurantListItem 
                      key={restaurant.id || restaurantWithBusinessId.business_id || Math.random().toString(36).substring(7)} 
                      restaurant={{
                        ...restaurant,
                        // Ensure id is set for consistent rendering - use non-null assertion to avoid type error
                        id: restaurant.id || restaurantWithBusinessId.business_id || `rec-${Math.random().toString(36).substring(7)}`,
                        categories: normalizedCategories
                      }} 
                    />
                  );
                })
              ) : (
                <div className="p-6 text-center text-gray-500">
                  {likedRestaurants.length === 0 ? (
                    <p>Like restaurants to get personalized recommendations.</p>
                  ) : generatedAlgorithms.has(currentTab) ? (
                    <div>
                      {currentTab === "collaborative" && likedRestaurants.length < 3 ? (
                        <div>
                          <p className="font-medium mb-2">Collaborative Filtering needs more data</p>
                          <p className="mb-2">You've liked {likedRestaurants.length} {likedRestaurants.length === 1 ? 'restaurant' : 'restaurants'}, but this algorithm works best with 3+ liked items.</p>
                          <p className="text-xs">Like more restaurants with diverse styles to see collaborative recommendations.</p>
                        </div>
                      ) : currentTab === "collaborative" ? (
                        <div>
                          <p className="font-medium mb-2">No collaborative recommendations found</p>
                          <p className="mb-2">We couldn't generate recommendations based on similar users' preferences.</p>
                          <p className="text-xs mt-2">
                            This could be because:
                          </p>
                          <ul className="text-xs list-disc list-inside mt-1">
                            <li>Not enough users have rated the same restaurants you liked</li>
                            <li>Your taste pattern is unique compared to other users</li>
                            <li>Try liking more diverse and popular restaurants</li>
                          </ul>
                        </div>
                      ) : currentTab === "kmeans" ? (
                        <div>
                          <p className="font-medium mb-2">K-Means Clustering Coming Soon</p>
                          <p className="mb-2">We're working on implementing K-Means clustering for better recommendations.</p>
                          <p className="text-xs mt-2">
                            In the meantime, try another recommendation algorithm:
                          </p>
                          <ul className="text-xs list-disc list-inside mt-1">
                            <li>Content-Based uses restaurant attributes</li>
                            <li>Collaborative uses similar user preferences</li>
                            <li>Matrix Factorization uses latent factors</li>
                            <li>Hybrid combines all approaches</li>
                          </ul>
                        </div>
                      ) : (
                        <div>
                          <p>No recommendations found for your liked items.</p>
                          <p className="text-xs mt-2">
                            Try liking more diverse restaurants or switch to another algorithm.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p>Loading recommendations for {likedRestaurants.length} liked items...</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Similar Users */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50 border-b">
              <h2 className="font-semibold text-lg">Similar Users</h2>
              <p className="text-sm text-gray-500">
                {currentTab === "content-based"
                  ? "Not applicable for content-based filtering"
                  : "People with similar tastes"}
              </p>
            </div>
            <div className="divide-y">
              {isLoading ? (
                <div className="p-6 text-center text-gray-500">
                  <p>Loading similar users...</p>
                </div>
              ) : similarUsers.length > 0 ? (
                similarUsers.map((user) => <UserListItem key={user.id} user={user} />)
              ) : (
                <div className="p-6 text-center text-gray-500">
                  <p>
                    {currentTab === "content-based"
                      ? "Content-based filtering focuses on item attributes rather than user similarities."
                      : "Like more restaurants to find users with similar tastes."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function getAlgorithmDescription(algorithm: string) {
  switch (algorithm) {
    case "content-based":
      return "restaurant attributes"
    case "collaborative":
      return "similar users"
    case "matrix":
      return "latent factors"
    case "hybrid":
      return "hybrid approach"
    case "kmeans":
      return "k-means clustering"
    default:
      return "your preferences"
  }
}