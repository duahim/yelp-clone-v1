"use client"

import { useState, useEffect } from "react"
import { Bookmark } from "lucide-react"
import { getUserSavedRestaurants } from "@/lib/user-interactions"
import { Restaurant, initializeRestaurants } from "@/data/restaurantsFromCsv"
import {
  getContentBasedRecommendations,
  getCollaborativeFilteringRecommendations,
  getMatrixFactorizationRecommendations,
  getSimilarUsers,
} from "@/lib/recommendation-models"
import { RestaurantListItem } from "@/components/restaurant-list-item"
import UserListItem from "@/components/user-list-item"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import RecommendationExplanation from "@/components/recommendation-explanation"
import RecommendationLogs from "@/components/recommendation-logs"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

type RecommendationAlgorithm = "content-based" | "collaborative" | "matrix";

export default function SavedPageClient({ initialRestaurants }: { initialRestaurants: Restaurant[] }) {
  // Initialize global restaurants data
  useEffect(() => {
    if (initialRestaurants && initialRestaurants.length > 0) {
      initializeRestaurants(initialRestaurants);
    }
  }, [initialRestaurants]);

  const [savedRestaurants, setSavedRestaurants] = useState<Restaurant[]>([])
  const [currentTab, setCurrentTab] = useState<RecommendationAlgorithm>("content-based")
  const [recommendations, setRecommendations] = useState<Restaurant[]>([])
  const [similarUsers, setSimilarUsers] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  // Check if user is logged in
  useEffect(() => {
    const userString = localStorage.getItem("currentUser")
    
    if (!userString) {
      toast({
        title: "Not logged in",
        description: "Please log in to see your saved restaurants",
        variant: "destructive",
      })
      router.push("/")
      return
    }
    
    try {
      const user = JSON.parse(userString)
      setCurrentUser(user)
      // For now, we'll use the same ratings data for saved restaurants
      // In a real app, you would have a separate API for saved restaurants
      fetchUserSavedRestaurants(user.user_id)
    } catch (error) {
      console.error("Error parsing user data:", error)
      toast({
        title: "Error",
        description: "There was an error loading your profile. Please log in again.",
        variant: "destructive",
      })
      router.push("/")
    }
  }, [router, toast])

  // Fetch user's saved business IDs and ratings from the API
  const fetchUserSavedRestaurants = async (userId: string) => {
    setIsLoading(true)
    try {
      // For this demo, we'll use the ratings API for saved restaurants as well
      // In a real app, this would be a separate API endpoint
      const response = await fetch(`/api/users/ratings?userId=${userId}`)
      const businessRatings = await response.json()
      
      // Create a map of business_id to user_rating for easy lookup
      const userRatingsMap = new Map();
      businessRatings.forEach((rating: { business_id: string, user_rating: number }) => {
        userRatingsMap.set(rating.business_id, rating.user_rating);
      });
      
      // Filter restaurants to only include saved businesses and attach user rating
      // For demo purposes, we'll just use every other restaurant from their ratings
      const saved = initialRestaurants
        .filter((restaurant, index) => 
          userRatingsMap.has(restaurant.id) && index % 2 === 0
        )
        .map(restaurant => ({
          ...restaurant,
          user_rating: userRatingsMap.get(restaurant.id)
        }));
      
      setSavedRestaurants(saved)
      updateRecommendations(saved, currentTab)
    } catch (error) {
      console.error("Error fetching saved restaurants:", error)
      toast({
        title: "Error",
        description: "Failed to load your saved restaurants. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateRecommendations = async (userRestaurants: Restaurant[], algorithm: RecommendationAlgorithm) => {
    setIsLoading(true);
    try {
      // Get recommendations based on selected algorithm
      let recs = [];
      switch (algorithm) {
        case "content-based":
          recs = await getContentBasedRecommendations(userRestaurants, initialRestaurants);
          break;
        case "collaborative":
          recs = getCollaborativeFilteringRecommendations(userRestaurants, initialRestaurants);
          break;
        case "matrix":
          recs = getMatrixFactorizationRecommendations(userRestaurants, initialRestaurants);
          break;
        default:
          recs = await getContentBasedRecommendations(userRestaurants, initialRestaurants);
      }
      setRecommendations(recs);

      // Get similar users based on selected algorithm
      const users = getSimilarUsers(userRestaurants, algorithm);
      setSimilarUsers(users);
    } catch (error) {
      console.error("Error updating recommendations:", error);
      toast({
        title: "Error",
        description: "Failed to update recommendations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setCurrentTab(value as RecommendationAlgorithm);
    updateRecommendations(savedRestaurants, value as RecommendationAlgorithm);
  };

  return (
    <main className="flex-1">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-4 flex items-center">
          <Bookmark className="mr-2 h-6 w-6 text-blue-500" />
          {currentUser ? `${currentUser.name}'s Saved Restaurants` : "Restaurants You've Saved"}
        </h1>

        <Tabs defaultValue="content-based" onValueChange={handleTabChange} className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content-based">Content-Based</TabsTrigger>
            <TabsTrigger value="collaborative">Collaborative Filtering</TabsTrigger>
            <TabsTrigger value="matrix">Matrix Factorization</TabsTrigger>
          </TabsList>
        </Tabs>

        <RecommendationExplanation algorithm={currentTab} />
        
        <RecommendationLogs algorithm={currentTab} />

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Saved Restaurants */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50 border-b">
              <h2 className="font-semibold text-lg">Your Saved Restaurants</h2>
            </div>
            <div className="divide-y">
              {isLoading ? (
                <div className="p-6 text-center text-gray-500">
                  <p>Loading your saved restaurants...</p>
                </div>
              ) : savedRestaurants.length > 0 ? (
                savedRestaurants.map((restaurant) => (
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
                  <Bookmark className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <p>You haven't saved any restaurants yet.</p>
                  <p className="text-sm mt-2">
                    When you find a restaurant you want to try later, click the bookmark icon to save it.
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
            </div>
            <div className="divide-y">
              {isLoading ? (
                <div className="p-6 text-center text-gray-500">
                  <p>Loading recommendations...</p>
                </div>
              ) : recommendations.length > 0 ? (
                recommendations.map((restaurant) => (
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
                  <p>Save more restaurants to get personalized recommendations.</p>
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
                      : "Save more restaurants to find users with similar tastes."}
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
    default:
      return "your preferences"
  }
} 